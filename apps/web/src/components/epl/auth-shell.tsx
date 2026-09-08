"use client";

import { useTheme } from "@/hooks/use-theme";

interface Props {
  children: React.ReactNode;
  wide?: boolean;
}

export function AuthShell({ children, wide = false }: Props) {
  const { theme } = useTheme();

  return (
    <div className={`epl-shell epl-auth-shell${wide ? " epl-auth-shell--wide" : ""}${theme === "light" ? " epl-light" : ""}`}>
      {/* Ambient orbs */}
      <div className="epl-orb" style={{ width: 600, height: 600, top: "-10%", left: "-10%", background: "rgba(59,139,235,0.15)", zIndex: 0 }} />
      <div className="epl-orb" style={{ width: 500, height: 500, bottom: "-5%", right: "-5%", background: "rgba(155,89,182,0.12)", zIndex: 0 }} />
      <div className="epl-orb" style={{ width: 300, height: 300, top: "40%", right: "15%", background: "rgba(46,194,126,0.10)", zIndex: 0 }} />

      <div className="epl-auth-content">
        {children}
      </div>
    </div>
  );
}
