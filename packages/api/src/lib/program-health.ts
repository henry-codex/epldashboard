export type ProgramHealthStatus =
  | "on_track"
  | "needs_attention"
  | "at_risk"
  | "getting_started"
  | "completed";

export type ProgramHealthInput = {
  programStatus: "active" | "completed" | "planned";
  activeFellows: number;
  targetFellows: number;
  fillRate: number | null;
  checkInRate: number | null;
  placementRate: number | null;
  activeFellowsWithCheckIns: number;
  activeFellowsWithPlacements: number;
};

export type ProgramHealthResult = {
  health: ProgramHealthStatus;
  label: string;
  reasons: string[];
  fillRate: number | null;
  checkInRate: number | null;
  placementRate: number | null;
};

const LABELS: Record<ProgramHealthStatus, string> = {
  on_track: "On track",
  needs_attention: "Needs attention",
  at_risk: "At risk",
  getting_started: "Getting started",
  completed: "Completed",
};

export function computeProgramHealth(input: ProgramHealthInput): ProgramHealthResult {
  const reasons: string[] = [];
  let health: ProgramHealthStatus = "on_track";

  if (input.programStatus === "completed") {
    return {
      health: "completed",
      label: LABELS.completed,
      reasons: ["Program marked as completed"],
      fillRate: input.fillRate,
      checkInRate: input.checkInRate,
      placementRate: input.placementRate,
    };
  }

  if (input.programStatus === "planned" && input.activeFellows === 0) {
    return {
      health: "getting_started",
      label: LABELS.getting_started,
      reasons: ["Program is planned — fellows not enrolled yet"],
      fillRate: input.fillRate,
      checkInRate: input.checkInRate,
      placementRate: input.placementRate,
    };
  }

  const earlyStage =
    input.activeFellows > 0 && input.checkInRate === null && input.placementRate === null;

  if (input.targetFellows > 0) {
    const fill = input.fillRate ?? Math.round((input.activeFellows / input.targetFellows) * 100);
    if (input.activeFellows === 0) {
      health = "needs_attention";
      reasons.push(`Roster empty — 0 of ${input.targetFellows} target fellows`);
    } else if (fill < 70 && earlyStage) {
      // New hubs often have a high target and a small early roster — not a crisis yet.
      health = "getting_started";
      reasons.push(
        `Building roster — ${input.activeFellows} of ${input.targetFellows} target (${fill}%)`,
      );
    } else if (fill < 40) {
      health = "at_risk";
      reasons.push(`Low roster fill — ${input.activeFellows} of ${input.targetFellows} target (${fill}%)`);
    } else if (fill < 70) {
      health = bumpSeverity(health, "needs_attention");
      reasons.push(`Below target fill — ${input.activeFellows} of ${input.targetFellows} (${fill}%)`);
    }
  } else if (input.activeFellows === 0 && input.programStatus === "active") {
    health = bumpSeverity(health, "needs_attention");
    reasons.push("Active program has no fellows enrolled yet");
  }

  if (
    reasons.length === 0 ||
    (reasons.every((r) => r.startsWith("Building roster")) &&
      (health === "on_track" || health === "getting_started"))
  ) {
    if (health === "on_track") reasons.unshift("Roster and targets look healthy");
  }

  return {
    health,
    label: LABELS[health],
    reasons,
    fillRate: input.fillRate,
    checkInRate: input.checkInRate,
    placementRate: input.placementRate,
  };
}

function bumpSeverity(current: ProgramHealthStatus, next: ProgramHealthStatus): ProgramHealthStatus {
  const rank: Record<ProgramHealthStatus, number> = {
    on_track: 0,
    getting_started: 0,
    needs_attention: 1,
    at_risk: 2,
    completed: 0,
  };
  return rank[next] > rank[current] ? next : current;
}

export function healthPillClass(health: ProgramHealthStatus) {
  if (health === "on_track") return "pm-health-pill is-on-track";
  if (health === "needs_attention") return "pm-health-pill is-needs-attention";
  if (health === "at_risk") return "pm-health-pill is-at-risk";
  if (health === "completed") return "pm-health-pill is-completed";
  return "pm-health-pill is-getting-started";
}
