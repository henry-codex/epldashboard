import { describe, it, expect } from "vitest";
import { auditChanges, auditText, retentionCutoff } from "@epl-fellows-platform/db/audit-policy";
import { requestAuditContext } from "@epl-fellows-platform/db/audit";
describe("audit redaction and request metadata",()=>{
  it("retains safe changes and excludes credentials even from field names",()=>{
    const changes=auditChanges({role:"viewer",email:"old@example.test",password:"old",customFields:{secret:"old"}},{role:"country_admin",email:"new@example.test",password:"private",customFields:{secret:"private"}});
    expect(changes).toEqual([{field:"customFields",redacted:true},{field:"email",redacted:true},{field:"role",before:"viewer",after:"country_admin"}]);
    expect(JSON.stringify(changes)).not.toMatch(/private|example/);
  });
  it("does not retain arbitrary nested values or unchanged fields",()=>{
    expect(auditChanges({status:"active",name:"A"},{status:"active",name:{secret:"value"}})).toEqual([{field:"name",redacted:true}]);
  });
  it("sanitizes control characters and bounds text",()=>expect(auditText("first\nsecond\u0000",9)).toBe("first sec"));
  it("uses server-generated correlation and validates IP addresses",()=>{
    const a=requestAuditContext({ip:"spoofed",userAgent:"Browser\r\nInjected"}),b=requestAuditContext({ip:"127.0.0.1"});
    expect(a.clientIp).toBeNull();expect(a.userAgent).toBe("Browser  Injected");expect(a.requestId).not.toBe(b.requestId);expect(b.clientIp).toBe("127.0.0.1");
  });
  it("clamps leap-day retention to the previous calendar year",()=>{
    expect(retentionCutoff(new Date("2024-02-29T12:34:56Z")).toISOString()).toBe("2023-02-28T12:34:56.000Z");
  });
});
