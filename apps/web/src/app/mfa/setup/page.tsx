import { MfaPage } from "@/components/epl/mfa";
import { safeMfaReturnPath } from "@epl-fellows-platform/auth/mfa-policy";
export const metadata = { title: "Set up MFA | EPL", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function SetupPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  return <MfaPage mode="setup" returnTo={safeMfaReturnPath(returnTo)} />;
}
