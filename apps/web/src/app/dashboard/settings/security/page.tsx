"use client";

import { SettingsLayout } from "@/components/epl/settings-layout";
import { 
  IconShieldLock, IconFingerprint, IconKey, IconDeviceMobile, 
  IconHistory, IconAlertCircle, IconCheck
} from "@tabler/icons-react";

const authLog = [
  { event: "Login Success", device: "Chrome / macOS", time: "2 hours ago", ip: "154.160.2.14" },
  { event: "Password Reset Request", device: "Safari / iPhone", time: "1 day ago", ip: "154.160.2.14" },
  { event: "Login Success", device: "Chrome / macOS", time: "3 days ago", ip: "192.168.1.5" },
  { event: "MFA Enabled", device: "System", time: "14 days ago", ip: "154.160.2.14" },
];

export default function SecuritySettingsPage() {
  return (
    <SettingsLayout activePage="security" pageTitle="Global Security Protocols">
      <div style={{ display: "flex", flexDirection: "column", gap: 32, paddingBottom: 60, maxWidth: 800 }}>
        
        {/* Security Overview Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
           <div style={{ 
              width: 60, height: 60, borderRadius: 16, background: "rgba(155,89,182,0.12)", 
              display: "flex", alignItems: "center", justifyContent: "center", color: "#AF7AC5"
           }}>
              <IconShieldLock size={32} />
           </div>
           <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--ewhite)", margin: 0 }}>
                 Security & Infrastructure
              </h1>
              <p style={{ fontSize: 14, color: "var(--emuted)", marginTop: 4 }}>
                 Protect your continental administrative account with advanced encryption and access controls.
              </p>
           </div>
        </div>

        {/* Dynamic Security Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
           <div className="gc hover-lift" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <IconKey size={28} color="#AF7AC5" />
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ewhite)" }}>Reset Security Key</div>
              <p style={{ fontSize: 12, color: "var(--emuted)", lineHeight: 1.5, margin: 0 }}>Rotate your master password and invalidate all active session tokens immediately.</p>
              <button style={{ 
                 marginTop: "auto", padding: "10px", borderRadius: 8, background: "rgba(255,255,255,0.05)", 
                 border: "1px solid rgba(255,255,255,0.1)", color: "var(--ewhite)", 
                 fontSize: 12, fontWeight: 700, cursor: "pointer" 
              }}>Rotate Key</button>
           </div>
           <div className="gc hover-lift" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <IconFingerprint size={28} color="#2EC27E" />
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--ewhite)" }}>Biometric Auth</div>
              <p style={{ fontSize: 12, color: "var(--emuted)", lineHeight: 1.5, margin: 0 }}>Enable WebAuthn for secure, hardware-level login using TouchID or FaceID devices.</p>
              <button style={{ 
                 marginTop: "auto", padding: "10px", borderRadius: 8, background: "rgba(46,194,126,0.15)", 
                 border: "1px solid rgba(46,194,126,0.3)", color: "#2EC27E", 
                 fontSize: 12, fontWeight: 700, cursor: "pointer" 
              }}>Configure Biometrics</button>
           </div>
        </div>

        {/* Global Access Log */}
        <div className="gc" style={{ padding: "30px", display: "flex", flexDirection: "column", gap: 20 }}>
           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <IconHistory size={20} color="var(--emuted)" />
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)" }}>Recent Access Activity</h3>
           </div>
           
           <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {authLog.map((log, i) => (
                <div key={i} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 20px", background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.04)"
                }}>
                   <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ 
                         width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.05)", 
                         display: "flex", alignItems: "center", justifyContent: "center", color: "#2EC27E"
                      }}>
                         <IconCheck size={16} />
                      </div>
                      <div>
                         <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)" }}>{log.event}</div>
                         <div style={{ fontSize: 11, color: "var(--emuted)", fontWeight: 500 }}>{log.device} • {log.ip}</div>
                      </div>
                   </div>
                   <div style={{ fontSize: 12, color: "var(--emuted)", fontWeight: 600 }}>{log.time}</div>
                </div>
              ))}
           </div>
           
           <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px", borderRadius: 12, background: "rgba(224,92,92,0.1)", border: "1px solid rgba(224,92,92,0.2)" }}>
              <IconAlertCircle size={18} color="#E05C5C" />
              <span style={{ fontSize: 11, color: "#E05C5C", fontWeight: 700 }}>Unrecognized login location detected in the last 30 days. Investigate immediately.</span>
              <button style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: "#E05C5C", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>View Alert</button>
           </div>
        </div>

      </div>
    </SettingsLayout>
  );
}
