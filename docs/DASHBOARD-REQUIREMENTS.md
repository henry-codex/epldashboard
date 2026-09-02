# EPL Global Dashboard — What We Need to Achieve

**Source:** Emily’s comments for the alumni build team (afternoon meeting notes)  
**Status:** Working requirements for Phase 1 (Beta) and Phase 2  
**Principle:** Strong starting point — sharpen, standardize, and ship a data-first internal tool.

---

## 1. Product intent

This is **more than an executive global dashboard**. It is an **internal EPL program-health tool** used by:

- EPL Global leadership
- Country directors
- EPL board
- Country boards
- (Later) alumni association / EPLAN executive, with clear access rules

**Phase 1 goal:** A clean, shareable, **aggregate, data-first** dashboard that can go in front of country teams and the MasterCard Foundation (MCF).  
**Phase 2 goal:** Interactive / community layer (activity, events, individual-level intelligence) once security and access tiers are designed.

---

## 2. Non-negotiable Phase 1 guardrails

| Guardrail | Requirement |
|-----------|-------------|
| **Privacy** | **Aggregate data only.** No individual names, rosters, or person-level lists. |
| **Focus** | Data first. Recent activity / events / rich intelligence → Phase 2. |
| **Audience openness** | Overview stays **high-level and open to everyone internal to EPL**. Do not bury the overview in activities/events detail. |
| **Metric consistency** | Same three core numbers everywhere (see §3). |
| **#1 priority** | **Data pipeline** — live sync from country databases, tied to MCF assessment prep. |

---

## 3. Core metric standard (everywhere)

Every headline number must use the same three-part breakdown:

1. **Active Fellows** — fellows active *right now*
2. **Alumni Leaders** — the alumni leader network
3. **Total Network** — Active Fellows + Alumni (Leaders)

**Must be consistent on:**

- Overview / landing
- Map
- Fellows / network page
- Country pages
- Country Programs board
- Placement heat map (Total Network)

No one-off metric labels that diverge from this trio.

---

## 4. Indicator definitions (to lock with Winnie & Richard)

Before treating numbers as “final,” align on definition + **why** each is measured here:

| Indicator | Working assumption (confirm) | Decision needed |
|-----------|------------------------------|-----------------|
| **Placement rate / % Placement** | **Historic** | Confirm historic vs other definition |
| **Institutions** | Likely **active institutions** (where fellows are *now*) vs historical/cumulative | Confirm active vs cumulative |
| **Average check-in** | Of **graduated fellows (alumni)** | Confirm population and cadence |
| **Active Fellows** | Current status | Confirm criteria for “active” |
| **Alumni Network / Alumni Leaders** | Alumni leader network | Confirm who counts |
| **Total Network** | Active Fellows + Alumni | Confirm inclusion rules |
| **Trends** | Overlay on top of core indicators | Confirm which trends for Phase 1 |

**Owner for alignment:** Build team + **Winnie** + **Richard**.

---

## 5. Phase 1 (Beta) vs Phase 2

| | **Phase 1 — Beta** | **Phase 2** |
|---|--------------------|-------------|
| **Focus** | All the data, clean and aggregate | Recent activity, events, richer intelligence |
| **Includes** | Core 3-point metrics; map (fellows **+** alumni); placement heat map (**Total Network**); country program data; Data (ex-Reports) performance views | Recent activity feed; events; per-program global intelligence; alumni-network drill-downs; individual-level data |
| **Privacy** | **Aggregate only — no names or lists** | Individual-level data, with security designed in |
| **Fellows / network UI** | Lead with **network**; drill to active fellows + alumni intelligence at aggregate level; per-program global breakdowns can wait if only one program is live | Deeper alumni drill-downs; program-level intelligence |
| **Check-ins depth** | Surface agreed aggregate check-in metrics | Depth owned by **M&E + programming teams** |

**Why this split:** Phase 1 ships a clean MCF-/country-ready data product fast. Phase 2 adds community/interactive layers after access control is real.

