"use client";

import { toast } from "sonner";
import {
  IconShieldLock,
  IconFingerprint,
  IconKey,
  IconHistory,
  IconAlertCircle,
  IconCheck,
  IconLock,
} from "@tabler/icons-react";

const authLog = [
  { event: "Login success", device: "Chrome / macOS", time: "2 hours ago", ip: "154.160.2.14", ok: true },
  { event: "Password reset request", device: "Safari / iPhone", time: "1 day ago", ip: "154.160.2.14", ok: true },
  { event: "Login success", device: "Chrome / macOS", time: "3 days ago", ip: "192.168.1.5", ok: true },
  { event: "MFA enabled", device: "System", time: "14 days ago", ip: "154.160.2.14", ok: true },
];

export default function SecuritySettingsPage() {
  return (
    <div className="rm-page">
      <header className="rm-header">
        <div>
          <p className="rm-kicker">Settings · Security</p>
          <h1 className="rm-title">Security</h1>
          <p className="rm-sub">
            Session controls and access history for your administrative account.
          </p>
        </div>
      </header>

      <div className="st-sec-grid">
        <article className="st-sec-card">
          <div className="st-sec-icon" style={{ color: "#8B9AE8", background: "rgba(65,80,163,0.15)" }}>
            <IconKey size={22} />
          </div>
          <h3>Reset security key</h3>
          <p>Rotate your master password and sign out other active sessions.</p>
          <button
            type="button"
            className="rm-ghost"
            onClick={() => toast.message("Password rotation will plug into Better Auth next.")}
          >
            Rotate key
          </button>
        </article>

        <article className="st-sec-card">
          <div className="st-sec-icon" style={{ color: "#2EC27E", background: "rgba(46,194,126,0.12)" }}>
            <IconFingerprint size={22} />
          </div>
          <h3>Biometric auth</h3>
          <p>WebAuthn / passkeys for hardware-backed sign-in (Touch ID, Face ID, keys).</p>
          <button
            type="button"
            className="rm-primary"
            style={{ alignSelf: "flex-start", height: 36, boxShadow: "none" }}
            onClick={() => toast.message("Passkeys coming in a later phase.")}
          >
            Configure
          </button>
        </article>

        <article className="st-sec-card">
          <div className="st-sec-icon" style={{ color: "#E8A020", background: "rgba(232,160,32,0.12)" }}>
            <IconLock size={22} />
          </div>
          <h3>Session lockdown</h3>
          <p>Invalidate all browsers except this one. Useful after shared-device access.</p>
          <button
            type="button"
            className="rm-ghost"
            onClick={() => toast.message("Session revoke will use Better Auth sessions.")}
          >
            Sign out others
          </button>
        </article>
      </div>

      <section className="rm-panel-section st-profile-card">
        <div className="rm-panel-section-head">
          <IconHistory size={16} />
          <span>Recent access activity</span>
        </div>

        <div className="st-alert">
          <IconAlertCircle size={18} />
          <span>Unrecognized login location in the last 30 days (sample data).</span>
          <button type="button" onClick={() => toast.message("Alert detail coming soon.")}>
            View
          </button>
        </div>

        <div className="st-log-list">
          {authLog.map((log) => (
            <div key={`${log.event}-${log.time}`} className="st-log-row">
              <div className="st-log-icon">
                <IconCheck size={15} />
              </div>
              <div className="st-log-body">
                <strong>{log.event}</strong>
                <p>
                  {log.device} · {log.ip}
                </p>
              </div>
              <span className="st-log-time">{log.time}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="st-footnote">
        <IconShieldLock size={14} />
        Activity list is illustrative until auth session logs are wired to the API.
      </p>
    </div>
  );
}
