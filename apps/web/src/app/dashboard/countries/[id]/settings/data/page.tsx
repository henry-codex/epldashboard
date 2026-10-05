"use client";

import { HubDataPanel } from "@/components/epl/hub-data-panel";
import { useCountryHub } from "@/hooks/use-country-hub";

export default function CountrySettingsDataPage() {
  const { hub } = useCountryHub();

  if (!hub?.id) return null;

  return <HubDataPanel tenantId={hub.id} hubName={hub.name} />;
}
