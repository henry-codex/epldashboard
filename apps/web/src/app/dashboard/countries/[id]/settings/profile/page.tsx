"use client";

import { ProfileSettingsPanel } from "@/components/epl/profile-settings-panel";
import { useCountryHub } from "@/hooks/use-country-hub";

export default function CountrySettingsProfilePage() {
  const { hub } = useCountryHub();

  return <ProfileSettingsPanel hubName={hub?.name} />;
}
