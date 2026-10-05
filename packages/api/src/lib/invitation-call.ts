import { TRPCError } from "@trpc/server";
import { InvitationError } from "@epl-fellows-platform/auth/invitation-error";

function databaseErrorCode(error: unknown): string | undefined {
  const visited = new Set<object>();
  let current = error;
  while (current && typeof current === "object" && !visited.has(current) && visited.size < 8) {
    visited.add(current);
    if ("code" in current && typeof current.code === "string" && /^[0-9A-Z]{5}$/.test(current.code)) return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
}

export async function invitationCall<T>(
  operation: () => Promise<T>,
  operationName: "listInvitations" | "manageAccess" = "manageAccess",
): Promise<T> {
  try { return await operation(); }
  catch (error) {
    if (error instanceof InvitationError) throw new TRPCError({ code: error.code, message: error.message });
    const databaseCode = databaseErrorCode(error);
    // Drizzle errors can contain SQL parameters, credentials, and invitation tokens.
    // Record only a fixed operation label and the database's SQLSTATE.
    console.error("Access management operation failed", { operation: operationName, databaseCode: databaseCode ?? "UNKNOWN" });
    if (databaseCode === "42P01" || databaseCode === "42703") {
      throw new TRPCError({
        code: "SERVICE_UNAVAILABLE",
        message: "Access management is unavailable until database setup is completed. Contact the platform administrator.",
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: operationName === "listInvitations"
        ? "Could not load invitations. Refresh and try again."
        : "Could not update access. Refresh and try again.",
    });
  }
}
