import { inArray, lt, sql } from "drizzle-orm";
import { auditEvents } from "./schema/audit";
import { activityLog } from "./schema/epl";
import { auditText, retentionCutoff } from "./audit-policy";
import { requestAuditContext, withAuditContext, writeAudit } from "./audit";
import type { TransactionalDatabase } from "./index";
export async function retainAudit(database: TransactionalDatabase, input: { operator: string; apply?: boolean; now?: Date }) {
  const operator=auditText(input.operator);
  if(!operator)throw new Error("Operator identity is required.");
  const cutoff=retentionCutoff(input.now);
  const context={...requestAuditContext({source:"cli"}),actor:{kind:"operator" as const,id:operator,name:null,role:null},procedure:"audit.retention"};
  return withAuditContext(context,()=>database.transaction(async tx=>{
    await tx.execute(sql`select pg_advisory_xact_lock(158610, 2027)`);
    const [row]=await tx.select({count:sql<number>`count(*)::int`}).from(auditEvents).where(lt(auditEvents.occurredAt,cutoff));
    if(!input.apply)return {dryRun:true,cutoff:cutoff.toISOString(),count:row?.count??0};
    let count=0;
    // Delete in bounded batches; all batches and the count event commit together.
    while(true){
      const batch=await tx.select({id:auditEvents.id,legacyId:auditEvents.legacyId}).from(auditEvents).where(lt(auditEvents.occurredAt,cutoff)).limit(1000);
      if(!batch.length)break;
      await tx.delete(auditEvents).where(inArray(auditEvents.id,batch.map(r=>r.id)));
      const legacy=batch.flatMap(r=>r.legacyId?[r.legacyId]:[]);
      if(legacy.length)await tx.delete(activityLog).where(inArray(activityLog.id,legacy));
      count+=batch.length;
    }
    await writeAudit(tx,{action:"audit.retention",category:"system",targetType:"audit",details:{count,cutoff:cutoff.toISOString()}});
    return {dryRun:false,cutoff:cutoff.toISOString(),count};
  }));
}
