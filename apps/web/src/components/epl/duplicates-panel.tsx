"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconCheck, IconLoader2, IconPhone, IconUserSearch } from "@tabler/icons-react";
import { SlidePanel } from "@/components/epl/slide-panel";
import { useConfirm } from "@/components/epl/confirm-dialog";
import { trpc } from "@/utils/trpc";

type Props = {
  open: boolean;
  onClose: () => void;
  onMerged: () => Promise<void>;
  tenantId: string;
  hubName: string;
};

export function DuplicatesPanel({ open, onClose, onMerged, tenantId, hubName }: Props) {
  const confirm = useConfirm();
  const duplicatesQuery = useQuery({ ...trpc.fellows.duplicates.queryOptions({ tenantId }), enabled: open });
  const mergeMutation = useMutation(trpc.fellows.merge.mutationOptions());
  const groups = duplicatesQuery.data?.groups ?? [];

  async function keepOne(keepId: string, others: { id: string }[], keepName: string) {
    const ok = await confirm({
      title: `Keep ${keepName} and merge ${others.length} other record${others.length === 1 ? "" : "s"} into it?`,
      message:
        "The kept record's details win; anything it's missing (email, phone, demographics…) is filled from the others. " +
        "Placements and check-ins move across, and the other records are deleted. This can't be undone.",
      confirmLabel: "Merge",
      danger: true,
    });
    if (!ok) return;
    try {
      for (const other of others) {
        await mergeMutation.mutateAsync({ tenantId, keepId, removeId: other.id });
      }
      toast.success(`Merged into ${keepName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Merge failed");
    }
    await onMerged();
    await duplicatesQuery.refetch();
  }

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Possible duplicates"
      description={`${hubName} · same name in the same cohort, or the same phone number`}
      width={640}
    >
      {duplicatesQuery.isLoading ? (
        <div className="rm-state">Looking for duplicates…</div>
      ) : duplicatesQuery.isError ? (
        <div className="rm-state rm-state-error">{duplicatesQuery.error.message}</div>
      ) : groups.length === 0 ? (
        <div className="rm-state">No likely duplicates in this hub's roster.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <p className="rm-panel-hint" style={{ margin: 0 }}>
            These are suggestions — two different people can share a name. Pick the record to keep in each group; leave a group
            alone if they're different people.
          </p>
          {groups.map((group) => (
            <section key={`${group.reason}:${group.key}`} className="rm-panel-section">
              <div className="rm-panel-section-head">
                {group.reason === "phone" ? <IconPhone size={16} /> : <IconUserSearch size={16} />}
                {group.reason === "phone"
                  ? "Same phone number"
                  : `Same name${group.fellows[0]?.cohortYear != null ? ` · cohort ${group.fellows[0].cohortYear}` : ""}`}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {group.fellows.map((fellow) => {
                  const name = `${fellow.firstName} ${fellow.lastName}`.trim();
                  return (
                    <div
                      key={fellow.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: "1px solid var(--eborder)",
                        fontFamily: "var(--font)",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)" }}>{name}</div>
                        <div style={{ fontSize: 12, color: "var(--emuted)", marginTop: 2, overflowWrap: "anywhere" }}>
                          {[fellow.email ?? "no email", fellow.phone ?? "no phone", fellow.status, fellow.cohortYear ?? "no cohort", fellow.program]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rm-ghost"
                        style={{ height: 34, fontSize: 12, flexShrink: 0 }}
                        disabled={mergeMutation.isPending}
                        onClick={() => void keepOne(fellow.id, group.fellows.filter((f) => f.id !== fellow.id), name)}
                      >
                        {mergeMutation.isPending ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={14} />}
                        Keep this one
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </SlidePanel>
  );
}
