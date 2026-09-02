import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CountryMediaRedirectPage({ params }: Props) {
  const { id } = await params;
  redirect(`/dashboard/countries/${id}/settings/profile`);
}
