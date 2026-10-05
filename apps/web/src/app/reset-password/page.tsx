import { PasswordRecovery } from "@/components/epl/password-recovery";

export default async function ResetPasswordPage({ searchParams }: {
  searchParams: Promise<{ token?: string | string[]; error?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;
  return <PasswordRecovery mode="reset" token={token} invalidLink={Boolean(params.error) || !token} />;
}
