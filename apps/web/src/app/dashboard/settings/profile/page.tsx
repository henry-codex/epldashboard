"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  IconMail,
  IconShieldLock,
  IconDeviceMobile,
  IconCheck,
  IconCamera,
  IconKey,
  IconUser,
} from "@tabler/icons-react";

export default function ProfileSettingsPage() {
  const { data: session } = authClient.useSession();
  const [mfaEnabled, setMfaEnabled] = useState(false);

  const name = session?.user?.name ?? "Administrator";
  const email = session?.user?.email ?? "—";
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="rm-page st-profile">
      <header className="rm-header">
        <div>
          <p className="rm-kicker">Settings · Account</p>
          <h1 className="rm-title">Personal profile</h1>
          <p className="rm-sub">Your identity and account security preferences for this session.</p>
        </div>
      </header>

      <section className="st-profile-hero">
        <div className="st-profile-avatar-wrap">
          <div className="st-profile-avatar">{initial}</div>
          <button type="button" className="st-profile-camera" aria-label="Change photo" disabled title="Coming soon">
            <IconCamera size={14} />
          </button>
        </div>
        <div className="st-profile-hero-text">
          <div className="st-profile-name-row">
            <h2>{name}</h2>
            <span className="rm-pill">
              <i style={{ background: "#4150A3" }} />
              Super Admin
            </span>
          </div>
          <p>EPL Global platform administration</p>
        </div>
      </section>

      <section className="rm-panel-section st-profile-card">
        <div className="rm-panel-section-head">
          <IconUser size={16} />
          <span>Identity</span>
        </div>
        <div className="st-profile-grid">
          <div className="epl-slide-field">
            <span>Full name</span>
            <div className="rm-autofill has-value">{name}</div>
          </div>
          <div className="epl-slide-field">
            <span>Email address</span>
            <div className="rm-autofill has-value st-email-row">
              <IconMail size={15} />
              {email}
            </div>
          </div>
        </div>
      </section>

      <section className="rm-panel-section st-profile-card">
        <div className="rm-panel-section-head">
          <IconShieldLock size={16} />
          <span>Security preferences</span>
        </div>

        <div className={`st-toggle-card${mfaEnabled ? " is-on" : ""}`}>
          <div className="st-toggle-left">
            <div className={`st-toggle-icon${mfaEnabled ? " is-on" : ""}`}>
              <IconDeviceMobile size={20} />
            </div>
            <div>
              <strong>Two-factor authentication</strong>
              <p>Require a second factor when signing in.</p>
            </div>
          </div>
          <button
            type="button"
            className={`st-switch${mfaEnabled ? " is-on" : ""}`}
            aria-pressed={mfaEnabled}
            onClick={() => setMfaEnabled((v) => !v)}
          >
            <span />
          </button>
        </div>

        <div className="st-inline-row">
          <div className="st-inline-left">
            <IconKey size={16} />
            <div>
              <strong>Password</strong>
              <p>Last changed · mock · 14 days ago</p>
            </div>
          </div>
          <button type="button" className="rm-ghost" disabled title="Coming soon">
            Reset password
          </button>
        </div>

        <div className="st-devices">
          <div className="rm-list-label">Recognized devices</div>
          <div className="st-device-row">
            <div className="st-device-left">
              <IconCheck size={16} color="#2EC27E" />
              <span>Apple MacBook Pro · Accra, GH</span>
            </div>
            <span className="rm-pill">
              <i style={{ background: "#2EC27E" }} />
              Active now
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
