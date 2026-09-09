import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { transactionalDb as database, db, tenants, userTenants, user, hubPrograms, fellows, auditEvents, activityLog, hubCohorts, hubPartners, placements, checkIns } from "@epl-fellows-platform/db";
import { auditSchemaSql, assertAuditSchema } from "@epl-fellows-platform/db/audit-schema";
import { retainAudit } from "@epl-fellows-platform/db/audit-retention";
import { backfillAudit } from "@epl-fellows-platform/db/audit-legacy";
import { withAuditContext, auditedTransaction, auditSavepoint, writeAudit, requestAuditContext, auditFailure } from "@epl-fellows-platform/db/audit";
import { auditRouter } from "./routers/audit";
import { fellowsRouter } from "./routers/fellows";
import type { Context } from "./context";
import { mfaStatus } from "@epl-fellows-platform/auth/mfa-policy";
const url=process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("audit PostgreSQL integration",()=>{
  const hubA=randomUUID(),hubB=randomUUID(),prefix="audit-"+randomUUID(),ids:string[]=[];
  const roles=["super_admin","tenant_admin","country_admin","alumni_exec","fellow","viewer"] as const;
  const actors=new Map<string,string>();
  const context=()=>({...requestAuditContext({ip:"127.0.0.1",userAgent:"Audit browser",source:"web"}),actor:{kind:"user" as const,id:actors.get("super_admin")!,name:"Audit Admin",role:"super_admin"},procedure:"audit.test"});
  async function run<T>(action:()=>Promise<T>){return withAuditContext(context(),()=>auditedTransaction(database,action));}
  function callerContext(role:string,verified=true) {
    const now=new Date(),id=actors.get(role)!;
    return {role:role==="unassigned"?"viewer":role,tenantId:hubA,userTenant:null,audit:requestAuditContext(),
      mfa:mfaStatus({roles:role==="unassigned"?[]:[role],enabled:true,verificationMethod:verified?"authenticator":null,verifiedAt:verified?now:null}),
      session:{user:{id,name:"Audit "+role,email:prefix+role+"@example.test",emailVerified:true,twoFactorEnabled:true,createdAt:now,updatedAt:now},
        session:{id:randomUUID(),userId:id,token:"isolated-unused",createdAt:now,updatedAt:now,expiresAt:new Date(now.getTime()+60000)}}} as Context;
  }
  const caller = (role:string,verified=true) => auditRouter.createCaller(callerContext(role,verified));
  beforeAll(async()=>{
    const target=new URL(url!);
    if(!["localhost","127.0.0.1"].includes(target.hostname)||!["55432", "15432"].includes(target.port)||target.pathname!=="/epl_settings_test"||url!==process.env.DATABASE_URL)throw Error("Isolated audit database required");
    await database.execute(sql.raw(auditSchemaSql));
    await assertAuditSchema(database);
    await database.insert(tenants).values([{id:hubA,name:prefix+" A",slug:prefix+"-a"},{id:hubB,name:prefix+" B",slug:prefix+"-b"}]);
    for(const role of [...roles,"unassigned"]){
      const id=randomUUID();ids.push(id);actors.set(role,id);
      await database.insert(user).values({id,name:"Audit "+role,email:prefix+role+"@example.test",emailVerified:true});
      if(role!=="unassigned")await database.insert(userTenants).values({userId:id,tenantId:hubA,role});
    }
    await run(async()=>{
      await db.insert(hubPrograms).values([{tenantId:hubA,title:prefix+" Program A",slug:prefix+"-pa"},{tenantId:hubB,title:prefix+" Program B",slug:prefix+"-pb"}]);
      await writeAudit(database,{action:"auth.sign_in",targetType:"account",targetId:actors.get("super_admin")});
    });
  },30000);
  afterAll(async()=>{
    await database.delete(auditEvents).where(orFixture());
    await database.delete(activityLog).where(inArray(activityLog.tenantId,[hubA,hubB]));
    await database.delete(checkIns).where(inArray(checkIns.tenantId,[hubA,hubB]));
    await database.delete(placements).where(inArray(placements.tenantId,[hubA,hubB]));
    await database.delete(hubCohorts).where(inArray(hubCohorts.tenantId,[hubA,hubB]));
    await database.delete(hubPartners).where(inArray(hubPartners.tenantId,[hubA,hubB]));
    await database.delete(fellows).where(inArray(fellows.tenantId,[hubA,hubB]));
    await database.delete(hubPrograms).where(inArray(hubPrograms.tenantId,[hubA,hubB]));
    await database.delete(userTenants).where(inArray(userTenants.userId,ids));
    await database.delete(user).where(inArray(user.id,ids));
    await database.delete(tenants).where(inArray(tenants.id,[hubA,hubB]));
    await database.$client.end({timeout:2});
  });
  function orFixture(){return sql`${auditEvents.tenantId} in (${hubA},${hubB}) or ${auditEvents.actor}->>'id' in ${ids} or ${auditEvents.targetId} in ${ids} or ${auditEvents.targetLabel} like ${prefix+"%"}`;}
  it.each(roles)("enforces visibility for %s",async role=>{
    if(["tenant_admin","alumni_exec","fellow","viewer"].includes(role)){await expect(caller(role).list({limit:50})).rejects.toMatchObject({code:"FORBIDDEN"});return;}
    const result=await caller(role).list({limit:100});
    expect(result.items.some(e=>e.tenantId===hubA)).toBe(true);
    if(role!=="super_admin")expect(result.items.every(e=>e.tenantId===hubA&&["access","records"].includes(e.category))).toBe(true);
    else expect(result.items.some(e=>e.tenantId===hubB)).toBe(true);
  });
  it("denies unassigned and unverified sessions",async()=>{
    await expect(caller("unassigned").list({limit:50})).rejects.toMatchObject({code:"FORBIDDEN"});
    await expect(caller("super_admin",false).list({limit:50})).rejects.toMatchObject({code:"FORBIDDEN"});
  });
  it("scopes details and filter choices and rejects direct cross-hub requests",async()=>{
    const other=(await caller("super_admin").list({tenantId:hubB,limit:50})).items[0]!;
    await expect(caller("country_admin").get({id:other.id})).rejects.toMatchObject({code:"NOT_FOUND"});
    await expect(caller("country_admin").list({tenantId:hubB,limit:50})).rejects.toMatchObject({code:"FORBIDDEN"});
    const choices=await caller("country_admin").filters({});
    expect(choices.hubs.map(h=>h.id)).toEqual([hubA]);expect(choices.actions).not.toContain("auth.sign_in");
  });
  it("searches actor and target labels and treats wildcard characters literally",async()=>{
    await run(async()=>{await db.insert(hubPrograms).values({tenantId:hubA,title:prefix+" literal%_marker",slug:prefix+"literal"});});
    const matches=await caller("country_admin").list({search:"%_marker",limit:50});
    expect(matches.items).toHaveLength(1);expect(matches.items[0]?.targetLabel).toContain("literal%_marker");
    expect((await caller("country_admin").list({search:"Audit Admin",limit:50})).items.length).toBeGreaterThan(0);
  });
  it("checks all current memberships and immediately reflects revocation",async()=>{
    const id=actors.get("tenant_admin")!;
    await database.insert(userTenants).values({userId:id,tenantId:hubB,role:"country_admin"});
    expect((await caller("tenant_admin").list({tenantId:hubB,limit:50})).items.length).toBeGreaterThan(0);
    await database.delete(userTenants).where(and(eq(userTenants.userId,id),eq(userTenants.tenantId,hubB)));
    await expect(caller("tenant_admin").list({tenantId:hubB,limit:50})).rejects.toMatchObject({code:"FORBIDDEN"});
  });
  it("records real deltas and redacts sensitive fields before insertion",async()=>{
    let id="";
    await run(async()=>{const [row]=await db.insert(fellows).values({tenantId:hubA,firstName:"Audit",lastName:"Person",program:"Test",status:"incoming",email:"private@example.test",customFields:{medical:"private"}}).returning();id=row!.id;});
    await run(async()=>{await db.update(fellows).set({status:"active",phone:"private-phone"}).where(eq(fellows.id,id));});
    const rows=await database.select().from(auditEvents).where(eq(auditEvents.targetId,id));
    const serialized=JSON.stringify(rows);expect(serialized).not.toMatch(/private@example|private-phone|medical/);
    expect(rows.flatMap(r=>r.changes)).toContainEqual({field:"status",before:"incoming",after:"active"});
    expect(rows[0]?.actor.name).toBe("Audit Admin");
  });
  it("rolls back the business mutation and event together",async()=>{
    const label=prefix+" rollback";
    await expect(run(async()=>{await db.insert(hubPrograms).values({tenantId:hubA,title:label,slug:label});throw Error("rollback");})).rejects.toThrow("rollback");
    expect(await database.select().from(hubPrograms).where(eq(hubPrograms.title,label))).toHaveLength(0);
    expect(await database.select().from(auditEvents).where(eq(auditEvents.targetLabel,label))).toHaveLength(0);
  });
  it("rolls back a mutation when audit insertion fails",async()=>{
    const label=prefix+" auditfailure";
    await expect(withAuditContext({...context(),requestId:"invalid-uuid"},()=>auditedTransaction(database,async()=>{await db.insert(hubPrograms).values({tenantId:hubA,title:label,slug:label});}))).rejects.toBeDefined();
    expect(await database.select().from(hubPrograms).where(eq(hubPrograms.title,label))).toHaveLength(0);
  });
  it("isolates failed rows in bulk work and retains successful row events",async()=>{
    const label=prefix+" partial";
    await run(async()=>{
      await expect(auditSavepoint(async()=>{await db.insert(hubPrograms).values({tenantId:hubA,title:label+" bad",slug:label+"bad"});throw Error("bad row");})).rejects.toThrow();
      await auditSavepoint(async()=>{await db.insert(hubPrograms).values({tenantId:hubA,title:label,slug:label});});
    });
    const events=await database.select().from(auditEvents).where(eq(auditEvents.targetLabel,label));
    expect(events).toHaveLength(1);
    expect(await database.select().from(auditEvents).where(eq(auditEvents.targetLabel,label+" bad"))).toHaveLength(0);
  });
  it("audits the real CSV mutation with correlated records and an accurate partial summary",async()=>{
    const csv="firstName,lastName,email,program,status,cohortYear\nAma,Audit,"+prefix+"csv@example.test,"+prefix+" Program A,active,2026\n,Invalid,,,,";
    const result=await fellowsRouter.createCaller(callerContext("country_admin")).importCsv({tenantId:hubA,csv});
    expect(result.created).toBe(1);expect(result.errors.length).toBeGreaterThan(0);
    const rows=await database.select().from(auditEvents).where(and(eq(auditEvents.tenantId,hubA),eq(auditEvents.procedure,"importCsv")));
    // A standalone router caller reports its local procedure path.
    const summary=rows.find(r=>r.action==="operation.completed");
    expect(summary?.outcome).toBe("partial");expect(summary?.details.created).toBe(1);
    expect(rows.filter(r=>r.action==="fellow.created").every(r=>r.requestId===summary?.requestId)).toBe(true);
    expect(JSON.stringify(rows)).not.toContain(prefix+"csv@example.test");
  });
  it("preserves audit history when the target is deleted",async()=>{
    const [program]=await database.select().from(hubPrograms).where(eq(hubPrograms.tenantId,hubB)).limit(1);
    await run(async()=>{await db.delete(hubPrograms).where(eq(hubPrograms.id,program!.id));});
    const events=await database.select().from(auditEvents).where(eq(auditEvents.targetId,program!.id));
    expect(events.map(e=>e.action)).toEqual(expect.arrayContaining(["program.created","program.deleted"]));
  });
  it("paginates equal timestamps without duplicates",async()=>{
    const first=await caller("super_admin").list({tenantId:hubA,limit:2});
    expect(first.nextCursor).not.toBeNull();
    const second=await caller("super_admin").list({tenantId:hubA,limit:2,cursor:first.nextCursor!});
    expect(second.items.some(e=>first.items.some(f=>f.id===e.id))).toBe(false);
  });
  it("backfills legacy history once with unknown historical actor details",async()=>{
    const [legacy]=await database.insert(activityLog).values({tenantId:hubA,eventType:"membership.role_changed",metadata:{actorId:actors.get("super_admin"),userId:actors.get("viewer"),role:"viewer"}}).returning();
    await database.transaction(backfillAudit);await database.transaction(backfillAudit);
    const rows=await database.select().from(auditEvents).where(eq(auditEvents.legacyId,legacy!.id));
    expect(rows).toHaveLength(1);expect(rows[0]?.details.legacy).toBe(true);expect(rows[0]?.actor.name).toBeNull();
  });
  it("separates concurrent actors and correlation IDs",async()=>{
    const contexts=[context(),{...context(),actor:{kind:"user" as const,id:actors.get("country_admin")!,name:"Country Audit Actor",role:"country_admin"}}];
    await Promise.all(contexts.map((ctx,i)=>withAuditContext(ctx,()=>auditedTransaction(database,async()=>{
      await db.insert(hubPrograms).values({tenantId:hubA,title:prefix+" concurrent "+i,slug:prefix+"concurrent"+i});
    }))));
    for(const ctx of contexts){
      const rows=await database.select().from(auditEvents).where(eq(auditEvents.requestId,ctx.requestId));
      expect(rows).toHaveLength(1);expect(rows[0]?.actor.id).toBe(ctx.actor.id);
    }
  });
  it("defaults retention to dry run and preserves the exact cutoff boundary",async()=>{
    const now=new Date("2026-09-07T12:00:00Z"),old=new Date("2025-09-07T11:59:59.999Z"),boundary=new Date("2025-09-07T12:00:00Z");
    await run(async()=>{
      await writeAudit(database,{action:"auth.sign_in",targetType:"account",targetId:actors.get("viewer"),occurredAt:old});
      await writeAudit(database,{action:"auth.sign_in",targetType:"account",targetId:actors.get("viewer"),occurredAt:boundary});
    });
    const dry=await retainAudit(database,{operator:prefix,now});expect(dry.dryRun).toBe(true);expect(dry.count).toBeGreaterThan(0);
    const result=await retainAudit(database,{operator:prefix,apply:true,now});expect(result.dryRun).toBe(false);
    const remaining=await database.select().from(auditEvents).where(and(eq(auditEvents.targetId,actors.get("viewer")!),eq(auditEvents.occurredAt,boundary)));
    expect(remaining).toHaveLength(1);
    await database.delete(auditEvents).where(sql`${auditEvents.actor}->>'id' = ${prefix}`);
  });
  it("keeps denial recording failures from aborting other transaction work",async()=>{
    await withAuditContext({...context(),requestId:"invalid"},()=>database.transaction(async tx=>{
      await auditFailure(tx,{action:"operation.failed",targetType:"test",outcome:"denied"});
      await tx.execute(sql`select 1`);
    }));
  });
});
