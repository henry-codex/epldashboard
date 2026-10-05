import type { Metadata } from "next";
import { AcceptInvitation } from "@/components/epl/accept-invitation";

export const metadata: Metadata = { title: "Accept your EPL invitation", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function AcceptInvitationPage({ searchParams }: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return <AcceptInvitation token={typeof token === "string" ? token : null} />;
}
