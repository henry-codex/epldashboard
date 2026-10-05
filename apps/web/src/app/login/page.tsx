import SignInForm from "@/components/sign-in-form";
import { safeMfaReturnPath } from "@epl-fellows-platform/auth/mfa-policy";
export const metadata = { title: "Sign in | EPL", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  return <SignInForm returnTo={safeMfaReturnPath(returnTo)} />;
}
