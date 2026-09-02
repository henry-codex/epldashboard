"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** By Cohort continental audit removed — use country hub Cohorts for timeline tracking. */
export default function ReportsByCohortRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/reports");
  }, [router]);
  return null;
}
