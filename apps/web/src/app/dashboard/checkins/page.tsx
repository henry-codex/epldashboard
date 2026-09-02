import { redirect } from "next/navigation";

/** Check-ins UI is hidden; old bookmarks land on the platform overview. */
export default function CheckInsPage() {
  redirect("/dashboard");
}
