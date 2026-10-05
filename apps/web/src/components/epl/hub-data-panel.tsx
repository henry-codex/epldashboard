"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconAlertTriangle, IconLoader2, IconTrash } from "@tabler/icons-react";
import { queryClient, trpc } from "@/utils/trpc";

const DANGER = "#E5484D";

const DELETED = [
  "Network roster — every fellow, placement and check-in",
  "Cohorts, Country Stats and MCF Stats",
  "Partners and placement institutions",
  "Alumni leaders and alumni executives",
  "Events and the hub activity feed",
];

const KEPT = [
  "The hub itself and its programs",
  "Custom network fields",
  "Country manager accounts and access",
  "The audit log (records who cleared the hub, and when)",
];

export function HubDataPanel({ tenantId, hubName }: { tenantId: string; hubName: string }) {
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toLowerCase() === hubName.trim().toLowerCase();

  const clearMutation = useMutation(
    trpc.fellows.clearHubData.mutationOptions({
      onSuccess: async (result) => {
        setTyped("");
        toast.success(`${hubName} cleared`, {
          description:
            `${result.fellowsDeleted} fellow(s), ${result.cohortsDeleted} cohort(s), ` +
            `${result.partnersDeleted} partner/institution record(s), ${result.eventsDeleted} event(s) and ` +
            `${result.alumniLeadersDeleted + result.alumniExecutivesDeleted} alumni leader record(s) removed.`,
        });
        // Every page of this hub shows something that just changed.
        await queryClient.invalidateQueries();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  return (
    <div className="gc" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18, border: `1px solid ${DANGER}40` }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ color: DANGER, marginTop: 2 }}>
          <IconAlertTriangle size={22} />
        </span>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            Clear all {hubName} data
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--emuted)", lineHeight: 1.5, fontFamily: "var(--font)" }}>
            Permanently deletes everything this hub has recorded so you can start again from a clean slate. This cannot be undone —
            export anything you need first.
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <ListCard title="Deleted" color={DANGER} items={DELETED} />
        <ListCard title="Kept" color="#2EC27E" items={KEPT} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (matches) clearMutation.mutate({ tenantId, confirmHubName: typed });
        }}
        style={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        <label htmlFor="clear-hub-confirm" style={{ fontSize: 13, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
          Type <strong>{hubName}</strong> to confirm
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            id="clear-hub-confirm"
            className="rm-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={hubName}
            autoComplete="off"
            style={{ flex: "1 1 220px", maxWidth: 360 }}
          />
          <button
            type="submit"
            className="rm-primary"
            disabled={!matches || clearMutation.isPending}
            style={{ background: DANGER }}
          >
            {clearMutation.isPending ? <IconLoader2 size={16} className="animate-spin" /> : <IconTrash size={16} />}
            Clear all hub data
          </button>
        </div>
      </form>
    </div>
  );
}

function ListCard({ title, color, items }: { title: string; color: string; items: string[] }) {
  return (
    <div style={{ padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, fontFamily: "var(--font)" }}>
        {title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((item) => (
          <li key={item} style={{ fontSize: 13, color: "var(--emuted)", lineHeight: 1.45, fontFamily: "var(--font)" }}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
