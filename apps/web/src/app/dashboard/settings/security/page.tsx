"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconDevices, IconLoader2 } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage, deviceDescription } from "@/lib/account-settings";
import { MfaSecuritySection } from "@/components/epl/mfa";
import { ChangePasswordSection } from "@/components/epl/change-password-form";
import { useConfirm } from "@/components/epl/confirm-dialog";
import { queryClient } from "@/utils/trpc";

type Session = NonNullable<Awaited<ReturnType<typeof authClient.listSessions>>["data"]>[number];
type DisplaySession = Omit<Session, "token">;
function formatDate(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}

export default function SecuritySettingsPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const { data: current, refetch } = authClient.useSession();
  const [sessions, setSessions] = useState<DisplaySession[]>([]);
  const tokens = useRef(new Map<string, string>());
  const requestVersion = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError(null);
    try {
      const response = await authClient.listSessions();
      if (version !== requestVersion.current) return;
      if (response.error) {
        setError(authErrorMessage(response.error, "Could not load sessions"));
        tokens.current.clear(); setSessions([]);
        if (response.error.status === 401) { queryClient.clear(); router.replace("/login"); }
        return;
      }
      const nextTokens = new Map<string, string>();
      const rows = (response.data ?? []).map(({ token, ...session }) => { nextTokens.set(session.id, token); return session; });
      tokens.current = nextTokens;
      setSessions(rows);
    } catch {
      if (version === requestVersion.current) { tokens.current.clear(); setSessions([]); setError("Could not reach the server. Please try again."); }
    } finally { if (version === requestVersion.current) setLoading(false); }
  }, [router]);

  useEffect(() => {
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { requestVersion.current++; tokens.current.clear(); window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  async function revoke(id: string) {
    if (busy) return;
    const allOthers = id === "others";
    const thisDevice = id === current?.session.id;
    const accepted = await confirm({
      title: allOthers ? "Sign out other devices?" : thisDevice ? "Sign out of this device?" : "Sign out this session?",
      message: allOthers ? "All other browsers and devices will need to sign in again." : "This session will end and will need to sign in again.",
      confirmLabel: "Sign out", danger: true,
    });
    if (!accepted) return;
    setBusy(id); setError(null);
    try {
      const token = tokens.current.get(id);
      if (!allOthers && !thisDevice && !token) { await refresh(); return; }
      const result = thisDevice ? await authClient.signOut() : allOthers ? await authClient.revokeOtherSessions() : await authClient.revokeSession({ token: token! });
      if (result.error) {
        setError(authErrorMessage(result.error, "Could not sign out the session"));
        if (result.error.status === 401) { queryClient.clear(); router.replace("/login"); }
        return;
      }
      if (thisDevice) { tokens.current.clear(); queryClient.clear(); router.replace("/login"); return; }
      toast.success(allOthers ? "Other devices signed out" : "Session signed out");
      await refresh();
    } catch { setError("Could not reach the server. Please try again."); }
    finally { setBusy(null); }
  }

  async function passwordChanged() { await refetch(); await refresh(); }
  const otherCount = sessions.filter((session) => session.id !== current?.session.id).length;

  return (
    <div className="rm-page">
      <header className="rm-header"><div>
        <p className="rm-kicker">Settings · Security</p><h1 className="rm-title">Security</h1>
        <p className="rm-sub">Manage your password and the devices signed in to your account.</p>
      </div></header>
      <MfaSecuritySection onChanged={passwordChanged} />
      <ChangePasswordSection onChanged={passwordChanged} />
      <section className="rm-panel-section st-profile-card">
        <div className="rm-panel-section-head"><IconDevices size={16} /><span>Active sessions</span></div>
        <div className="account-actions">
          <button type="button" className="rm-ghost" onClick={() => { void refresh(); }} disabled={loading || Boolean(busy)}>Refresh sessions</button>
          <button type="button" className="rm-ghost" onClick={() => { void revoke("others"); }} disabled={loading || Boolean(busy) || !current || otherCount === 0}>Sign out other devices</button>
        </div>
        {loading && <p role="status"><IconLoader2 size={16} className="animate-spin" /> Loading sessions…</p>}
        {error && <p role="alert" className="rm-state-error">{error}</p>}
        {!loading && !error && sessions.length === 0 && <p>No active sessions were found. Refresh or sign in again.</p>}
        {!loading && !error && <ul className="account-sessions">
          {sessions.map((session) => (
            <li key={session.id} className="account-session">
              <div className="account-session-details">
                <strong>{deviceDescription(session.userAgent)}</strong>
                {session.id === current?.session.id && <span className="rm-pill">This device</span>}
                <p>IP address: {session.ipAddress || "Unavailable"}</p>
                <p>Signed in: {formatDate(session.createdAt)}</p>
                <p>Expires: {formatDate(session.expiresAt)}</p>
              </div>
              <button type="button" className="rm-ghost" onClick={() => { void revoke(session.id); }} disabled={Boolean(busy)}>
                {busy === session.id ? "Signing out…" : session.id === current?.session.id ? "Sign out this device" : "Sign out session"}
              </button>
            </li>
          ))}
        </ul>}
      </section>
    </div>
  );
}
