import { z } from "zod";

export const profileNameSchema = z.string().trim().min(1, "Name is required").max(100, "Name must be 100 characters or fewer");
export const newPasswordSchema = z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be 128 characters or fewer");

export function passwordConfirmationError(password: string, confirmation: string): string | null {
  const result = newPasswordSchema.safeParse(password);
  if (!result.success) return result.error.issues[0]?.message ?? "Invalid password";
  return password === confirmation ? null : "New passwords do not match";
}
