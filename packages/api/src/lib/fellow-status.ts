/**
 * Lifecycle status for a fellow record.
 *
 * "incoming" covers people who have been recruited into a cohort but
 * haven't started yet (source sheets call this "New Recruits"). It's kept
 * distinct from "inactive" (which means someone left/dropped out) and is
 * excluded from Active Fellows / Alumni Leaders / Total Network counts —
 * they only join those once the cohort actually starts.
 */
export const FELLOW_STATUSES = ["incoming", "active", "alumni", "inactive"] as const;
export type FellowStatus = (typeof FELLOW_STATUSES)[number];
