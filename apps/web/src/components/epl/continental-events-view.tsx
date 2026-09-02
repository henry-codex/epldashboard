"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  IconCalendar,
  IconCalendarEvent,
  IconClock,
  IconExternalLink,
  IconHistory,
  IconLink,
  IconList,
  IconLoader2,
  IconMapPin,
  IconPencil,
  IconPlayerPlay,
  IconPlus,
  IconTrash,
  IconWorld,
} from "@tabler/icons-react";
import { EventsCalendar, formatEventWhen } from "@/components/epl/events-calendar";
import { SlidePanel } from "@/components/epl/slide-panel";
import { flagImageUrl, resolveIso2 } from "@/lib/world-countries";
import { queryClient, trpc } from "@/utils/trpc";

export type ContinentalEvent = {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  onlineUrl: string | null;
  isOnline: boolean;
  isUpcoming: boolean;
  isOngoing: boolean;
  isGlobal?: boolean;
  timeframe: "ongoing" | "upcoming" | "past";
  country: {
    id: string;
    name: string;
    flag: string;
    iso2: string;
    color: string;
    isGlobal?: boolean;
  };
};

type Totals = {
  ongoing: number;
  upcoming: number;
  past: number;
  thisMonth: number;
  total: number;
  countries: number;
};

type TimeframeTab = "ongoing" | "upcoming" | "past";
type ViewMode = "list" | "calendar";

type EventForm = {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  venue: string;
  onlineUrl: string;
  scope: "global" | string;
};

const EMPTY_FORM: EventForm = {
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  venue: "",
  onlineUrl: "",
  scope: "global",
};

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
  };
}

function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string; count?: number; icon?: React.ReactNode }>;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        background: "var(--eglass)",
        padding: 5,
        borderRadius: 12,
        border: "1px solid var(--eborder)",
        flexWrap: "wrap",
      }}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            style={{
              padding: "10px 18px",
              background: active ? "rgba(255,255,255,0.12)" : "transparent",
              color: active ? "var(--ewhite)" : "var(--emuted)",
              border: active ? "1px solid var(--eborder)" : "1px solid transparent",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 13,
              fontFamily: "var(--font)",
            }}
          >
            {option.icon}
            {option.label}
            {option.count != null && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: active ? "rgba(255,255,255,0.1)" : "var(--eborder)",
                  color: active ? "var(--ewhite)" : "var(--emuted)",
                }}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function EventRow({
  event,
  onClick,
}: {
  event: ContinentalEvent;
  onClick: () => void;
}) {
  const badge = formatDateBadge(event.startsAt);
  const isGlobal = Boolean(event.isGlobal || event.country.isGlobal);
  const accent = isGlobal ? "#3B8BEB" : event.country.color;
  const iso2 = resolveIso2({ iso2: event.country.iso2, flag: event.country.flag });
  const flagSrc = isGlobal ? "" : iso2 ? flagImageUrl(iso2, 40) : "";

  return (
    <article
      className="st-user-row"
      style={{
        cursor: "pointer",
        alignItems: "center",
        borderLeft: isGlobal ? "3px solid #3B8BEB" : undefined,
        transition: "all 0.15s ease",
      }}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: `color-mix(in srgb, ${accent} 14%, var(--eglass))`,
          border: `1px solid color-mix(in srgb, ${accent} 35%, var(--eborder))`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          lineHeight: 1.05,
        }}
      >
        <div style={{ fontSize: 9, fontWeight: 700, color: accent, fontFamily: "var(--font)" }}>
          {badge.month}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
          {badge.day}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 800,
              color: "var(--ewhite)",
              fontFamily: "var(--font)",
            }}
          >
            {event.title}
          </h3>
          {isGlobal && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "2px 8px",
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
              🌐 Global Event
            </span>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: accent, fontWeight: 600, fontFamily: "var(--font)" }}>
          {formatEventWhen(event.startsAt, event.endsAt)}
        </p>
        {event.description && (
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 12,
              color: "var(--emuted)",
              fontFamily: "var(--font)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {event.description}
          </p>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
        {isGlobal ? (
          <span className="rm-pill" style={{ borderColor: "rgba(59,139,235,0.4)", color: "#60A5FA" }}>
            <IconWorld size={13} /> EPL Global
          </span>
        ) : (
          <>
            {flagSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={flagSrc} alt="" width={18} height={13} style={{ borderRadius: 2, objectFit: "cover" }} />
            ) : (
              event.country.flag && <span>{event.country.flag}</span>
            )}
            <span className="rm-pill">{event.country.name}</span>
          </>
        )}
        {event.timeframe === "ongoing" && (
          <span className="nm-status-pill" style={{ color: "#2EC27E", borderColor: "rgba(46,194,126,0.35)" }}>
            Live now
          </span>
        )}
        {event.venue && (
          <span className="rm-pill" style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis" }}>
            <IconMapPin size={12} /> {event.venue}
          </span>
        )}
        {event.onlineUrl && (
          <span className="rm-pill" style={{ color: "#3B8BEB" }}>
            <IconLink size={12} /> Online
          </span>
        )}
      </div>
    </article>
  );
}

