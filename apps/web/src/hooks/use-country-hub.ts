"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { COUNTRIES_MAP, type CountryId } from "@/lib/mock-data";
import { trpc } from "@/utils/trpc";
import { resolveIso2 } from "@/lib/world-countries";

export type CountryHubMeta = {
  id: string;
  name: string;
  color: string;
  countryCode: string;
  flagSrc: string;
  fellows: number;
  alumni: number;
  institutions: number;
  activePrograms: number;
  isLive: boolean;
  isEmpty: boolean;
};

export function useCountryHub() {
  const params = useParams();
  const id = (params?.id as string) ?? "";
  const mock = COUNTRIES_MAP[id as CountryId];

  const liveQuery = useQuery({
    ...trpc.tenants.get.queryOptions({ id }),
    enabled: Boolean(id) && !mock,
    retry: false,
  });

  if (mock) {
    const hub: CountryHubMeta = {
      id,
      name: mock.name,
      color: mock.color,
      countryCode: id.toUpperCase(),
      flagSrc: `https://flagcdn.com/${id}.svg`,
      fellows: mock.fellows,
      alumni: mock.alumni,
      institutions: mock.institutions,
      activePrograms: mock.activePrograms,
      isLive: false,
      isEmpty: false,
    };
    return { id, hub, mock, isLoading: false, isError: false, error: null as Error | null };
  }

  const live = liveQuery.data;
  const hub: CountryHubMeta | null = live
    ? {
        id: live.id,
        name: live.name,
        color: live.color,
        countryCode: live.countryCode,
        flagSrc: (() => {
          const iso2 = resolveIso2({
            countryCode: live.countryCode,
            iso2: live.iso2,
            flag: live.flag,
          });
          return iso2 ? `https://flagcdn.com/${iso2.toLowerCase()}.svg` : "";
        })(),
        fellows: 0,
        alumni: 0,
        institutions: 0,
        activePrograms: 0,
        isLive: true,
        isEmpty: true,
      }
    : null;

  return {
    id,
    hub,
    mock: null,
    isLoading: liveQuery.isLoading,
    isError: liveQuery.isError,
    error: liveQuery.error,
  };
}
