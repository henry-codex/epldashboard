"use client";

import { useState } from "react";
import { SettingsLayout } from "@/components/epl/settings-layout";
import { authClient } from "@/lib/auth-client";
import { 
  IconUser, IconMail, IconShieldLock, IconDeviceMobile, 
  IconCheck, IconChevronRight, IconPencil, IconCamera
} from "@tabler/icons-react";

export default function ProfileSettingsPage() {
  const { data: session } = authClient.useSession();
  const [mfaEnabled, setMfaEnabled] = useState(false);

  return (
    <SettingsLayout activePage="profile" pageTitle="Personal Profile">
      <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60, maxWidth: 800 }}>
        
        {/* Profile Card */}
        <div className="gc" style={{ padding: "40px", position: "relative" }}>
           <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
              {/* Avatar Hub */}
              <div style={{ position: "relative" }}>
                 <div style={{
                    width: 100, height: 100, borderRadius: "50%",
                    background: "linear-gradient(135deg, rgba(155,89,182,0.4), rgba(155,89,182,0.8))",
                    border: "2px solid rgba(155,89,182,0.5)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 32, fontWeight: 800, color: "var(--ewhite)"
                 }}>
                    {session?.user?.name?.charAt(0) ?? "U"}
                 </div>
                 <button style={{
                    position: "absolute", bottom: 0, right: 0, 
                    width: 32, height: 32, borderRadius: "50%", 
                    background: "#9B59B6", border: "2px solid var(--gdark)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", cursor: "pointer", transition: "transform 0.2s"
                 }} onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.1)"} onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}>
                    <IconCamera size={16} />
                 </button>
              </div>

              <div style={{ flex: 1 }}>
                 <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: "var(--ewhite)", margin: 0 }}>
                       {session?.user?.name ?? "Fellow Administrator"}
                    </h2>
                    <span style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(155,89,182,0.15)", color: "#AF7AC5", fontSize: 10, fontWeight: 800, border: "1px solid rgba(155,89,182,0.2)" }}>
                       SUPER ADMIN
                    </span>
                 </div>
                 <div style={{ fontSize: 14, color: "var(--emuted)", fontWeight: 500 }}>
                    EPL Africa Continental Oversight team
                 </div>
              </div>
           </div>

           <div style={{ height: 1, width: "100%", background: "rgba(255,255,255,0.06)", margin: "30px 0" }} />

           {/* Personal Info Grid */}
           <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                 <label style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 700, letterSpacing: "1px" }}>FULL NAME</label>
                 <div className="gc" style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)" }}>{session?.user?.name}</span>
                    <IconPencil size={14} color="var(--emuted)" style={{ cursor: "pointer" }} />
                 </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                 <label style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 700, letterSpacing: "1px" }}>EMAIL ADDRESS</label>
                 <div className="gc" style={{ padding: "12px 16px", background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", gap: 12 }}>
                    <IconMail size={16} color="var(--emuted)" />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)" }}>{session?.user?.email}</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Security & MFA Section */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconShieldLock size={20} color="#9B59B6" />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)" }}>Security & Access Control</h3>
           </div>

           <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 24 }}>
              {/* MFA Toggle Card */}
              <div style={{ 
                 display: "flex", alignItems: "center", justifyContent: "space-between", 
                 padding: "20px", borderRadius: 16, background: mfaEnabled ? "rgba(46,194,126,0.05)" : "rgba(255,255,255,0.02)",
                 border: `1px solid ${mfaEnabled ? "rgba(46,194,126,0.2)" : "rgba(255,255,255,0.05)"}`,
                 transition: "all 0.3s"
              }}>
                 <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ 
                       width: 44, height: 44, borderRadius: 12, 
                       background: mfaEnabled ? "rgba(46,194,126,0.15)" : "rgba(255,255,255,0.05)",
                       display: "flex", alignItems: "center", justifyContent: "center",
                       color: mfaEnabled ? "#2EC27E" : "var(--emuted)"
                    }}>
                       <IconDeviceMobile size={22} />
                    </div>
                    <div>
                       <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ewhite)" }}>Two-Factor Authentication (MFA)</div>
                       <div style={{ fontSize: 12, color: "var(--emuted)", marginTop: 2 }}>Secure your account using a secondary verification device.</div>
                    </div>
                 </div>
                 
                 <div 
                    onClick={() => setMfaEnabled(!mfaEnabled)}
                    style={{ 
                       width: 54, height: 28, borderRadius: 20, 
                       background: mfaEnabled ? "#2EC27E" : "rgba(255,255,255,0.1)",
                       padding: 4, cursor: "pointer", transition: "background 0.3s",
                       display: "flex", alignItems: "center", position: "relative"
                    }}
                 >
                    <div style={{ 
                       width: 20, height: 20, borderRadius: "50%", background: "white",
                       transition: "transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
                       transform: mfaEnabled ? "translateX(26px)" : "translateX(0)"
                    }} />
                 </div>
              </div>

              {/* Password Management */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 10px" }}>
                 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#9B59B6" }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)" }}>Password Last Changed: 14 days ago</span>
                 </div>
                 <button style={{ 
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", 
                    padding: "8px 16px", borderRadius: 8, color: "var(--ewhite)", 
                    fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "background 0.2s"
                 }} onMouseOver={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.1)"} onMouseOut={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}>
                    Reset Password
                 </button>
              </div>

              <div style={{ height: 1, width: "100%", background: "rgba(255,255,255,0.06)" }} />

              {/* Auth devices */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                 <div style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 800, letterSpacing: "1px" }}>RECOGNIZED DEVICES</div>
                 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <IconCheck size={18} color="#2EC27E" />
                        <span style={{ fontSize: 13, color: "var(--ewhite)", fontWeight: 600 }}>Apple MacBook Pro • Accra, GH</span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--emuted)" }}>Active Now</span>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </SettingsLayout>
  );
}
