"use client";

import { UsersManagementPanel } from "@/components/epl/users-management-panel";
import { useCountryHub } from "@/hooks/use-country-hub";

export default function CountrySettingsUsersPage() {
  const { hub } = useCountryHub();

  if (!hub?.id) return null;

  return (
    <UsersManagementPanel tenantId={hub.id} hubName={hub.name} />
  );
}
