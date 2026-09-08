import { afterEach, describe, expect, it, vi } from "vitest";
import { invitationCall } from "./invitation-call";
import { InvitationError } from "@epl-fellows-platform/auth/invitation-error";

afterEach(() => vi.restoreAllMocks());

describe("invitation error reporting", () => {
  it.each(["42P01", "42703"])("reports incomplete schema (%s) without exposing query data", async (code) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const privateDetails = "private-password-and-invitation-token";
    const error = new Error(privateDetails, { cause: { code, query: privateDetails, parameters: [privateDetails] } });
    await expect(invitationCall(async () => { throw error; }, "listInvitations")).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message: "Access management is unavailable until database setup is completed. Contact the platform administrator.",
    });
    expect(log).toHaveBeenCalledWith("Access management operation failed", { operation: "listInvitations", databaseCode: code });
    expect(JSON.stringify(log.mock.calls)).not.toContain(privateDetails);
  });

  it("describes a failed invitation read as a load failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(invitationCall(async () => { throw new Error("private server detail"); }, "listInvitations")).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR", message: "Could not load invitations. Refresh and try again.",
    });
    expect(log).toHaveBeenCalledWith("Access management operation failed", { operation: "listInvitations", databaseCode: "UNKNOWN" });
  });

  it("handles cyclic error causes without hanging or leaking their contents", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("private server detail"); error.cause = error;
    await expect(invitationCall(async () => { throw error; })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR", message: "Could not update access. Refresh and try again.",
    });
  });

  it("preserves actionable authorization errors without reporting a server failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(invitationCall(async () => { throw new InvitationError("FORBIDDEN", "Wrong hub"); })).rejects.toMatchObject({
      code: "FORBIDDEN", message: "Wrong hub",
    });
    expect(log).not.toHaveBeenCalled();
  });
});
