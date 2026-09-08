import { describe, expect, it } from "vitest";
import { passwordConfirmationError, profileNameSchema } from "./account-policy";
describe("account input validation", () => {
  it("trims names and accepts single-character names", () => { expect(profileNameSchema.parse("  A  ")).toBe("A"); });
  it.each(["", "   ", "a".repeat(101)])("rejects invalid names", (name) => { expect(profileNameSchema.safeParse(name).success).toBe(false); });
  it.each([8, 128])("accepts a matching password at length %i", (length) => { const password = "a".repeat(length); expect(passwordConfirmationError(password, password)).toBeNull(); });
  it.each([7, 129])("rejects password length %i", (length) => { const password = "a".repeat(length); expect(passwordConfirmationError(password, password)).not.toBeNull(); });
  it("rejects mismatched passwords", () => { expect(passwordConfirmationError("valid-password", "different-password")).toBe("New passwords do not match"); });
});
