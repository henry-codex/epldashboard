import { afterEach, describe, expect, it, vi } from "vitest";
import { passwordResetMessage, invitationMessage, emailOtpMessage } from "./template";
const sendMail = vi.hoisted(() => vi.fn());
const createTransport = vi.hoisted(() => vi.fn((_options: unknown) => ({ sendMail, verify: vi.fn() })));
vi.mock("nodemailer", () => ({ default: { createTransport } }));
vi.mock("@epl-fellows-platform/env/server", () => ({ env: {
  NODE_ENV: "test", SMTP_PORT: 1025, SMTP_SECURE: false,
} }));
import { sendPasswordResetEmail, sendOtpEmail } from "./index";

afterEach(() => vi.restoreAllMocks());
describe("password reset mail", () => {
  it("provides purpose-specific OTP messages in both formats without claiming inbox delivery", () => {
    const login = emailOtpMessage("012345", "login"), enrollment = emailOtpMessage("654321", "enrollment");
    expect(login.subject).not.toBe(enrollment.subject);
    expect(login.text).toContain("012345"); expect(login.html).toContain("012345");
    expect(login.text).toContain("five minutes"); expect(login.html).toContain("five minutes");
  });
  it("escapes invitation details and includes the expiry in both email formats", () => {
    const message = invitationMessage({ name: "<Name>", hubName: "A & B", roleLabel: "Viewer", url: "https://example.test/accept-invitation?token=safe" });
    expect(message.html).toContain("&lt;Name&gt;");
    expect(message.html).toContain("A &amp; B");
    expect(message.text).toContain("48 hours");
    expect(message.html).toContain("48 hours");
    expect(message.text).toContain("choose your own password");
  });
  it("includes the link in both formats and escapes HTML attributes", () => {
    const message = passwordResetMessage('https://example.test/reset?token=a&next="x"');
    expect(message.text).toContain('token=a&next="x"');
    expect(message.html).toContain("token=a&amp;next=&quot;x&quot;");
    expect(message.text).toContain("one hour");
  });
  it("delivers through unauthenticated local SMTP", async () => {
    sendMail.mockResolvedValueOnce({ messageId: "test-message" });
    await sendPasswordResetEmail({ to: "account@example.test", url: "https://example.test/reset?token=secret" });
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "127.0.0.1", port: 1025, secure: false }));
    expect(createTransport.mock.calls[0]?.[0]).not.toHaveProperty("auth");
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: "account@example.test", from: "noreply@epl.local", subject: expect.stringContaining("EPL") }));
  });
  it("submits OTP mail and excludes codes and provider contents from failure logs", async () => {
    sendMail.mockResolvedValueOnce({ messageId: "otp-test" });
    await sendOtpEmail({ to: "account@example.test", code: "012345", purpose: "login" });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ text: expect.stringContaining("012345"), html: expect.stringContaining("012345") }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    sendMail.mockRejectedValueOnce(new Error("sensitive code 654321"));
    await expect(sendOtpEmail({ to: "account@example.test", code: "654321", purpose: "enrollment" })).rejects.toThrow("Email delivery is unavailable");
    expect(JSON.stringify(log.mock.calls)).not.toContain("654321");
  });
  it("does not expose provider errors or reset tokens", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    sendMail.mockRejectedValueOnce(new Error("SMTP password=secret token=private"));
    await expect(sendPasswordResetEmail({ to: "account@example.test", url: "https://example.test/reset?token=private" })).rejects.toThrow("Email delivery is unavailable");
    expect(log).toHaveBeenCalledWith("SMTP email delivery failed");
    expect(JSON.stringify(log.mock.calls)).not.toContain("private");
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret");
  });
});
