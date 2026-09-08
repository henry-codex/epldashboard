import { MfaGate } from "@/components/epl/mfa-gate";
export default function DashboardLayout({ children }: { children: React.ReactNode }) { return <MfaGate>{children}</MfaGate>; }
