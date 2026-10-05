"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@epl-fellows-platform/api/routers/index";
import { trpc } from "@/utils/trpc";
import { deviceDescription } from "@/lib/account-settings";
import { SlidePanel } from "./slide-panel";
import "./audit-log.css";

type Outputs = inferRouterOutputs<AppRouter>;
type AuditEvent = Outputs["audit"]["get"];
type Cursor = NonNullable<Outputs["audit"]["list"]["nextCursor"]>;
type FilterState = { from: string; to: string; actorId: string; tenantId: string; action: string; category: "" | "security" | "access" | "records" | "system"; outcome: "" | "success" | "failed" | "denied" | "partial"; targetType: string; targetId: string; search: string };
function defaults(): FilterState {
  const now = new Date();
  return { from: new Date(now.getTime()-30*86400000).toISOString().slice(0,10), to: now.toISOString().slice(0,10), actorId:"",tenantId:"",action:"",category:"",outcome:"",targetType:"",targetId:"",search:"" };
}
function inputFor(filters: FilterState) {
  return { from: filters.from ? new Date(filters.from+"T00:00:00").toISOString() : undefined, to: filters.to ? new Date(filters.to+"T23:59:59.999").toISOString() : undefined,
    actorId: filters.actorId || undefined, tenantId: filters.tenantId || undefined, action: filters.action || undefined,
    category: filters.category || undefined, outcome: filters.outcome || undefined, targetType: filters.targetType || undefined, targetId: filters.targetId || undefined, search: filters.search || undefined };
}
export function auditLabel(value: string) { return value.replace(/[._]/g," ").replace(/^\w/, (s)=>s.toUpperCase()); }
const formatTime = (value: string) => new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"long"}).format(new Date(value));
function auditError(error: { data?: { code?: string } | null; message?: string } | null) {
  if(error?.data?.code === "UNAUTHORIZED") return "Your session has expired. Sign in again.";
  if(error?.data?.code === "FORBIDDEN") return "You no longer have permission to view these audit events.";
  return error?.message || "Could not load audit events. Try again.";
}
function Outcome({ value }: { value: string }) { return <span className={"audit-outcome audit-outcome--"+value}>{auditLabel(value)}</span>; }
function Actor({ actor }: { actor: AuditEvent["actor"] }) { return <><strong>{actor.name ?? (actor.kind === "anonymous" ? "Anonymous" : actor.id ?? "Unavailable")}</strong><small>{actor.role ? auditLabel(actor.role) : auditLabel(actor.kind)}</small></>; }
function DisplayValue({ value }: { value: unknown }) { return <span>{value == null ? "—" : typeof value === "object" ? "Changed" : String(value)}</span>; }
function AuditDetails({ id }: { id: string }) {
  const event = useQuery({ ...trpc.audit.get.queryOptions({id}), retry:false, staleTime:0 });
  if(event.isPending) return <p role="status">Loading event details…</p>;
  if(event.isError) return <div role="alert"><p>{auditError(event.error)}</p><button className="rm-ghost" onClick={()=>void event.refetch()}>Try again</button></div>;
  const row = event.data;
  return <div className="audit-details">
    <Outcome value={row.outcome}/><h3>{auditLabel(row.action)}</h3>
    <dl>{[
      ["Actor",row.actor.name ?? row.actor.id ?? auditLabel(row.actor.kind)],["Actor ID",row.actor.id],["Role at the time",row.actor.role ? auditLabel(row.actor.role):null],
      ["Target",row.targetLabel ?? row.targetType],["Target ID",row.targetId],["Hub",row.tenantName ?? "Account / global"],
      ["Local time",formatTime(row.occurredAt)],["UTC",row.occurredAt],["IP address",row.clientIp],
      ["Browser / device",deviceDescription(row.userAgent)],["Source",row.source],["Operation",row.procedure],
      ["Request ID",row.requestId],["Event ID",row.id],
    ].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value ?? "Unavailable"}</dd></div>)}</dl>
    {row.details.legacy && <p>Imported history. Details that were not originally recorded are unavailable.</p>}
    <h3>Changes</h3>
    {row.changes.length ? <ul className="audit-changes">{row.changes.map(change=><li key={change.field}><strong>{auditLabel(change.field)}</strong>{change.redacted ? <p>Changed · values withheld</p> : <div><DisplayValue value={change.before}/><span aria-label="changed to"> → </span><DisplayValue value={change.after}/></div>}</li>)}</ul> : <p>No field changes recorded for this event.</p>}
    {Object.keys(row.details).length > 0 && <><h3>Additional details</h3><dl>{Object.entries(row.details).map(([key,value])=><div key={key}><dt>{auditLabel(key)}</dt><dd><DisplayValue value={value}/></dd></div>)}</dl></>}
  </div>;
}
export function AuditLog() {
  const [draft,setDraft] = useState<FilterState>(defaults);
  const [applied,setApplied] = useState<FilterState>(draft);
  const [cursors,setCursors] = useState<Array<Cursor | undefined>>([undefined]);
  const [selected,setSelected] = useState<string | null>(null);
  const input = inputFor(applied);
  const events = useQuery({ ...trpc.audit.list.queryOptions({...input,limit:50,cursor:cursors.at(-1)}), retry:false, staleTime:0 });
  const choices = useQuery({ ...trpc.audit.filters.queryOptions({from:input.from,to:input.to}), retry:false, staleTime:0 });
  function field<Key extends keyof FilterState>(key:Key,value:FilterState[Key]) { setDraft(previous=>({...previous,[key]:value})); }
  function apply(event:FormEvent) { event.preventDefault(); setApplied({...draft}); setCursors([undefined]); setSelected(null); }
  const rows = events.data?.items ?? [];
  if (events.isError && ["UNAUTHORIZED","FORBIDDEN"].includes(events.error.data?.code ?? "")) return <section className="rm-state" role="alert"><p>{auditError(events.error)}</p>{events.error.data?.code === "UNAUTHORIZED" && <a href="/login">Sign in again</a>}<button className="rm-ghost" type="button" onClick={()=>void events.refetch()}>Try again</button></section>;
  return <section className="audit-page">
    <header className="audit-header"><div><p className="rm-kicker">Platform accountability</p><h1>Audit Log</h1><p>Who acted, what changed, and the outcome. History is available for 12 months.</p></div><button type="button" className="rm-ghost" disabled={events.isFetching || choices.isFetching} onClick={()=>{void events.refetch();void choices.refetch();}}>Refresh</button></header>
    <form className="gc audit-filters" onSubmit={apply}>
      <label className="epl-slide-field audit-search"><span>Search actor or record</span><input type="search" maxLength={100} value={draft.search} onChange={e=>field("search",e.target.value)} placeholder="Name or record title"/></label>
      <label className="epl-slide-field"><span>From</span><input type="date" required value={draft.from} max={draft.to} onChange={e=>field("from",e.target.value)}/></label>
      <label className="epl-slide-field"><span>Through</span><input type="date" required value={draft.to} min={draft.from} onChange={e=>field("to",e.target.value)}/></label>
      <label className="epl-slide-field"><span>Hub</span><select value={draft.tenantId} onChange={e=>field("tenantId",e.target.value)}><option value="">All permitted hubs</option>{choices.data?.hubs.map(hub=><option key={hub.id} value={hub.id}>{hub.name}</option>)}</select></label>
      <label className="epl-slide-field"><span>Actor</span><select value={draft.actorId} onChange={e=>field("actorId",e.target.value)}><option value="">All actors</option>{choices.data?.actors.map(actor=><option key={actor.id} value={actor.id}>{actor.name}</option>)}</select></label>
      <label className="epl-slide-field"><span>Category</span><select value={draft.category} onChange={e=>field("category",e.target.value as FilterState["category"])}><option value="">All categories</option>{choices.data?.categories.map(v=><option key={v} value={v}>{auditLabel(v)}</option>)}</select></label>
      <label className="epl-slide-field"><span>Action</span><select value={draft.action} onChange={e=>field("action",e.target.value)}><option value="">All actions</option>{choices.data?.actions.map(v=><option key={v} value={v}>{auditLabel(v)}</option>)}</select></label>
      <label className="epl-slide-field"><span>Outcome</span><select value={draft.outcome} onChange={e=>field("outcome",e.target.value as FilterState["outcome"])}><option value="">All outcomes</option>{["success","failed","denied","partial"].map(v=><option key={v} value={v}>{auditLabel(v)}</option>)}</select></label>
      <label className="epl-slide-field"><span>Record type</span><select value={draft.targetType} onChange={e=>field("targetType",e.target.value)}><option value="">All types</option>{choices.data?.targetTypes.map(v=><option key={v} value={v}>{auditLabel(v)}</option>)}</select></label>
      <label className="epl-slide-field"><span>Record ID</span><input value={draft.targetId} maxLength={200} onChange={e=>field("targetId",e.target.value)} placeholder="Optional exact ID"/></label>
      <div className="audit-filter-actions"><button className="rm-primary" type="submit">Apply filters</button><button className="rm-ghost" type="button" onClick={()=>{const initial=defaults();setDraft(initial);setApplied(initial);setCursors([undefined]);}}>Reset</button></div>
      {choices.isError && <p role="alert">Filter choices are unavailable. <button className="rm-ghost" type="button" onClick={()=>void choices.refetch()}>Retry filters</button></p>}
    </form>
    {events.isPending ? <p role="status" className="rm-state">Loading audit events…</p> : events.isError ? <div className="rm-state" role="alert"><p>{auditError(events.error)}</p><button type="button" className="rm-ghost" onClick={()=>void events.refetch()}>Try again</button></div> : rows.length === 0 ? <div className="gc rm-state"><h2>No audit events found</h2><p>Try a wider date range or fewer filters.</p></div> : <>
      <div className="gc audit-table-wrap"><table className="audit-table"><caption className="sr-only">Audit events, newest first</caption><thead><tr>{["When","Who","What","Record / hub","Outcome",""].map((name,i)=><th scope="col" key={i}>{name || <span className="sr-only">Details</span>}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.id}><td><time dateTime={row.occurredAt} title={row.occurredAt}>{formatTime(row.occurredAt)}</time></td><td><Actor actor={row.actor}/></td><td>{auditLabel(row.action)}</td><td><strong>{row.targetLabel ?? auditLabel(row.targetType)}</strong><small>{row.tenantName ?? "Account / global"}</small></td><td><Outcome value={row.outcome}/></td><td><button className="rm-ghost" onClick={()=>setSelected(row.id)} aria-label={"View "+auditLabel(row.action)+" details"}>Details</button></td></tr>)}</tbody></table></div>
      <div className="audit-cards">{rows.map(row=><article className="gc audit-card" key={row.id}><div className="audit-header"><h2>{auditLabel(row.action)}</h2><Outcome value={row.outcome}/></div><Actor actor={row.actor}/><p>{row.targetLabel ?? row.targetType} · {row.tenantName ?? "Account / global"}</p><time dateTime={row.occurredAt}>{formatTime(row.occurredAt)}</time><button className="rm-ghost" onClick={()=>setSelected(row.id)}>View details</button></article>)}</div>
    </>}
    <nav className="audit-pagination" aria-label="Audit pages"><button className="rm-ghost" disabled={cursors.length===1 || events.isFetching} onClick={()=>setCursors(previous=>previous.slice(0,-1))}>Previous</button><span role="status">Page {cursors.length}{events.isFetching ? " · Updating…" : ""}</span><button className="rm-ghost" disabled={!events.data?.nextCursor || events.isFetching || events.isError} onClick={()=>{if(events.data?.nextCursor)setCursors(previous=>[...previous,events.data!.nextCursor!]);}}>Next</button></nav>
    <SlidePanel open={Boolean(selected)} onClose={()=>setSelected(null)} title="Audit event details" width={620}>{selected && <AuditDetails key={selected} id={selected}/>}</SlidePanel>
  </section>;
}
