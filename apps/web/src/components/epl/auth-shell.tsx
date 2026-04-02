"use client";

import { useTheme } from "@/hooks/use-theme";

interface Props {
  children: React.ReactNode;
}

export function AuthShell({ children }: Props) {
  const { theme } = useTheme();

  return (
    <div className={`epl-shell${theme === "light" ? " epl-light" : ""}`} style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      padding: "20px"
    }}>
      {/* Ambient orbs */}
      <div className="epl-orb" style={{ width: 600, height: 600, top: "-10%", left: "-10%", background: "rgba(59,139,235,0.15)", zIndex: 0 }} />
      <div className="epl-orb" style={{ width: 500, height: 500, bottom: "-5%", right: "-5%", background: "rgba(155,89,182,0.12)", zIndex: 0 }} />
      <div className="epl-orb" style={{ width: 300, height: 300, top: "40%", right: "15%", background: "rgba(46,194,126,0.10)", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440 }}>
        {children}
      </div>
    </div>
  );
}
