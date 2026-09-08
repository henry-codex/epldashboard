import { describe, expect, it } from "vitest";
import { resolveAccess } from "./access-policy";
import { canIssueInvitation } from "./invitation-policy";
import { tenantAdminMigrationPlan } from "@epl-fellows-platform/db/tenant-admin-migration";
const membership = (role: string, countryCode = "GH", isActive = true) => ({ role, countryCode, isActive, tenantId: countryCode, name: countryCode });
describe("global Tenant Admin policy", () => {
  it.each(["super_admin","tenant_admin","country_admin","alumni_exec","fellow","viewer"])("limits global capabilities for %s", role => {
    const access = resolveAccess([membership(role, role === "tenant_admin" ? "GLOBAL" : "GH")]);
    expect(access.capabilities.platformView).toBe(["super_admin","tenant_admin"].includes(role));
    expect(access.capabilities.manageMemberships).toBe(role === "super_admin");
    expect(access.capabilities.manageHubs).toBe(role === "super_admin");
  });
  it("rejects legacy, inactive and unassigned grants and considers all memberships", () => {
    for (const rows of [[], [membership("tenant_admin")], [membership("tenant_admin","GLOBAL",false)], [membership("viewer","GLOBAL")]])
      expect(resolveAccess(rows).capabilities.globalOperations).toBe(false);
    const access = resolveAccess([membership("viewer"), membership("tenant_admin","GLOBAL")]);
    expect(access.workspace).toEqual({id:"GLOBAL",name:"EPL Global Platform",kind:"global"});
    expect(access.capabilities.globalOperations).toBe(true);
  });
  it("allows only country-admin invitations across hubs for global operators", () => {
    const actor = { role:"tenant_admin", tenantId:"global", countryCode:"GLOBAL" };
    expect(canIssueInvitation(actor,"country_admin","ghana","GH")).toBe(true);
    expect(canIssueInvitation(actor,"country_admin","kenya","KE")).toBe(true);
    for (const role of ["super_admin","tenant_admin","alumni_exec","viewer"]) expect(canIssueInvitation(actor,role,"ghana","GH")).toBe(false);
    expect(canIssueInvitation(actor,"country_admin","global","GLOBAL")).toBe(false);
    expect(canIssueInvitation({...actor,countryCode:"GH"},"country_admin","ghana","GH")).toBe(false);
  });
});
describe("Tenant Admin migration preflight", () => {
  const hubs = [{id:"global",name:"EPL Global Platform",countryCode:"GLOBAL",isActive:true},{id:"ghana",name:"Ghana",countryCode:"GH",isActive:true}];
  const old = {id:"old",userId:"operator",tenantId:"ghana",role:"tenant_admin"};
  const manager = {id:"manager",userId:"manager",tenantId:"ghana",role:"country_admin"};
  it("requires a resident Country Admin and detects destination conflicts", () => {
    expect(tenantAdminMigrationPlan(hubs,[old],[]).blockers.join(" ")).toContain("needs a Country Admin");
    expect(tenantAdminMigrationPlan(hubs,[old,manager],[]).blockers).toEqual([]);
    expect(tenantAdminMigrationPlan(hubs,[old,manager,{...old,id:"other",role:"viewer",tenantId:"global"}],[]).blockers.join(" ")).toContain("conflicting");
  });
  it("cancels only pending legacy invitations and skips already migrated accounts", () => {
    const invite = {id:"invite",role:"tenant_admin",tenantId:"ghana",email:"recipient@example.test",status:"pending"};
    const plan = tenantAdminMigrationPlan(hubs,[{...old,tenantId:"global"},manager],[invite,{...invite,id:"used",status:"accepted"}]);
    expect(plan.moves).toEqual([]); expect(plan.cancel.map(i=>i.id)).toEqual(["invite"]);
    const privateInvite = { ...invite, tokenHash: "must-not-appear", secret: "must-not-appear" };
    expect(JSON.stringify(tenantAdminMigrationPlan(hubs, [old, manager], [privateInvite]))).not.toContain("must-not-appear");
  });
});