---

## 6. Page-by-page outcomes

### 6.1 Overview / landing

- Keep landing + URL quality; ship-ready polish.
- **Remove / defer Recent Activity → Phase 2.**
- High-level, data-first, readable by anyone internal to EPL.
- Show the **three core metrics** as the primary story.

### 6.2 Map view

- Show **alumni as well as fellows** (not fellows-only).
- Surface **Alumni + Total Network** (alongside or instead of fellows-only framing).
- Stay aligned with the three-point metric standard.

### 6.3 Placement heat map

- Reflect **Total Network** (active fellows **and** alumni), not a single subgroup.

### 6.4 Country Programs (list / board)

Per country, track (confirm set with Winnie & Richard — board vs drill-down):

| Field | Intent |
|-------|--------|
| **Country** | Program geography |
| **Active Fellows** | What fellows are doing *now* |
| **Institutions** | Current placements / where fellows are now |
| **% Placement** | Historical |
| **Alumni Network** | Alumni side of the network |
| **Check-in** | Agreed check-in indicator |
| **Trends** | Layer trends on top |

**Open decision:** Which of these live on the **same board** vs a **drill-down**. Confirm before locking UI.

### 6.5 Country pages

- Same per-country indicator set as above.
- Strong data presentation already — keep and standardize.
- **Alumni highlights:** define intended flow with the **alumni association** (how they use this and how their content feeds in).

### 6.6 Fellows page → network-first

- Today reads as **active fellows only**.
- **Lead with the network**, then drill into:
  - Active fellows
  - Alumni network intelligence (aggregate in Phase 1)
- Per-program global data is fine later; with **one live program**, treat per-program global intelligence as **Phase 2** unless needed for beta.
- Check-in detail depth: **M&E + programming**.

### 6.7 Reports → rename **Data**

- Treat as a **performance dashboard** (by country, by cohort).
- **Rename nav/label: Reports → Data.**
- Agree the **minimum important datasets** for the first draft (with Emily / Winnie / Richard).

### 6.8 Alumni Network page

- Dashboard direction is close to the **alternate / network view** desired for Fellows — consider bringing Fellows + Alumni Network views closer together.
- Clarify **Executive hub** audience (assumed EPLAN executive) and how EPLAN wants to manage it.
- **Core questions to resolve:**
  - Who is the audience?
  - How will the page actually be used?
  - Who gets which **data level** (aggregate vs full alumni database)?
- Phase 1: **no full alumni roster / individual lists**.

### 6.9 Events

- Direction: members of the EPL ecosystem (alumni network, EPL Global, country teams) should be able to **upload events** — with safe admin/access tiers.
- **Phase 2** for the interactive events layer; Phase 1 may omit or keep minimal/aggregate only.
- Access/admin model is a required design discussion before broad upload.

---

## 7. Audience & access tiers (must design)

**Product positioning:** Global dashboard for leadership **and** program-health tool for all of EPL (country directors, boards, country boards seeing **their** programs and placements).

**Required access map (discussion item — top priority with privacy):**

| Tier (illustrative) | Sees | Can do |
|---------------------|------|--------|
| Broad internal (Phase 1 default) | Aggregate metrics, maps, country health | View |
| Country / role-scoped | Their country aggregate (+ later placements) | View (scoped) |
| Alumni / EPLAN exec (TBD) | Defined alumni views | TBD with EPLAN |
| Admins / data owners | Pipeline, uploads, definitions | Manage sync & definitions |
| Phase 2 elevated | Individual-level where authorized | View/edit per policy |
| Event contributors (Phase 2) | Event tools | Upload within policy |

Phase 1 default: **open enough for internal review, aggregate-only, no person-level exposure.**

---

## 8. Data pipeline & MCF (priority #1)

**Owner:** **Winnie** (with build team + program/country teams).

### What “done” looks like for the pipeline

