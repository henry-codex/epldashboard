import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
dotenv.config({ path: fileURLToPath(new URL("../../../../apps/server/.env", import.meta.url)) });
async function recover() {
  const { values } = parseArgs({ options: {
    "user-id": { type: "string" }, operator: { type: "string" }, reason: { type: "string" },
    "identity-verified": { type: "boolean", default: false },
  }, strict: true, allowPositionals: false });
  const input = { userId: values["user-id"] ?? "", operator: values.operator ?? "", reason: values.reason ?? "" };
  if (!values["identity-verified"] || Object.values(input).some((text) => !text.trim())) throw new Error("Use --user-id, --operator, --reason and --identity-verified after verifying the recipient's identity.");
  const { transactionalDb } = await import("@epl-fellows-platform/db");
  try {
    const { resetMfaForRecovery } = await import("../mfa-store");
    await resetMfaForRecovery(transactionalDb, input);
    console.info("MFA recovery completed. Sessions were revoked. Required administrators must enroll again.");
  } finally { await transactionalDb.$client.end({ timeout: 3 }); }
}
recover().catch(() => { console.error("MFA recovery failed. Verify command arguments, database setup and the exact user ID. No credentials are printed."); process.exitCode = 1; });
