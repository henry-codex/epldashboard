import { MfaPage } from "@/components/epl/mfa";
import { safeMfaReturnPath } from "@epl-fellows-platform/auth/mfa-policy";
export const metadata = { title: "Verify MFA | EPL", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  return <MfaPage mode="verify" returnTo={safeMfaReturnPath(returnTo)} />;
}
