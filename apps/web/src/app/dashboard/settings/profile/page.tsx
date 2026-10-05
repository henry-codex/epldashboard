"use client";
import { ProfileSettingsPanel } from "@/components/epl/profile-settings-panel";
import { useHomePath } from "@/hooks/use-home-path";

export default function ProfileSettingsPage() {
  const home = useHomePath();
  return <ProfileSettingsPanel hubName={home.tenant?.name} />;
}
