import nodemailer, { type SendMailOptions } from "nodemailer";
import { env } from "@epl-fellows-platform/env/server";
import { passwordResetMessage, invitationMessage, emailOtpMessage } from "./template";

export function assertEmailConfiguration() {
  if (env.NODE_ENV === "production" && (!env.SMTP_HOST || !env.SMTP_FROM_EMAIL)) {
    throw new Error("Configure SMTP_HOST and SMTP_FROM_EMAIL before starting production email delivery");
  }
  if (Boolean(env.SMTP_USER) !== Boolean(env.SMTP_PASS)) {
    throw new Error("Configure both SMTP_USER and SMTP_PASS, or omit both for an unauthenticated relay");
  }
}

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

export function getTransporter() {
  assertEmailConfiguration();
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST ?? "127.0.0.1",
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASS ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}),
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

export type SendEmailOptions = SendMailOptions;

export async function sendEmail(options: SendEmailOptions) {
  try {
    const info = await getTransporter().sendMail({ ...options, from: options.from ?? env.SMTP_FROM_EMAIL ?? "noreply@epl.local" });
    console.info("Email delivery accepted by SMTP server");
    return { success: true, messageId: String(info.messageId) };
  } catch {
    // Provider errors can contain credentials, recipient addresses, and message content.
    console.error("SMTP email delivery failed");
    throw new Error("Email delivery is unavailable");
  }
}

export async function sendPasswordResetEmail({ to, url }: { to: string; url: string }) {
  return sendEmail({ to, ...passwordResetMessage(url) });
}

export async function sendInvitationEmail(data: { to: string; name: string; hubName: string; roleLabel: string; url: string }) {
  return sendEmail({ to: data.to, ...invitationMessage(data) });
}

export async function sendOtpEmail(data: { to: string; code: string; purpose: "login" | "enrollment" }) {
  return sendEmail({ to: data.to, ...emailOtpMessage(data.code, data.purpose) });
}

export async function verifyEmailConnection() {
  try {
    await getTransporter().verify();
    return true;
  } catch {
    console.error("SMTP connection verification failed");
    return false;
  }
}