1. Prioritize **Phase 1 beta fields** (the indicators and three core metrics above).
2. Connect to **existing country databases** (likely **Excel / Google Sheets** in Google Workspace).
3. Preferred model: teams **keep their own sheets**; the platform **pulls and live-syncs** into the global dashboard.
4. Tie to **MasterCard Foundation assessment** prep:
   - Everyone counted is part of the **network**
   - Flag whether each person is **MCF program** or other
   - Clean databases ready to **hand over to MCF** for MCF cohort members
   - Clean data available to **upload and sync live** to the dashboard
5. Get a **first round of country/program data** in quickly; then iterate.

**Team questions to answer:** How fast can beta go live with first synced aggregates?

---

## 9. Budget, hosting & domain

**Ask:** Alumni / build team provides a **budget quote including hosting**.

**Emily’s preference:**

- Host on **emergingpublicleaders.org**
- **Password-protected** (login) dashboard

**Technical question to answer:** What is required to connect the EPL domain to a password-protected / login version of this app (DNS, SSL, auth, env, CORS, cookies, etc.)?

---

## 10. Privacy (Phase 1 — hard rule)

- Do **not** ship alumni program surfaces that hold or expose a list of everyone.
- Pull **aggregates** into maps and dashboards only.
- **No individual names** in Phase 1.
- Individual-level data and security design belong in **Phase 2**.

---

## 11. Open / future questions (track, don’t block Phase 1)

1. **Maintenance & support** — How do we support builders going forward? Future builds? Possible spin-out?
2. **LMS / community portal** — How might this connect later?
   - Need not be the same product.
   - Portal could **link into** this dashboard, or the public site could surface a few dashboard highlights.
3. **Phase 2 security** — Deep dive on technical safeguards (exactly why Phase 1 stays aggregate-only).

---

## 12. Definition of done — Phase 1 Beta

Phase 1 is ready to put in front of country teams / MCF when:

- [x] Overview is data-first (no Recent Activity as a primary story) — *UI done Aug 2026*
- [x] **Active Fellows / Alumni Leaders / Total Network** appear consistently on overview, map, fellows/network, and country surfaces — *UI done*
- [x] Map + placement heat map include **alumni / Total Network**, not fellows-only — *UI done*
- [ ] Country board + country pages use the agreed indicator set (or an agreed board vs drill-down split) — *UI draft in place; confirm defs with Winnie & Richard*
- [x] **Reports** renamed to **Data**; first-draft datasets agreed — *nav rename done; dataset list still TBD*
- [x] **No individual names or lists** on primary country fellows/alumni/profile surfaces — *UI gated; some alumni exec/orphan pages may still need sweep*
- [ ] Indicator definitions confirmed with **Winnie & Richard**
- [ ] First live (or near-live) sync path from country Google Workspace / sheets into aggregates
- [ ] MCF-oriented fields supported in the pipeline model (network membership + MCF flag)
- [ ] Hosting + budget quote delivered; path to **emergingpublicleaders.org** + password/login documented
- [ ] Access tiers sketched at least for Phase 1 (everyone internal sees aggregate) vs Phase 2 individual access

---

## 13. Immediate next actions

| Action | Owner / with |
|--------|----------------|
| Lock indicator definitions (placement, institutions, check-in, etc.) | Winnie, Richard, build team |
| Confirm country-board vs drill-down indicator set | Same |
| Prioritize Phase 1 data fields + sheet/API sync plan | Winnie + build team |
| Collect first country data round | Program + country teams |
| Rename Reports → Data; agree first Data views | Build + Emily |
| Network-first Fellows / Alumni view alignment | Build + Emily (+ EPLAN for alumni hub) |
| Access & admin tier workshop (esp. alumni DB + events) | Leadership + build |
| Budget + hosting quote; domain + password plan | Alumni/build team |
| Defer activity/events/individual lists to Phase 2 | Product rule |

---

*This document states what the dashboard must achieve based on Emily’s feedback. Implementation details (APIs, schema, UI tickets) should map back to Phase 1 vs Phase 2 and the privacy / metric rules above.*
