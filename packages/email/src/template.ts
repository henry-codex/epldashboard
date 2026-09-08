export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function invitationMessage(data: { name: string; hubName: string; roleLabel: string; url: string }) {
  return {
    subject: "Your EPL dashboard invitation",
    text: `Hello ${data.name},\n\nYou have been invited to ${data.hubName} as ${data.roleLabel}. Open this link to accept your invitation:\n\n${data.url}\n\nThis link expires in 48 hours and can be used once. If you already have an EPL account, sign in with the invited email. Otherwise, you will choose your own password. If you did not expect this invitation, you can ignore it.`,
    html: `<h1>You are invited to EPL</h1><p>Hello ${escapeHtml(data.name)},</p><p>You have been invited to <strong>${escapeHtml(data.hubName)}</strong> as ${escapeHtml(data.roleLabel)}.</p><p><a href="${escapeHtml(data.url)}">Accept invitation</a></p><p>This link expires in 48 hours and can be used once. Existing users sign in with the invited email; new users choose their own password.</p><p>If you did not expect this invitation, you can ignore it.</p>`,
  };
}

export function passwordResetMessage(url: string) {
  return {
    subject: "Reset your EPL dashboard password",
    text: `Use this link to reset your EPL dashboard password:\n\n${url}\n\nThis link expires in one hour and can only be used once. Resetting your password signs out all devices. If you did not request this, you can ignore this email.`,
    html: `<h1>Reset your password</h1><p>Use the link below to reset your EPL dashboard password.</p><p><a href="${escapeHtml(url)}">Reset password</a></p><p>This link expires in one hour and can only be used once. Resetting your password signs out all devices.</p><p>If you did not request this, you can ignore this email.</p>`,
  };
}

export function emailOtpMessage(code: string, purpose: "login" | "enrollment") {
  const action = purpose === "login" ? "Complete your EPL sign-in" : "Enable EPL email verification";
  return {
    subject: action,
    text: `${action}\n\nYour verification code is: ${code}\n\nThis code expires in five minutes and works once in the browser that requested it. Never share it. If you did not request this, ignore this message.`,
    html: `<h1>${action}</h1><p>Your verification code is:</p><p style="font-size:28px;letter-spacing:6px;font-weight:bold">${escapeHtml(code)}</p><p>This code expires in five minutes and works once in the browser that requested it. Never share it.</p><p>If you did not request this, ignore this message.</p>`,
  };
}