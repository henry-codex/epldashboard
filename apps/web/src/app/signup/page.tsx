import Link from "next/link";
import { AuthShell } from "@/components/epl/auth-shell";

export default function SignUpPage() {
  return <AuthShell><main className="gc account-recovery">
    <h1>An invitation is required</h1>
    <p>Ask your EPL administrator to invite you by email. Open that invitation to set up your account.</p>
    <Link href="/login" className="rm-primary">Back to sign in</Link>
  </main></AuthShell>;
}
