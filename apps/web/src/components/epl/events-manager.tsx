"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconPlus,
  IconLoader2,
  IconPencil,
  IconTrash,
  IconCheck,
  IconCalendarEvent,
  IconMapPin,
  IconLink,
  IconSearch,
  IconList,
  IconCalendar,
  IconClock,
  IconHistory,
  IconEye,
  IconWorld,
} from "@tabler/icons-react";
import { SlidePanel } from "@/components/epl/slide-panel";
import { CountrySectionEmpty } from "@/components/epl/country-section-empty";
import { EventsCalendar, formatEventWhen } from "@/components/epl/events-calendar";
import { queryClient, trpc } from "@/utils/trpc";

type EventRow = {
  id: string;
  tenantId?: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  onlineUrl: string | null;
  isOnline: boolean;
  isUpcoming: boolean;
  isGlobal?: boolean;
  timeframe: "upcoming" | "past";
};

type EventForm = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  onlineUrl: string;
};

const EMPTY_FORM: EventForm = {
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  venue: "",
  onlineUrl: "",
};

type Props = {
  tenantId: string;
  hubName: string;
  accent: string;
  readOnly?: boolean;
  isSuperAdmin?: boolean;
};

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  size?: "md" | "lg";
}) {
  return (
    <div className={`ev-seg${size === "lg" ? " is-lg" : ""}`}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`ev-seg-btn${active ? " is-active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultStartsAt() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return toDatetimeLocal(date.toISOString());
}

function formatDateBadge(startsAt: string) {
  const date = new Date(startsAt);
  return {
    day: date.getDate(),
    month: date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
    monthDay: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  };
}

function formatEventTimeShort(startsAt: string, endsAt: string | null) {
  const start = new Date(startsAt);
  const time = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!endsAt) return time;
  const end = new Date(endsAt);
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (start.toDateString() === end.toDateString()) return `${time} – ${endTime}`;
  return `${time} → ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${endTime}`;
}

function EventListRow({
  event,
  accent,
  readOnly,
  isSuperAdmin,
  onView,
  onEdit,
  onDelete,
}: {
  event: EventRow;
  accent: string;
  readOnly: boolean;
  isSuperAdmin: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const badge = formatDateBadge(event.startsAt);
  const isGlobal = Boolean(event.isGlobal);
  const itemAccent = isGlobal ? "#3B8BEB" : accent;
  const canModify = !readOnly && (!isGlobal || isSuperAdmin);

  return (
    <article
      className="ev-list-row"
      style={{
        borderLeft: isGlobal ? "3px solid #3B8BEB" : undefined,
      }}
      onClick={onView}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="ev-list-badge" style={{ background: `${itemAccent}14`, borderColor: `${itemAccent}40` }}>
        <span style={{ color: itemAccent }}>{badge.month}</span>
        <strong>{badge.day}</strong>
      </div>

      <div className="ev-list-main">
        <div className="ev-list-title-row">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h3>{event.title}</h3>
            {isGlobal && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "rgba(59,139,235,0.18)",
                  color: "#60A5FA",
                  border: "1px solid rgba(59,139,235,0.35)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: "var(--font)",
                }}
              >
                <IconWorld size={11} /> Global Event
              </span>
            )}
          </div>
          {!event.isUpcoming && <span className="nm-status-pill is-inactive">Past</span>}
        </div>
        <p className="ev-list-meta" style={{ color: itemAccent }}>
          {badge.weekday} · {badge.monthDay} · {formatEventTimeShort(event.startsAt, event.endsAt)}
          {isGlobal && " · Organized by Global"}
        </p>
        {event.description ? <p className="ev-list-desc">{event.description}</p> : null}
        {(event.venue || event.onlineUrl || isGlobal) && (
          <div className="ev-list-tags">
            {isGlobal && (
              <span className="rm-pill" style={{ borderColor: "rgba(59,139,235,0.3)", color: "#60A5FA" }}>
                EPL Global
              </span>
            )}
            {event.venue ? (
              <span className="rm-pill">
                <IconMapPin size={12} /> {event.venue}
              </span>
            ) : null}
            {event.onlineUrl ? (
              <span className="rm-pill" style={{ color: "#2563eb" }}>
                <IconLink size={12} /> Online
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div className="ev-list-actions nm-row-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="nm-row-action" onClick={onView}>
          <IconEye size={14} /> View
        </button>
        {canModify && (
          <>
            <button type="button" className="nm-row-action" onClick={onEdit}>
              <IconPencil size={14} /> Edit
            </button>
            <button
              type="button"
              className="nm-row-action is-danger"
              aria-label="Delete event"
              onClick={onDelete}
            >
              <IconTrash size={14} />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function EventViewPanel({
  event,
  hubName,
  accent,
  readOnly,
  isSuperAdmin,
  open,
  onClose,
  onEdit,
  onDelete,
}: {
  event: EventRow | null;
  hubName: string;
  accent: string;
  readOnly: boolean;
  isSuperAdmin: boolean;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  if (!event) return null;
  const badge = formatDateBadge(event.startsAt);
  const isGlobal = Boolean(event.isGlobal);
  const itemAccent = isGlobal ? "#3B8BEB" : accent;
  const canModify = !readOnly && (!isGlobal || isSuperAdmin);

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="Event details"
      description={isGlobal ? "Global Event — EPL Global Platform" : `${hubName} Event`}
      width={520}
      footer={
        <div className="epl-slide-actions">
          <button type="button" className="rm-ghost" onClick={onClose}>
            Close
          </button>
          {canModify && (
            <>
              <button type="button" className="nm-row-action is-danger" onClick={onDelete}>
                <IconTrash size={14} /> Delete
              </button>
              <button type="button" className="rm-primary" onClick={onEdit}>
                <IconPencil size={15} /> Edit event
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="rm-panel-form">
        {isGlobal && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "rgba(59,139,235,0.12)",
              border: "1px solid rgba(59,139,235,0.3)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <IconWorld size={20} style={{ color: "#60A5FA", flexShrink: 0 }} />
            <div style={{ fontSize: 12, color: "#93C5FD", fontFamily: "var(--font)", lineHeight: 1.4 }}>
              <strong>Continental Global Event:</strong> This session was organized by EPL Global Platform and is synchronized across all country hubs.
            </div>
          </div>
        )}

        <section className="st-profile-hero" style={{ marginBottom: 8 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: `${itemAccent}14`,
              border: `1px solid ${itemAccent}35`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              lineHeight: 1.05,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: itemAccent, fontFamily: "var(--font)" }}>{badge.month}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>{badge.day}</div>
          </div>
          <div className="st-profile-hero-text">
            <div className="st-profile-name-row">
              <h2>{event.title}</h2>
              {!event.isUpcoming && <span className="nm-status-pill is-alumni">Past</span>}
            </div>
            <p>{badge.weekday} · {formatEventWhen(event.startsAt, event.endsAt)}</p>
          </div>
        </section>

        {event.description && (
          <section className="rm-panel-section st-profile-card">
            <div className="rm-panel-section-head">
              <IconCalendarEvent size={16} />
              <span>About</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "var(--emuted)", lineHeight: 1.6, fontFamily: "var(--font)" }}>
              {event.description}
            </p>
          </section>
        )}

        <section className="rm-panel-section st-profile-card">
          <div className="rm-panel-section-head">
            <IconClock size={16} />
            <span>Schedule</span>
          </div>
          <div className="epl-slide-field">
            <span>When</span>
            <div className="rm-autofill has-value">{formatEventWhen(event.startsAt, event.endsAt)}</div>
          </div>
        </section>

        {(event.venue || event.onlineUrl) && (
          <section className="rm-panel-section st-profile-card">
            <div className="rm-panel-section-head">
              <IconMapPin size={16} />
              <span>Location</span>
            </div>
            {event.venue && (
              <div className="epl-slide-field">
                <span>Venue</span>
                <div className="rm-autofill has-value">{event.venue}</div>
              </div>
            )}
            {event.onlineUrl && (
              <div className="epl-slide-field">
                <span>Online link</span>
                <a
                  href={event.onlineUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#3B8BEB", fontWeight: 700, fontSize: 13, fontFamily: "var(--font)" }}
                >
                  {event.onlineUrl}
                </a>
              </div>
            )}
          </section>
        )}
      </div>
    </SlidePanel>
  );
}

export function EventsManager({
  tenantId,
  hubName,
  accent,
  readOnly = false,
  isSuperAdmin = false,
}: Props) {
  const now = new Date();
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewEvent, setViewEvent] = useState<EventRow | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [listTab, setListTab] = useState<"upcoming" | "past">("upcoming");
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());

  const listQuery = useQuery(
    trpc.events.list.queryOptions({
      tenantId,
      timeframe: viewMode === "calendar" ? "all" : listTab,
      search: search.trim() || undefined,
      month: viewMode === "calendar" ? calendarMonth : undefined,
      year: viewMode === "calendar" ? calendarYear : undefined,
    }),
  );

  const invalidate = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: trpc.events.list.queryKey({ tenantId }) }),
      queryClient.invalidateQueries({ queryKey: trpc.events.aggregates.queryKey({ tenantId }) }),
    ]);
  }, [tenantId]);

  const createMutation = useMutation(
    trpc.events.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Event created");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.events.update.mutationOptions({
      onSuccess: async () => {
        toast.success("Event updated");
        await invalidate();
        closePanel();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.events.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Event deleted");
        await invalidate();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const events = useMemo(() => (listQuery.data?.items ?? []) as EventRow[], [listQuery.data?.items]);

  function closePanel() {
    setPanelOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, startsAt: defaultStartsAt() });
    setPanelOpen(true);
  }

  function openView(row: EventRow) {
    setViewEvent(row);
  }

  function closeView() {
    setViewEvent(null);
  }

  function openEdit(row: EventRow) {
    closeView();
    setEditingId(row.id);
    setForm({
      title: row.title,
      description: row.description ?? "",
      startsAt: toDatetimeLocal(row.startsAt),
      endsAt: toDatetimeLocal(row.endsAt),
      venue: row.venue ?? "",
      onlineUrl: row.onlineUrl ?? "",
    });
    setPanelOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Event title is required");
      return;
    }
    if (!form.startsAt) {
      toast.error("Start date and time are required");
      return;
    }

    const payload = {
      tenantId,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      startsAt: new Date(form.startsAt),
      endsAt: form.endsAt ? new Date(form.endsAt) : null,
      venue: form.venue.trim() || undefined,
      onlineUrl: form.onlineUrl.trim() || undefined,
    };

    if (editingId) {
      updateMutation.mutate({ ...payload, id: editingId });
    } else {
      createMutation.mutate(payload);
    }
  }

  function deleteEvent(row: EventRow) {
    if (!window.confirm(`Delete "${row.title}"?`)) return;
    deleteMutation.mutate({ tenantId, id: row.id }, { onSuccess: () => closeView() });
  }

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const footer = (
    <div className="epl-slide-actions">
      <button type="button" className="rm-ghost" onClick={closePanel} disabled={isPending}>
        Cancel
      </button>
      <button type="submit" form="hub-event-form" className="rm-primary" disabled={isPending}>
        {isPending ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} />}
        {editingId ? "Save changes" : "Create event"}
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        {!readOnly && (
          <button type="button" className="rm-primary" onClick={openCreate}>
            <IconPlus size={16} /> Add event
          </button>
        )}

        <div style={{ marginLeft: readOnly ? 0 : "auto" }}>
          <SegmentedControl
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: "list", label: "List", icon: <IconList size={18} /> },
              { value: "calendar", label: "Calendar", icon: <IconCalendar size={18} /> },
            ]}
          />
        </div>
      </div>

      <div className="nm-filter-bar" style={{ alignItems: "center" }}>
        <div className="rm-search" style={{ flex: 1, minWidth: 200 }}>
          <IconSearch size={16} />
          <input placeholder="Search events…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {viewMode === "list" && (
          <SegmentedControl
            value={listTab}
            onChange={setListTab}
            options={[
              { value: "upcoming", label: "Upcoming", icon: <IconCalendarEvent size={16} /> },
              { value: "past", label: "Past", icon: <IconHistory size={16} /> },
            ]}
          />
        )}
      </div>

      {listQuery.isLoading ? (
        <div className="rm-state">Loading events…</div>
      ) : listQuery.isError ? (
        <div className="rm-state rm-state-error">{listQuery.error.message}</div>
      ) : events.length === 0 ? (
        <CountrySectionEmpty
          title={viewMode === "calendar" ? "No events this month" : listTab === "upcoming" ? "No upcoming events" : "No past events"}
          description={
            readOnly
              ? `${hubName} events will appear here once scheduled.`
              : `Schedule orientations, workshops, and alumni gatherings for ${hubName}.`
          }
          accent={accent}
        />
      ) : viewMode === "calendar" ? (
        <EventsCalendar
          year={calendarYear}
          month={calendarMonth}
          events={events.map((e) => ({
            ...e,
            isGlobal: Boolean(e.isGlobal),
            accent: e.isGlobal ? "#3B8BEB" : accent,
          }))}
          accent={accent}
          onMonthChange={(year, month) => {
            setCalendarYear(year);
            setCalendarMonth(month);
          }}
          onEventClick={(event) => {
            const row = events.find((item) => item.id === event.id);
            if (row) openView(row);
          }}
        />
      ) : (
        <div className="ev-list">
          {events.map((event) => (
            <EventListRow
              key={event.id}
              event={event}
              accent={accent}
              readOnly={readOnly}
              isSuperAdmin={Boolean(isSuperAdmin)}
              onView={() => openView(event)}
              onEdit={() => openEdit(event)}
              onDelete={() => deleteEvent(event)}
            />
          ))}
        </div>
      )}

      <EventViewPanel
        event={viewEvent}
        hubName={hubName}
        accent={accent}
        readOnly={readOnly}
        isSuperAdmin={Boolean(isSuperAdmin)}
        open={Boolean(viewEvent)}
        onClose={closeView}
        onEdit={() => viewEvent && openEdit(viewEvent)}
        onDelete={() => viewEvent && deleteEvent(viewEvent)}
      />

      {!readOnly && (
        <SlidePanel
          open={panelOpen}
          onClose={closePanel}
          title={editingId ? "Edit event" : "Add event"}
          description={`${hubName} — schedule a country program event`}
          footer={footer}
          width={540}
        >
          <form id="hub-event-form" onSubmit={handleSubmit} className="rm-panel-form">
            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconCalendarEvent size={16} /> Event details
              </div>
              <div className="epl-slide-field">
                <span>Title</span>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Cohort 7 orientation"
                  required
                />
              </div>
              <div className="epl-slide-field">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional — agenda, speakers, who should attend"
                  rows={4}
                />
              </div>
            </section>

            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconClock size={16} /> Schedule
              </div>
              <div className="rm-panel-row">
                <div className="epl-slide-field">
                  <span>Starts</span>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                    required
                  />
                </div>
                <div className="epl-slide-field">
                  <span>Ends</span>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                  />
                </div>
              </div>
            </section>

            <section className="rm-panel-section">
              <div className="rm-panel-section-head">
                <IconMapPin size={16} /> Location
              </div>
              <div className="epl-slide-field">
                <span>Venue</span>
                <input
                  value={form.venue}
                  onChange={(e) => setForm((prev) => ({ ...prev, venue: e.target.value }))}
                  placeholder="Optional — e.g. Ministry HQ, Abidjan"
                />
              </div>
              <div className="epl-slide-field">
                <span>Online link</span>
                <input
                  type="url"
                  value={form.onlineUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, onlineUrl: e.target.value }))}
                  placeholder="Optional — Zoom, Teams, or Google Meet link"
                />
              </div>
            </section>
          </form>
        </SlidePanel>
      )}
    </div>
  );
}
