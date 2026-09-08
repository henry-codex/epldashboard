import { beforeAll, afterAll, it, describe, expect, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { transactionalDb as database, user, userTenants, tenants, auditEvents, verification, session } from "@epl-fellows-platform/db";
import * as audit from "@epl-fellows-platform/db/audit";
import { createAuth } from "./create-auth";
const connection=process.env.TEST_DATABASE_URL;
describe.skipIf(!connection)("authentication audit events",()=>{
  const ids:string[]=[],hub=randomUUID(),password="Audit-password-123",origin="http://localhost:4301",baseURL="http://localhost:4300";
  let failDelivery=false;
  const options={database,mfaDatabase:database,secret:"isolated-auth-audit-secret-at-least-32-characters",baseURL,trustedOrigin:origin,production:false,sendPasswordResetEmail:async()=>{if(failDelivery)throw Error("private-provider-secret");}};
  const auth=createAuth(options),provision=createAuth({...options,trustedAccountCreation:true});
  async function request(path:string,body:object,cookie?:string){
    const response=await auth.handler(new Request(baseURL+"/api/auth"+path,{method:"POST",headers:{origin,"content-type":"application/json","user-agent":"Audit test","x-epl-client-ip":"203.0.113.44",...(cookie?{cookie}:{})},body:JSON.stringify(body)}));
    return {status:response.status,data:await response.json() as Record<string,unknown>,cookie:response.headers.getSetCookie().map(v=>v.split(";")[0]).join("; ")};
  }
  async function account(){
    const email=randomUUID()+"@example.test",person=await provision.api.signUpEmail({body:{name:"Audit Person",email,password}});
    ids.push(person.user.id);return {id:person.user.id,email};
  }
  const events=(id:string)=>database.select().from(auditEvents).where(eq(auditEvents.targetId,id));
  beforeAll(async()=>{
    const url=new URL(connection!);
    if(!["localhost","127.0.0.1"].includes(url.hostname)||url.port!=="55432"||url.pathname!=="/epl_settings_test"||connection!==process.env.DATABASE_URL)throw Error("Isolated database required");
    await database.insert(tenants).values({id:hub,name:"Audit Auth Hub",slug:hub});
  });
  afterAll(async()=>{
    await database.delete(auditEvents).where(sql`${auditEvents.targetId} in ${ids} or ${auditEvents.actor}->>'id' in ${ids}`);
    await database.delete(userTenants).where(inArray(userTenants.userId,ids));
    await database.delete(verification).where(inArray(verification.value,ids));
    await database.delete(user).where(inArray(user.id,ids));
    await database.delete(tenants).where(eq(tenants.id,hub));
    await database.$client.end({timeout:2});
  });
  it("distinguishes anonymous failures and verified sign-in without trusting forwarded IP",async()=>{
    const person=await account();
    expect((await request("/sign-in/email",{email:person.email,password:"incorrect-password"})).status).toBe(401);
    expect((await request("/sign-in/email",{email:person.email,password})).status).toBe(200);
    const rows=await events(person.id);
    expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({action:"auth.sign_in",outcome:"failed",actor:expect.objectContaining({kind:"anonymous",id:null})}),expect.objectContaining({action:"auth.sign_in",outcome:"success",actor:expect.objectContaining({id:person.id})})]));
    expect(rows.every(r=>r.clientIp===null)).toBe(true);
    expect(JSON.stringify(rows)).not.toContain(password);
  });
  it("records password acceptance as pending when a protected account must verify MFA",async()=>{
    const person=await account();
    await database.update(user).set({twoFactorEnabled:true,totpEnabled:true}).where(eq(user.id,person.id));
    expect((await request("/sign-in/email",{email:person.email,password})).data.twoFactorRedirect).toBe(true);
    const rows=await events(person.id);
    expect(rows.map(e=>e.action)).toContain("auth.challenge_issued");
    expect(rows.map(e=>e.action)).not.toContain("auth.sign_in");
  });
  it("records required administrator enrollment as restricted rather than completed sign-in",async()=>{
    const person=await account();
    await database.insert(userTenants).values({userId:person.id,tenantId:hub,role:"country_admin"});
    expect((await request("/sign-in/email",{email:person.email,password})).status).toBe(200);
    expect(await events(person.id)).toEqual(expect.arrayContaining([expect.objectContaining({action:"auth.challenge_issued",details:expect.objectContaining({reasonCode:"MFA_ENROLLMENT_REQUIRED"})})]));
  });
  it("commits profile changes and snapshots together and rolls back on audit failure",async()=>{
    const person=await account(),login=await request("/sign-in/email",{email:person.email,password});
    expect((await request("/update-user",{name:"Updated Audit Person"},login.cookie)).status).toBe(200);
    expect((await events(person.id)).find(e=>e.action==="auth.profile_updated")?.changes).toContainEqual({field:"name",before:"Audit Person",after:"Updated Audit Person"});
    expect((await request("/update-user",{name:" "},login.cookie)).status).toBe(400);
    expect((await events(person.id)).find(e=>e.action==="auth.profile_updated"&&e.outcome==="failed")?.actor.id).toBe(person.id);
    const original=audit.writeAudit;
    const spy=vi.spyOn(audit,"writeAudit").mockImplementation(async(db,event)=>{if(event.action==="auth.profile_updated")throw Error("Audit unavailable");return original(db,event);});
    try {expect((await request("/update-user",{name:"Must roll back"},login.cookie)).status).toBe(503);}
    finally{spy.mockRestore();}
    const [saved]=await database.select().from(user).where(eq(user.id,person.id));expect(saved?.name).toBe("Updated Audit Person");
  });
  it("preserves generic recovery responses and records asynchronous SMTP failure safely",async()=>{
    const person=await account();failDelivery=true;
    const known=await request("/request-password-reset",{email:person.email,redirectTo:origin+"/reset-password"});
    const unknown=await request("/request-password-reset",{email:randomUUID()+"@example.test",redirectTo:origin+"/reset-password"});
    expect(known.status).toBe(200);expect(known.data).toEqual(unknown.data);
    await vi.waitFor(async()=>expect((await events(person.id)).some(e=>e.action==="auth.email_submitted"&&e.outcome==="failed")).toBe(true));
    expect(JSON.stringify(await events(person.id))).not.toMatch(/private-provider|reset-password:|token/);failDelivery=false;
  });
  it("identifies an individually revoked session without retaining its token",async()=>{
    const person=await account();await request("/sign-in/email",{email:person.email,password});
    const current=await request("/sign-in/email",{email:person.email,password});
    const [target]=await database.select().from(session).where(eq(session.userId,person.id)).orderBy(asc(session.createdAt)).limit(1);
    expect((await request("/revoke-session",{token:target!.token},current.cookie)).status).toBe(200);
    const [event]=await database.select().from(auditEvents).where(and(eq(auditEvents.targetId,target!.id),eq(auditEvents.action,"auth.session_revoked")));
    expect(event?.targetType).toBe("session");expect(JSON.stringify(event)).not.toContain(target!.token);
  });
  it("records public signup rejection without submitted credentials",async()=>{
    const result=await request("/sign-up/email",{email:randomUUID()+"@example.test",name:"Public",password});
    expect(result.status).toBeGreaterThanOrEqual(400);
    const rows=await database.select().from(auditEvents).where(and(eq(auditEvents.action,"auth.signup_denied"),eq(auditEvents.outcome,"failed")));
    expect(rows.length).toBeGreaterThan(0);expect(JSON.stringify(rows)).not.toContain(password);
  });
});
