import { sql } from "drizzle-orm";
import type { AuditDatabase } from "./audit";
import { AUDIT_TABLES, AUDIT_SAFE_FIELDS } from "./audit-policy";
export const auditSchemaSql = `
create table if not exists audit_events (
 id uuid primary key default gen_random_uuid(), occurred_at timestamptz(3) not null default clock_timestamp(),
 action text not null, category text not null, outcome text not null default 'success',
 actor jsonb not null, tenant_id text, tenant_name text, target_type text not null, target_id text, target_label text,
 changes jsonb not null default '[]', details jsonb not null default '{}', request_id uuid not null,
 source text not null, client_ip text, user_agent text, procedure text, legacy_id uuid
);
create index if not exists audit_time_idx on audit_events(occurred_at, id);
create index if not exists audit_hub_time_idx on audit_events(tenant_id, occurred_at, id);
create index if not exists audit_actor_time_idx on audit_events((actor->>'id'), occurred_at);
create index if not exists audit_action_time_idx on audit_events(action, occurred_at);
create index if not exists audit_target_idx on audit_events(target_type, target_id, occurred_at);
create unique index if not exists audit_legacy_idx on audit_events(legacy_id);
create or replace function epl_audit_record_change() returns trigger language plpgsql as $audit$
declare
 context jsonb; previous jsonb := '{}'; current_row jsonb := '{}'; record_row jsonb;
 delta jsonb := '[]'; field_name text; previous_value jsonb; current_value jsonb;
 hub_id text; hub_name text; hub_code text; verb text; record_label text;
begin
 context := nullif(current_setting('epl.audit_context', true), '')::jsonb;
 if context is null then return coalesce(new, old); end if;
 if TG_OP <> 'INSERT' then previous := to_jsonb(old); end if;
 if TG_OP <> 'DELETE' then current_row := to_jsonb(new); end if;
 record_row := case when TG_OP = 'DELETE' then previous else current_row end;
 for field_name in select jsonb_object_keys(previous || current_row) loop
   if field_name in ('id','created_at','updated_at') or field_name ~* '(password|token|secret|cookie|credential|backup|otp)' then continue; end if;
   previous_value := coalesce(previous->field_name, 'null'::jsonb);
   current_value := coalesce(current_row->field_name, 'null'::jsonb);
   if previous_value = current_value then continue; end if;
   if field_name = any(array[${AUDIT_SAFE_FIELDS.map((field) => "'" + field + "'").join(",")}])
      and jsonb_typeof(previous_value) not in ('object','array') and jsonb_typeof(current_value) not in ('object','array')
      and length(previous_value::text) <= 302 and length(current_value::text) <= 302 then
     delta := delta || jsonb_build_array(jsonb_build_object('field',field_name,'before',previous_value,'after',current_value));
   else delta := delta || jsonb_build_array(jsonb_build_object('field',field_name,'redacted',true)); end if;
 end loop;
 if TG_OP = 'UPDATE' and delta = '[]'::jsonb then return new; end if;
 hub_id := case when TG_TABLE_NAME = 'tenants' then record_row->>'id' else record_row->>'tenant_id' end;
 if TG_TABLE_NAME = 'tenants' then hub_name := record_row->>'name'; hub_code := record_row->>'country_code';
 else select name, country_code into hub_name, hub_code from tenants where id::text = hub_id; end if;
 if hub_code = 'GLOBAL' or coalesce((record_row->>'is_global')::boolean,false) then hub_id := null; end if;
 verb := case when TG_OP = 'INSERT' then 'created' when TG_OP = 'DELETE' then 'deleted'
   when current_row->>'status' = 'archived' and previous->>'status' is distinct from current_row->>'status' then 'archived'
   when previous->>'status' is distinct from current_row->>'status' then 'status_changed' else 'updated' end;
 record_label := coalesce(record_row->>'name',record_row->>'title',record_row->>'label',
    nullif(trim(concat(record_row->>'first_name',' ',record_row->>'last_name')),''),TG_ARGV[0]);
 insert into audit_events(action,category,actor,tenant_id,tenant_name,target_type,target_id,target_label,changes,details,request_id,source,client_ip,user_agent,procedure)
 values (TG_ARGV[0] || '.' || verb,'records',context->'actor',hub_id,left(hub_name,200),TG_ARGV[0],record_row->>'id',
   left(regexp_replace(record_label,'[[:cntrl:]]',' ','g'),200),delta,jsonb_build_object('scope',case when hub_code = 'GLOBAL' or (TG_TABLE_NAME = 'alumni_executives' and hub_id is null) then 'global' when hub_id is not null then 'country' else 'unavailable' end),(context->>'requestId')::uuid,
   context->>'source',context->>'clientIp',context->>'userAgent',context->>'procedure');
 return coalesce(new,old);
end $audit$;
` + Object.entries(AUDIT_TABLES).map(([table, resource]) => `
do $install$ begin
 if to_regclass('${table}') is not null then
   execute 'drop trigger if exists epl_audit_changes on ${table}';
   execute 'create trigger epl_audit_changes after insert or update or delete on ${table} for each row execute function epl_audit_record_change(''${resource}'')';
 end if;
end $install$;
`).join("\n");
export async function assertAuditSchema(database: AuditDatabase) {
  try {
    await database.execute(sql`select id, occurred_at, actor, changes, request_id, legacy_id from audit_events limit 0`);
    const result = await database.execute(sql`select tgrelid::regclass::text as name from pg_trigger where tgname = 'epl_audit_changes' and not tgisinternal and tgenabled <> 'D'`);
    const installed = new Set(Array.from(result as unknown as Array<{ name: string }>).map((r) => r.name));
    if (Object.keys(AUDIT_TABLES).some((name) => !installed.has(name))) throw new Error("Missing triggers");
  } catch { throw new Error("Audit schema is missing or incomplete. Run pnpm --filter @epl-fellows-platform/db db:setup-audit before starting the server."); }
}
