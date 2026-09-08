import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
import { transactionalDb as database, tenants, userTenants, user, session, mfaChallenge, verification, invitations, hubPrograms, hubEvents, alumniExecutives, auditEvents, activityLog } from "@epl-fellows-platform/db";
import { resolveAccess } from "@epl-fellows-platform/auth/access-policy";
import { mfaStatus } from "@epl-fellows-platform/auth/mfa-policy";
import { createInvitationService } from "@epl-fellows-platform/auth/invitation-service";
import { migrateTenantAdmins, assertTenantAdminAssignments } from "@epl-fellows-platform/db/tenant-admin-migration";
import { auditSchemaSql } from "@epl-fellows-platform/db/audit-schema";
import * as auditing from "@epl-fellows-platform/db/audit";
import { programsRouter } from "./routers/programs";
import { platformRouter } from "./routers/platform";
import { tenantsRouter } from "./routers/tenants";
import { eventsRouter } from "./routers/events";
import { alumniExecutivesRouter } from "./routers/alumni-executives";
import { usersRouter } from "./routers/users";
import { auditRouter } from "./routers/audit";
import type { Context } from "./context";
vi.setConfig({ testTimeout: 30000, hookTimeout: 60000 });

describe.skipIf(!process.env.TEST_DATABASE_URL)("global Tenant Admin integration", () => {
  const prefix = "global-ops-" + randomUUID(), ids: string[] = [], hubs: string[] = [], delivered = new Map<string,string>();
  let globalId: string, a: string, b: string, operator: string, superId: string, manager: string;
  const service = createInvitationService({ database, frontendURL: "http://localhost:4301",
    createUser: async (tx,input) => { const id=randomUUID(); ids.push(id); await tx.insert(user).values({id,name:input.name,email:input.email}); return {id}; },
    sendEmail: async input => { delivered.set(input.to, input.url); } });
  async function person(role?: string, hub?: string) {
    const id = randomUUID(); ids.push(id);
    await database.insert(user).values({id,name:prefix+" "+(role??"unassigned"),email:id+"@example.test"});
    if(role && hub) await database.insert(userTenants).values({userId:id,tenantId:hub,role});
    return id;
  }
  async function context(id: string, verified = true): Promise<Context> {
    const memberships = await database.select({role:userTenants.role,tenantId:userTenants.tenantId,countryCode:tenants.countryCode,isActive:tenants.isActive,name:tenants.name}).from(userTenants).innerJoin(tenants,eq(userTenants.tenantId,tenants.id)).where(eq(userTenants.userId,id));
    const access = resolveAccess(memberships), now = new Date();
    const person = (await database.select().from(user).where(eq(user.id,id)))[0]!;
    return { ...access, userTenant:null,
      mfa:mfaStatus({roles:memberships.map(m=>m.role),enabled:true,totpEnabled:true,verificationMethod:verified?"authenticator":null,verifiedAt:verified?now:null}),
      session:{user:person,session:{id:randomUUID(),token:"unused-isolated-token",userId:id,createdAt:now,updatedAt:now,expiresAt:new Date(Date.now()+60000)}} };
  }
  async function membership(id:string) { return (await database.select().from(userTenants).where(eq(userTenants.userId,id)))[0]!; }
  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL!);
    if(url.hostname!=="127.0.0.1"||url.port!=="55432"||url.pathname!=="/epl_settings_test"||process.env.DATABASE_URL!==url.toString()) throw Error("Isolated database required");
    await database.execute(sql.raw(auditSchemaSql));
    let global = await database.query.tenants.findFirst({where:eq(tenants.countryCode,"GLOBAL")});
    if(!global){ global=(await database.insert(tenants).values({name:"EPL Global Platform",slug:prefix+"global",countryCode:"GLOBAL"}).returning())[0]!; }
    globalId=global.id;
    const rows=await database.insert(tenants).values([{name:prefix+" Ghana",slug:prefix+"a",countryCode:"GH"},{name:prefix+" Kenya",slug:prefix+"b",countryCode:"KE"}]).returning();
    a=rows[0]!.id;b=rows[1]!.id;hubs.push(a,b);
    operator=await person("tenant_admin",globalId);superId=await person("super_admin",globalId);manager=await person("country_admin",a);
    await person("country_admin",b);
  },60000);
  afterAll(async () => {
    vi.restoreAllMocks();
    await database.delete(invitations).where(inArray(invitations.issuerId,ids));
    await database.delete(hubPrograms).where(inArray(hubPrograms.tenantId,hubs));
    await database.delete(hubEvents).where(sql`${hubEvents.title} like ${prefix+"%"}`);
    await database.delete(alumniExecutives).where(sql`${alumniExecutives.firstName} like ${prefix+"%"}`);
    await database.delete(activityLog).where(inArray(activityLog.tenantId,hubs));
    await database.delete(userTenants).where(inArray(userTenants.userId,ids));
    await database.delete(verification).where(inArray(verification.value,ids));
    await database.delete(user).where(inArray(user.id,ids));
    await database.delete(tenants).where(inArray(tenants.id,hubs));
    await database.$client.end({timeout:2});
  });
  it("opens all hubs and global dashboards but requires a real country for country operations", async () => {
    const ctx=await context(operator);
    expect(ctx.workspace?.name).toBe("EPL Global Platform");
    expect((await tenantsRouter.createCaller(ctx).get({id:b})).id).toBe(b);
    await expect(platformRouter.createCaller(ctx).overview()).resolves.toBeDefined();
    await expect(programsRouter.createCaller(ctx).create({title:prefix+" Missing",status:"active"} as never)).rejects.toMatchObject({code:"BAD_REQUEST"});
    await expect(programsRouter.createCaller(ctx).create({tenantId:globalId,title:prefix+" Wrong",status:"active"} as never)).rejects.toMatchObject({code:"NOT_FOUND"});
    await programsRouter.createCaller(ctx).create({tenantId:b,title:prefix+" Program",status:"active"} as never);
    await expect(programsRouter.createCaller(await context(manager)).create({tenantId:b,title:prefix+" Denied",status:"active"} as never)).rejects.toMatchObject({code:"FORBIDDEN"});
  });
  it("manages global events and board records but denies hub and membership administration", async () => {
    const ctx=await context(operator);
    await eventsRouter.createCaller(ctx).create({title:prefix+" Event",startsAt:new Date(),isGlobal:true} as never);
    await alumniExecutivesRouter.createCaller(ctx).create({firstName:prefix+" Board",lastName:"Member",role:"Chair"} as never);
    await expect(tenantsRouter.createCaller(ctx).create({name:"Denied",countryCode:"XX"} as never)).rejects.toMatchObject({code:"FORBIDDEN"});
    await expect(usersRouter.createCaller(ctx).updateRole({id:(await membership(manager)).id,role:"viewer"})).rejects.toMatchObject({code:"FORBIDDEN"});
    await expect(usersRouter.createCaller(ctx).removeMembership({id:(await membership(manager)).id})).rejects.toMatchObject({code:"FORBIDDEN"});
  });
  it("enforces invitation choices and cross-country authority on acceptance", async () => {
    const choices=await service.invitationOptions(operator);
    expect(choices.map(c=>c.role)).toEqual(["country_admin"]);
    expect(choices[0]!.workspaces.some(h=>h.id===b)).toBe(true);
    const address=randomUUID()+"@example.test";
    const invite=await service.issue(operator,{name:"Country recipient",email:address,tenantId:b,role:"country_admin"});
    const token=new URL(delivered.get(address)!).searchParams.get("token")!;
    const wrong=await person(); await expect(service.accept(token,{},wrong)).rejects.toMatchObject({code:"FORBIDDEN"});
    await database.update(tenants).set({isActive:false}).where(eq(tenants.id,globalId));
    try { await expect(service.accept(token,{name:"Country recipient",password:"Isolated-password-123"})).rejects.toMatchObject({code:"FORBIDDEN"}); }
    finally { await database.update(tenants).set({isActive:true}).where(eq(tenants.id,globalId)); }
    await service.accept(token,{name:"Country recipient",password:"Isolated-password-123"});
    await expect(service.accept(token,{})).rejects.toMatchObject({code:"BAD_REQUEST"});
    for(const role of ["super_admin","tenant_admin","viewer","alumni_exec"] as const)
      await expect(service.issue(operator,{name:"Denied",email:randomUUID()+"@example.test",tenantId:b,role})).rejects.toBeDefined();
    await expect(service.issue(superId,{name:"Denied",email:randomUUID()+"@example.test",tenantId:a,role:"tenant_admin"})).rejects.toMatchObject({code:"BAD_REQUEST"});
    expect(invite.tenantId).toBe(b);
  });
  it("excludes global access/security and unscoped events from operator audit queries", async () => {
    await auditing.writeAudit(database,{action:"auth.sign_in",targetType:"account",targetId:operator});
    await auditing.writeAudit(database,{action:"membership.role_changed",category:"access",tenantId:globalId,targetType:"membership",targetId:operator});
    const api=auditRouter.createCaller(await context(operator));
    const result=await api.list({limit:100});
    expect(result.items.some(e=>e.targetLabel===prefix+" Event")).toBe(true);
    expect(result.items.some(e=>e.targetLabel?.includes(prefix+" Board"))).toBe(true);
    expect(result.items.every(e=>["records","access"].includes(e.category))).toBe(true);
    expect(result.items.filter(e=>e.category==="access").every(e=>e.tenantId!==null)).toBe(true);
    const hidden=(await database.select().from(auditEvents).where(and(eq(auditEvents.targetId,operator),eq(auditEvents.action,"auth.sign_in"))))[0]!;
    await expect(api.get({id:hidden.id})).rejects.toMatchObject({code:"NOT_FOUND"});
    expect((await api.filters({})).actions).not.toContain("auth.sign_in");
    await expect(auditRouter.createCaller(await context(operator,false)).list({limit:50})).rejects.toMatchObject({code:"FORBIDDEN"});
  });
  it("protects the last Country Admin and permits promotion/demotion while preserving unrelated memberships", async () => {
    const last=await person("country_admin",a), first=await membership(manager), second=await membership(last);
    const results=await Promise.allSettled([service.changeMembership(superId,first.id,"tenant_admin"),service.changeMembership(superId,second.id,"tenant_admin")]);
    expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
    const promoted=results[0]!.status==="fulfilled"?manager:last;
    await database.insert(userTenants).values({userId:promoted,tenantId:b,role:"viewer"});
    const globalMembership=(await database.select().from(userTenants).where(and(eq(userTenants.userId,promoted),eq(userTenants.tenantId,globalId))))[0]!;
    await expect(service.changeMembership(superId,globalMembership.id,"viewer")).rejects.toMatchObject({code:"BAD_REQUEST"});
    await expect(service.changeMembership(superId,globalMembership.id,"viewer",b)).rejects.toMatchObject({code:"CONFLICT"});
    await service.changeMembership(superId,globalMembership.id,"country_admin",a);
    expect((await database.select().from(userTenants).where(and(eq(userTenants.userId,promoted),eq(userTenants.tenantId,b))))[0]?.role).toBe("viewer");
  });
  it("migrates atomically, cancels old invitations, revokes sessions/challenges and is repeatable", async () => {
    const legacy=await person("tenant_admin",a), now=new Date(), future=new Date(Date.now()+60000), id=randomUUID();
    await database.insert(session).values({id,token:randomUUID(),userId:legacy,expiresAt:future,updatedAt:now});
    await database.insert(mfaChallenge).values({id:randomUUID(),userId:legacy,binding:randomUUID(),purpose:"login",expiresAt:future});
    await database.insert(verification).values({id:randomUUID(),identifier:"2fa-"+randomUUID(),value:legacy,expiresAt:future});
    const [old]=await database.insert(invitations).values({name:"Old invite",email:randomUUID()+"@example.test",issuerId:superId,tenantId:a,role:"tenant_admin",tokenHash:randomUUID(),expiresAt:future}).returning();
    const dry=await migrateTenantAdmins(database,{});
    expect(dry.moves.some(m=>m.userId===legacy)).toBe(true);
    expect((await membership(legacy)).tenantId).toBe(a);
    await expect(assertTenantAdminAssignments(database)).rejects.toThrow("migration");
    const spy=vi.spyOn(auditing,"writeAudit").mockRejectedValueOnce(new Error("Injected audit failure"));
    try { await expect(migrateTenantAdmins(database,{apply:true,operator:"isolated-test"})).rejects.toThrow("Injected"); } finally { spy.mockRestore(); }
    expect((await membership(legacy)).tenantId).toBe(a);
    expect(await database.query.session.findFirst({where:eq(session.id,id)})).toBeDefined();
    const applied=await migrateTenantAdmins(database,{apply:true,operator:"isolated-test"});
    expect(applied.applied).toBe(true); expect((await membership(legacy)).tenantId).toBe(globalId);
    expect(await database.query.session.findFirst({where:eq(session.id,id)})).toBeUndefined();
    expect(await database.query.mfaChallenge.findFirst({where:eq(mfaChallenge.userId,legacy)})).toBeUndefined();
    expect(await database.query.verification.findFirst({where:eq(verification.value,legacy)})).toBeUndefined();
    expect((await database.query.invitations.findFirst({where:eq(invitations.id,old!.id)}))?.status).toBe("cancelled");
    await assertTenantAdminAssignments(database);
    expect((await migrateTenantAdmins(database,{apply:true,operator:"isolated-test"})).moves).toEqual([]);
  });
});