type Props = {
  totals: Totals;
  events: ContinentalEvent[];
  isLoading?: boolean;
};

export function ContinentalEventsView({ totals, events, isLoading }: Props) {
  const router = useRouter();
  const now = new Date();
  const [timeframe, setTimeframe] = useState<TimeframeTab>("upcoming");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [view, setView] = useState<ViewMode>("list");
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);

  // Modal / SlidePanel states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ContinentalEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);

  // Fetch partner country hubs for scope selector
  const hubsQuery = useQuery(trpc.tenants.list.queryOptions());
  const countryHubs = hubsQuery.data ?? [];

  // Mutations
  const createMutation = useMutation(
    trpc.events.create.mutationOptions({
      onSuccess: () => {
        toast.success("Event scheduled successfully");
        setIsCreateOpen(false);
        setForm(EMPTY_FORM);
        queryClient.invalidateQueries({ queryKey: trpc.platform.eventPortfolio.queryKey() });
      },
      onError: (err) => {
        toast.error(err.message || "Failed to schedule event");
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.events.update.mutationOptions({
      onSuccess: (updated) => {
        toast.success("Event updated successfully");
        setIsEditing(false);
        if (selectedEvent) {
          setSelectedEvent({
            ...selectedEvent,
            title: updated.title,
            description: updated.description,
            startsAt: updated.startsAt,
            endsAt: updated.endsAt,
            venue: updated.venue,
            onlineUrl: updated.onlineUrl,
            isOnline: updated.isOnline,
            isUpcoming: updated.isUpcoming,
            isGlobal: updated.isGlobal,
          });
        }
        queryClient.invalidateQueries({ queryKey: trpc.platform.eventPortfolio.queryKey() });
      },
      onError: (err) => {
        toast.error(err.message || "Failed to update event");
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.events.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Event removed");
        setSelectedEvent(null);
        setIsEditing(false);
        queryClient.invalidateQueries({ queryKey: trpc.platform.eventPortfolio.queryKey() });
      },
      onError: (err) => {
        toast.error(err.message || "Failed to delete event");
      },
    }),
  );

  const openCreateModal = () => {
    setForm({
      ...EMPTY_FORM,
      startsAt: defaultStartsAt(),
      scope: "global",
    });
    setIsCreateOpen(true);
  };

  const handleStartEdit = (event: ContinentalEvent) => {
    setIsEditing(true);
    setForm({
      title: event.title,
      description: event.description ?? "",
      startsAt: toDatetimeLocal(event.startsAt),
      endsAt: toDatetimeLocal(event.endsAt),
      venue: event.venue ?? "",
      onlineUrl: event.onlineUrl ?? "",
      scope: event.isGlobal ? "global" : event.tenantId,
    });
  };

  const handleSaveCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Event title is required");
      return;
    }
    if (!form.startsAt) {
      toast.error("Start time is required");
      return;
    }

    const isGlobal = form.scope === "global";
    createMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      startsAt: new Date(form.startsAt),
      endsAt: form.endsAt ? new Date(form.endsAt) : null,
      venue: form.venue.trim() || undefined,
      onlineUrl: form.onlineUrl.trim() || undefined,
      isGlobal,
      tenantId: isGlobal ? undefined : form.scope,
    });
  };

  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    if (!form.title.trim()) {
      toast.error("Event title is required");
      return;
    }
    if (!form.startsAt) {
      toast.error("Start time is required");
      return;
    }

    const isGlobal = form.scope === "global";
    updateMutation.mutate({
      id: selectedEvent.id,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      startsAt: new Date(form.startsAt),
      endsAt: form.endsAt ? new Date(form.endsAt) : null,
      venue: form.venue.trim() || undefined,
      onlineUrl: form.onlineUrl.trim() || undefined,
      isGlobal,
      tenantId: isGlobal ? undefined : form.scope,
    });
  };

  const handleDelete = () => {
    if (!selectedEvent) return;
    if (!window.confirm(`Are you sure you want to delete "${selectedEvent.title}"?`)) return;
    deleteMutation.mutate({ id: selectedEvent.id });
  };

  // Filter events by timeframe and scope/country
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (e.timeframe !== timeframe) return false;
      if (scopeFilter === "all") return true;
      if (scopeFilter === "global") return Boolean(e.isGlobal || e.country.isGlobal);
      return e.tenantId === scopeFilter || e.country.id === scopeFilter;
    });
  }, [events, timeframe, scopeFilter]);

  const calendarEvents = useMemo(() => {
    return events
      .filter((e) => {
        if (scopeFilter === "global" && !(e.isGlobal || e.country.isGlobal)) return false;
        if (scopeFilter !== "all" && scopeFilter !== "global" && e.tenantId !== scopeFilter && e.country.id !== scopeFilter) {
          return false;
        }
        const start = new Date(e.startsAt);
        return start.getFullYear() === calendarYear && start.getMonth() + 1 === calendarMonth;
      })
      .map((e) => {
        const isGlobal = Boolean(e.isGlobal || e.country.isGlobal);
        return {
          id: e.id,
          title: e.title,
          description: e.description,
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          venue: e.venue,
          onlineUrl: e.onlineUrl,
          isUpcoming: e.isUpcoming,
          accent: isGlobal ? "#3B8BEB" : e.country.color,
          isGlobal,
          countryName: isGlobal ? "EPL Global" : e.country.name,
          flag: isGlobal ? "🌐" : e.country.flag,
        };
      });
  }, [events, calendarYear, calendarMonth, scopeFilter]);

  if (isLoading) {
    return (
      <div className="rm-state">
        <IconLoader2 size={18} className="animate-spin" />
        Loading events…
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        {[
          { label: "Ongoing now", value: totals.ongoing, accent: "#2EC27E", icon: <IconPlayerPlay size={20} /> },
          { label: "Upcoming", value: totals.upcoming, accent: "#3B8BEB", icon: <IconCalendarEvent size={20} /> },
          { label: "Past events", value: totals.past, accent: "#9B59B6", icon: <IconHistory size={20} /> },
          { label: "This month", value: totals.thisMonth, accent: "#E8A020", icon: <IconClock size={20} /> },
        ].map((card) => (
          <div key={card.label} className="gc" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `color-mix(in srgb, ${card.accent} 14%, var(--eglass))`,
                border: `1px solid color-mix(in srgb, ${card.accent} 30%, var(--eborder))`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: card.accent,
              }}
            >
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                {card.value}
              </div>
              <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Bar & Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SegmentedTabs
            value={timeframe}
            onChange={setTimeframe}
            options={[
              { value: "ongoing", label: "Ongoing", count: totals.ongoing, icon: <IconPlayerPlay size={16} /> },
              { value: "upcoming", label: "Upcoming", count: totals.upcoming, icon: <IconCalendarEvent size={16} /> },
              { value: "past", label: "Past", count: totals.past, icon: <IconHistory size={16} /> },
            ]}
          />

          {/* Scope Filter Dropdown */}
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="rm-select"
              style={{
                background: "var(--eglass)",
                border: "1px solid var(--eborder)",
                color: "var(--ewhite)",
                padding: "9px 14px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "var(--font)",
                cursor: "pointer",
              }}
            >
              <option value="all">🌍 All Regions & Global</option>
              <option value="global">🌐 Global Events Only</option>
              {countryHubs.map((hub: { id: string; name: string; flag?: string | null }) => (
                <option key={hub.id} value={hub.id}>
                  {hub.flag || "📍"} {hub.name} Hub
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <SegmentedTabs
            value={view}
            onChange={setView}
            options={[
              { value: "list", label: "List", icon: <IconList size={16} /> },
              { value: "calendar", label: "Calendar", icon: <IconCalendar size={16} /> },
            ]}
          />

          {/* Schedule Event Button */}
          <button
            type="button"
            className="rm-btn-primary"
            onClick={openCreateModal}
            style={{
              padding: "10px 18px",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 10,
            }}
          >
            <IconPlus size={16} />
            Schedule Event
          </button>
        </div>
      </div>

      {/* Content: List or Calendar View */}
      {view === "calendar" ? (
        <EventsCalendar
          year={calendarYear}
          month={calendarMonth}
          events={calendarEvents}
          accent="#3B8BEB"
          onMonthChange={(year, month) => {
            setCalendarYear(year);
            setCalendarMonth(month);
          }}
          onEventClick={(event) => {
            const match = events.find((e) => e.id === event.id);
            if (match) {
              setSelectedEvent(match);
              setIsEditing(false);
            }
          }}
        />
      ) : filteredEvents.length === 0 ? (
        <div className="rm-state" style={{ padding: "48px 24px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
            {totals.total === 0 ? "No events scheduled yet" : `No ${timeframe} events found`}
          </div>
          <p style={{ margin: "6px 0 16px", fontSize: 13, color: "var(--emuted)", fontFamily: "var(--font)", maxWidth: 460 }}>
            {totals.total === 0
              ? "Schedule your first global or country event to broadcast orientations, webinars, and milestones across all country dashboards."
              : "Try switching timeframe tabs or filter options, or schedule a new event."}
          </p>
          <button
            type="button"
            className="rm-btn-primary"
            onClick={openCreateModal}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <IconPlus size={16} /> Schedule an Event
          </button>
        </div>
      ) : (
        <div className="gc" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              onClick={() => {
                setSelectedEvent(event);
                setIsEditing(false);
              }}
            />
          ))}
        </div>
      )}

      {/* SlidePanel: Schedule New Event */}
      <SlidePanel
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule New Event"
        description="Create a global event or hub-specific session. Global events appear across all country hubs and fellow calendars."
      >
        <form onSubmit={handleSaveCreate} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Scope Selector */}
          <div>
            <label className="rm-label" style={{ marginBottom: 8, display: "block" }}>
              Event Scope & Distribution
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setForm({ ...form, scope: "global" })}
                style={{
                  padding: "14px 12px",
                  borderRadius: 10,
                  border: form.scope === "global" ? "2px solid #3B8BEB" : "1px solid var(--eborder)",
                  background: form.scope === "global" ? "rgba(59,139,235,0.15)" : "var(--eglass)",
                  color: "var(--ewhite)",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontFamily: "var(--font)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: "#60A5FA" }}>
                  <IconWorld size={16} /> Global Event
                </div>
                <div style={{ fontSize: 11, color: "var(--emuted)", lineHeight: 1.3 }}>
                  Broadcasts to all country hubs & fellow dashboards
                </div>
              </button>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <select
                  value={form.scope !== "global" ? form.scope : ""}
                  onChange={(e) => setForm({ ...form, scope: e.target.value || "global" })}
                  style={{
                    height: "100%",
                    padding: "12px",
                    borderRadius: 10,
                    border: form.scope !== "global" ? "2px solid #2EC27E" : "1px solid var(--eborder)",
                    background: form.scope !== "global" ? "rgba(46,194,126,0.15)" : "var(--eglass)",
                    color: "var(--ewhite)",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "var(--font)",
                  }}
                >
                  <option value="" disabled>Specific Country Hub...</option>
                  {countryHubs.map((hub: { id: string; name: string; flag?: string | null }) => (
                    <option key={hub.id} value={hub.id}>
                      {hub.flag || "📍"} {hub.name} Hub
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="rm-label">Event Title *</label>
            <input
              type="text"
              className="rm-input"
              required
              placeholder="e.g. All-Fellows Continental Orientation 2026"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label className="rm-label">Starts At *</label>
              <input
                type="datetime-local"
                className="rm-input"
                required
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </div>
            <div>
              <label className="rm-label">Ends At (Optional)</label>
              <input
                type="datetime-local"
                className="rm-input"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="rm-label">Venue / Physical Location</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                className="rm-input"
                placeholder="e.g. Accra International Conference Center or Hybrid"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="rm-label">Online Meeting URL</label>
            <input
              type="url"
              className="rm-input"
              placeholder="https://zoom.us/j/... or Google Meet link"
              value={form.onlineUrl}
              onChange={(e) => setForm({ ...form, onlineUrl: e.target.value })}
            />
          </div>

          <div>
            <label className="rm-label">Description & Agenda</label>
            <textarea
              className="rm-textarea"
              rows={4}
              placeholder="Provide event details, objectives, speaker information, or preparation guidelines..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 12 }}>
            <button
              type="button"
              className="rm-btn-secondary"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rm-btn-primary"
              disabled={createMutation.isPending}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              {createMutation.isPending && <IconLoader2 size={16} className="animate-spin" />}
              Schedule Event
            </button>
          </div>
        </form>
      </SlidePanel>

      {/* SlidePanel: View & Edit Event Details */}
      <SlidePanel
        open={Boolean(selectedEvent)}
        onClose={() => {
          setSelectedEvent(null);
          setIsEditing(false);
        }}
        title={isEditing ? "Edit Event" : selectedEvent?.title ?? "Event Details"}
        description={
          isEditing
            ? "Update event details, timing, or distribution scope."
            : selectedEvent?.isGlobal || selectedEvent?.country.isGlobal
              ? "🌐 Global Event organized by EPL Global Platform"
              : `Event hosted by ${selectedEvent?.country.name ?? "Country Hub"}`
        }
      >
        {selectedEvent && (
          <div>
            {isEditing ? (
              <form onSubmit={handleSaveUpdate} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label className="rm-label" style={{ marginBottom: 8, display: "block" }}>
                    Event Scope & Distribution
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, scope: "global" })}
                      style={{
                        padding: "12px",
                        borderRadius: 10,
                        border: form.scope === "global" ? "2px solid #3B8BEB" : "1px solid var(--eborder)",
                        background: form.scope === "global" ? "rgba(59,139,235,0.15)" : "var(--eglass)",
                        color: "var(--ewhite)",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        fontFamily: "var(--font)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: "#60A5FA" }}>
                        <IconWorld size={16} /> Global Event
                      </div>
                      <div style={{ fontSize: 11, color: "var(--emuted)" }}>Broadcast across all hubs</div>
                    </button>

                    <select
                      value={form.scope !== "global" ? form.scope : ""}
                      onChange={(e) => setForm({ ...form, scope: e.target.value || "global" })}
                      style={{
                        height: "100%",
                        padding: "12px",
                        borderRadius: 10,
                        border: form.scope !== "global" ? "2px solid #2EC27E" : "1px solid var(--eborder)",
                        background: form.scope !== "global" ? "rgba(46,194,126,0.15)" : "var(--eglass)",
                        color: "var(--ewhite)",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 600,
                        fontFamily: "var(--font)",
                      }}
                    >
                      <option value="" disabled>Specific Country Hub...</option>
                      {countryHubs.map((hub: { id: string; name: string; flag?: string | null }) => (
                        <option key={hub.id} value={hub.id}>
                          {hub.flag || "📍"} {hub.name} Hub
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="rm-label">Event Title *</label>
                  <input
                    type="text"
                    className="rm-input"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label className="rm-label">Starts At *</label>
                    <input
                      type="datetime-local"
                      className="rm-input"
                      required
                      value={form.startsAt}
                      onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="rm-label">Ends At</label>
                    <input
                      type="datetime-local"
                      className="rm-input"
                      value={form.endsAt}
                      onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="rm-label">Venue</label>
                  <input
                    type="text"
                    className="rm-input"
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                  />
                </div>

                <div>
                  <label className="rm-label">Online URL</label>
                  <input
                    type="url"
                    className="rm-input"
                    value={form.onlineUrl}
                    onChange={(e) => setForm({ ...form, onlineUrl: e.target.value })}
                  />
                </div>

                <div>
                  <label className="rm-label">Description</label>
                  <textarea
                    className="rm-textarea"
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 12 }}>
                  <button
                    type="button"
                    className="rm-btn-secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rm-btn-primary"
                    disabled={updateMutation.isPending}
                    style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                  >
                    {updateMutation.isPending && <IconLoader2 size={16} className="animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Header info badge */}
                <div
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    background: selectedEvent.isGlobal || selectedEvent.country.isGlobal
                      ? "rgba(59,139,235,0.12)"
                      : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selectedEvent.isGlobal || selectedEvent.country.isGlobal ? "rgba(59,139,235,0.3)" : "var(--eborder)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {selectedEvent.isGlobal || selectedEvent.country.isGlobal ? (
                      <span style={{ fontSize: 24 }}>🌐</span>
                    ) : (
                      <span style={{ fontSize: 24 }}>{selectedEvent.country.flag || "📍"}</span>
                    )}
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
                        {selectedEvent.isGlobal || selectedEvent.country.isGlobal
                          ? "Global Continental Event"
                          : `${selectedEvent.country.name} Hub Event`}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)" }}>
                        {selectedEvent.isGlobal || selectedEvent.country.isGlobal
                          ? "Visible to all regional hubs & fellow dashboards"
                          : `Belongs to ${selectedEvent.country.name} Country Workspace`}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`nm-status-pill ${selectedEvent.timeframe === "ongoing" ? "is-active" : selectedEvent.timeframe === "past" ? "is-alumni" : ""}`}
                  >
                    {selectedEvent.timeframe === "ongoing"
                      ? "Live now"
                      : selectedEvent.timeframe === "past"
                        ? "Past"
                        : "Upcoming"}
                  </span>
                </div>

                {/* Event Timing & Venue details */}
                <div className="gc" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <IconClock size={18} style={{ color: "#3B8BEB", flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>Date & Time</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ewhite)", fontFamily: "var(--font)", marginTop: 2 }}>
                        {formatEventWhen(selectedEvent.startsAt, selectedEvent.endsAt)}
                      </div>
                    </div>
                  </div>

                  {selectedEvent.venue && (
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <IconMapPin size={18} style={{ color: "#2EC27E", flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>Venue / Location</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ewhite)", fontFamily: "var(--font)", marginTop: 2 }}>
                          {selectedEvent.venue}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedEvent.onlineUrl && (
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <IconLink size={18} style={{ color: "#60A5FA", flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: "var(--emuted)", fontFamily: "var(--font)" }}>Online Meeting Link</div>
                        <a
                          href={selectedEvent.onlineUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 4,
                            color: "#60A5FA",
                            fontSize: 13,
                            fontWeight: 600,
                            textDecoration: "underline",
                          }}
                        >
                          {selectedEvent.onlineUrl}
                          <IconExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                {selectedEvent.description && (
                  <div className="gc" style={{ padding: 18 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--emuted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                      Description & Notes
                    </div>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--ewhite)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {selectedEvent.description}
                    </p>
                  </div>
                )}

                {/* Actions: Edit, Delete, or Open Country Hub */}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12, flexWrap: "wrap" }}>
                  {!selectedEvent.isGlobal && !selectedEvent.country.isGlobal && (
                    <button
                      type="button"
                      className="rm-btn-secondary"
                      onClick={() => router.push(`/dashboard/countries/${selectedEvent.tenantId}/events`)}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    >
                      Open in Country Hub →
                    </button>
                  )}

                  <button
                    type="button"
                    className="rm-btn-secondary"
                    onClick={() => handleStartEdit(selectedEvent)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    <IconPencil size={15} />
                    Edit Event
                  </button>

                  <button
                    type="button"
                    className="nm-delete-btn"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 8,
                      background: "rgba(224,92,92,0.12)",
                      border: "1px solid rgba(224,92,92,0.3)",
                      color: "#E05C5C",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 13,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {deleteMutation.isPending ? (
                      <IconLoader2 size={15} className="animate-spin" />
                    ) : (
                      <IconTrash size={15} />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
