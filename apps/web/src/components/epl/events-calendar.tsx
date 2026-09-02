"use client";

import { useMemo, useRef, useState } from "react";
import { IconChevronLeft, IconChevronRight, IconClock, IconLink, IconMapPin, IconWorld } from "@tabler/icons-react";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  onlineUrl: string | null;
  isUpcoming: boolean;
  accent?: string;
  isGlobal?: boolean;
  countryName?: string;
  flag?: string;
};

type Props = {
  year: number;
  month: number;
  events: CalendarEvent[];
  accent: string;
  onMonthChange: (year: number, month: number) => void;
  onEventClick?: (event: CalendarEvent) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function formatEventWhen(startsAt: string, endsAt: string | null) {
  const start = new Date(startsAt);
  const datePart = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!endsAt) return `${datePart} · ${timePart}`;
  const end = new Date(endsAt);
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (start.toDateString() === end.toDateString()) {
    return `${datePart} · ${timePart} – ${endTime}`;
  }
  const endDate = end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${datePart} · ${timePart} → ${endDate} ${endTime}`;
}

function EventHoverPopover({
  event,
  accent,
  anchor,
}: {
  event: CalendarEvent;
  accent: string;
  anchor: DOMRect;
}) {
  const width = 280;
  const left = Math.min(Math.max(12, anchor.left + anchor.width / 2 - width / 2), window.innerWidth - width - 12);
  const top = anchor.bottom + 10;
  const flip = top + 220 > window.innerHeight;

  return (
    <div
      style={{
        position: "fixed",
        left,
        top: flip ? anchor.top - 10 : top,
        transform: flip ? "translateY(-100%)" : "none",
        width,
        zIndex: 700,
        pointerEvents: "none",
      }}
    >
      <div
        className="gc"
        style={{
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
          border: `1px solid ${accent}40`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {event.isGlobal ? (
            <span
              style={{
                fontSize: 10,
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
              <IconWorld size={12} /> Global Event
            </span>
          ) : event.countryName ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.08)",
                color: "var(--ewhite)",
                border: "1px solid var(--eborder)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontFamily: "var(--font)",
              }}
            >
              {event.countryName}
            </span>
          ) : null}
          {!event.isUpcoming && (
            <span className="nm-status-pill is-alumni" style={{ padding: "2px 6px", fontSize: 10 }}>
              Past
            </span>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)", lineHeight: 1.3 }}>
          {event.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--emuted)", display: "flex", gap: 6, alignItems: "flex-start", fontFamily: "var(--font)" }}>
          <IconClock size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{formatEventWhen(event.startsAt, event.endsAt)}</span>
        </div>
        {event.description && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--emuted)", lineHeight: 1.5, fontFamily: "var(--font)" }}>
            {event.description}
          </p>
        )}
        {event.venue && (
          <div style={{ fontSize: 12, color: "var(--ewhite)", display: "flex", gap: 6, alignItems: "center", fontFamily: "var(--font)" }}>
            <IconMapPin size={14} style={{ color: accent }} /> {event.venue}
          </div>
        )}
        {event.onlineUrl && (
          <div style={{ fontSize: 12, color: "#3B8BEB", display: "flex", gap: 6, alignItems: "center", fontFamily: "var(--font)" }}>
            <IconLink size={14} /> Online event
          </div>
        )}
      </div>
    </div>
  );
}

export function EventsCalendar({ year, month, events, accent, onMonthChange, onEventClick }: Props) {
  const [hovered, setHovered] = useState<{ event: CalendarEvent; anchor: DOMRect } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = dayKey(new Date(event.startsAt));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const cells = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const startOffset = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const dayNumber = index - startOffset + 1;
      if (dayNumber < 1 || dayNumber > daysInMonth) {
        return { dayNumber: null as number | null, date: null as Date | null };
      }
      return { dayNumber, date: new Date(year, month - 1, dayNumber) };
    });
  }, [year, month]);

  const todayKey = dayKey(new Date());

  function showPopover(event: CalendarEvent, target: HTMLElement) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setHovered({ event, anchor: target.getBoundingClientRect() });
  }

  function scheduleHide() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setHovered(null), 120);
  }

  function goPrev() {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  }

  function goNext() {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  }

  return (
    <div className="gc" style={{ padding: 20, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <button type="button" className="nm-row-action" onClick={goPrev} aria-label="Previous month" style={{ padding: "8px 12px", fontSize: 13 }}>
          <IconChevronLeft size={18} />
        </button>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ewhite)", fontFamily: "var(--font)" }}>
          {monthLabel(year, month)}
        </div>
        <button type="button" className="nm-row-action" onClick={goNext} aria-label="Next month" style={{ padding: "8px 12px", fontSize: 13 }}>
          <IconChevronRight size={18} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8, marginBottom: 8 }}>
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            style={{
              textAlign: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--emuted)",
              fontFamily: "var(--font)",
              padding: "4px 0",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 8 }}>
        {cells.map((cell, index) => {
          if (!cell.date || cell.dayNumber == null) {
            return <div key={`empty-${index}`} style={{ minHeight: 100 }} />;
          }

          const key = dayKey(cell.date);
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = key === todayKey;

          return (
            <div
              key={key}
              style={{
                minHeight: 100,
                borderRadius: 12,
                border: `1px solid ${isToday ? accent : "var(--gborder)"}`,
                background: isToday ? `${accent}10` : "rgba(255,255,255,0.02)",
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: isToday ? accent : "var(--ewhite)",
                  fontFamily: "var(--font)",
                }}
              >
                {cell.dayNumber}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
                {dayEvents.slice(0, 2).map((event) => {
                  const eventAccent = event.accent ?? accent;
                  return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onEventClick?.(event)}
                    onMouseEnter={(e) => showPopover(event, e.currentTarget)}
                    onMouseLeave={scheduleHide}
                    onFocus={(e) => showPopover(event, e.currentTarget)}
                    onBlur={scheduleHide}
                    style={{
                      border: "none",
                      borderRadius: 6,
                      padding: "5px 8px",
                      background: event.isUpcoming ? `${eventAccent}25` : "rgba(255,255,255,0.06)",
                      color: event.isUpcoming ? eventAccent : "var(--emuted)",
                      fontSize: 11,
                      fontWeight: 700,
                      textAlign: "left",
                      cursor: onEventClick ? "pointer" : "default",
                      fontFamily: "var(--font)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {event.isGlobal && <IconWorld size={12} style={{ flexShrink: 0 }} />}
                      {event.title}
                    </span>
                  </button>
                  );
                })}
                {dayEvents.length > 2 && (
                  <div style={{ fontSize: 11, color: "var(--emuted)", fontFamily: "var(--font)", paddingLeft: 4 }}>
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hovered && <EventHoverPopover event={hovered.event} accent={accent} anchor={hovered.anchor} />}
    </div>
  );
}

export { formatEventWhen };
