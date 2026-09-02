import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

/** Check-ins UI is hidden; old bookmarks land on the hub overview. */
export default async function CountryCheckinsPage({ params }: Props) {
  const { id } = await params;
  redirect(`/dashboard/countries/${id}`);
}
