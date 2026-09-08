export type InvitationErrorCode = "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "TOO_MANY_REQUESTS";
export class InvitationError extends Error {
  constructor(public readonly code: InvitationErrorCode, message: string) { super(message); this.name = "InvitationError"; }
}
