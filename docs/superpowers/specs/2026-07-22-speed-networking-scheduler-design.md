# Speed Networking Scheduler — Design

**Status:** Draft
**Date:** 2026-07-22
**Owner:** Mariusz Izydorek

## 1. Purpose

Give a single event **organiser** a locally-run SPA that turns a roster (imported from Excel/CSV) plus a handful of parameters into:

1. A **pairwise-balanced schedule** for a speed-networking event — everyone rotates through labelled areas so that they meet as many *different* people as possible, ideally with no repeats.
2. A set of **printable materials** — personal plans, name tags, area signs, an organiser cheat sheet, and a schedule-quality report.
3. A **live event runner** — big on-screen timer, current-round roster visualisation across all areas, and controls to pause/skip/insert breaks.

Non-goals:
- No hosted, multi-device, or cloud-synced experience.
- No attendee-facing tool (they follow their printed plan).
- No backend, no API server, no remote database.

## 2. Motivating example

40 attendees, 30 minutes total.

- 10 areas labelled A–J, 4 seats each.
- 10 rounds of 3 minutes (2:30 conversation + 0:30 move).
- Each person meets 3 new people per round → up to 30 distinct people over 10 rounds → in principle, zero repeats.

The app should generate this cleanly and support real-world variants: fewer people, different group sizes, an "avoid same-company" preference, and one or more mid-event breaks.

## 3. Users and workflow

**One user role: the organiser** (runs the app on their laptop).

End-to-end workflow, aligned with four pages:

1. **Setup** — Import Excel/CSV; edit parameters; validate roster + parameters.
2. **Schedule** — Generate a best-effort schedule; inspect quality; regenerate.
3. **Print** — Download PDFs (personal plans, name tags, area signs, master matrix, quality report).
4. **Run** — On event day: big timer, current-round visualisation, break handling.

## 4. Architectural constraints (from `AGENTS.md` / `README.md`)

- SPA runs locally in a browser; dev via `pnpm run dev`, prod via `pnpm run preview` on the organiser's machine.
- Browser-only persistence (`localStorage` for this app; no IndexedDB needed).
- No backend, no remote database, no cloud sync.
- Stack: React 19 + TypeScript, Rsbuild, React Router, MUI, Vitest + Testing Library, Cypress.

## 5. Scope decisions (from brainstorming)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Audience | Organiser tool only | Attendees follow printouts. |
| Live event experience | Prep + live runner + on-screen roster per round | Organiser projects the current round on a TV. |
| Numbers-don't-fit handling | Allow under-fill via smaller groups; allow imperfect schedules with quality report | Real events have late RSVPs. |
| Roster data model | `Name` + `Company`; togglable "avoid same-company" constraint | Covers the common case without a mapping UI. |
| Persistence | Single "current event" persisted; explicit "New event" clears | Real prep spans multiple sittings; multi-event UI is over-scope. |
| Print artifacts | Personal plan, name tags, area signs, master matrix, quality report | Full set. |
| Personal plan format | Perforated A4 with 10 mini-tags per person | Each mini-tag has round + area + names to meet; attendee tears one off per round. |
| Configurable parameters | Group size, areas + labels, round count, round + move seconds, avoid-same-company, breaks (0..n) | See §7. |
| Breaks | List of `{ afterRound, seconds, label }`; 0..n breaks | Coffee, lunch, etc. First-class phase in Run. |

## 6. Domain model (`src/domain/types.ts`)

```ts
export type PersonId = string;                    // nanoid

export interface Person {
  id: PersonId;
  name: string;
  company: string;                                // "" allowed
  rowIndex: number;                               // source row, for import error reporting
}

export interface Area {
  id: string;                                     // "A", "B", ... (editable)
  label: string;
}

export interface BreakSlot {
  afterRound: number;                             // 1-based round the break follows
  seconds: number;                                // default 600
  label: string;                                  // "Coffee", "Lunch"
}

export interface EventParams {
  groupSize: number;                              // default 4
  areas: Area[];                                  // default 10, labels A–J
  numRounds: number;                              // default = areas.length
  roundSeconds: number;                           // default 180
  moveSeconds: number;                            // default 30 (subset of roundSeconds)
  avoidSameCompany: boolean;                      // default true
  breaks: BreakSlot[];                            // default []
}

export interface Group {
  areaId: string;
  memberIds: PersonId[];                          // length <= groupSize; short groups allowed
}

export interface Round {
  index: number;                                  // 0-based
  groups: Group[];                                // length === areas.length
  sittingOut: PersonId[];                         // usually []
}

export interface Quality {
  totalPairs: number;
  uniquePairs: number;
  repeatedPairs: number;
  sameCompanyPairs: number;
  perPerson: Array<{
    id: PersonId;
    metIds: PersonId[];
    neverMetIds: PersonId[];
    repeatMeetings: number;
  }>;
}

export interface Schedule {
  rounds: Round[];
  quality: Quality;
  seed: number;                                   // RNG seed, for reproducibility
  generatedAt: string;                            // ISO timestamp
}

export type RunPhase =
  | 'idle' | 'conversation' | 'move' | 'break' | 'paused' | 'finished';

export interface RunState {
  currentRoundIndex: number;                      // 0-based
  phase: RunPhase;
  phaseStartedAt: number;                         // epoch ms; timer derived from this
  pausedRemainingMs?: number;                     // captured on pause
}

export interface EventState {
  version: 1;
  roster: Person[];
  params: EventParams;
  schedule?: Schedule;                            // undefined until generated
  runState?: RunState;                            // undefined until Run started
}
```

Notes:
- `EventState` is the single object persisted to `localStorage` under `speedDating:currentEvent`, versioned for future migration.
- `Quality` is computed once alongside the schedule so views never recompute.
- Timer is derived from `phaseStartedAt` — we don't persist tick-level state.

## 7. Scheduler (`src/domain/scheduler/`)

### 7.1 Contract

```ts
generateSchedule(
  roster: Person[],
  params: EventParams,
  opts?: {
    seed?: number;                                // random if omitted
    timeBudgetMs?: number;                        // default 2000
    restarts?: number;                            // default 8
  },
): Schedule
```

Pure, no I/O. Called from `SchedulePage` inside a `useTransition`. If future load requires it, moving to a Web Worker is a non-breaking change.

### 7.2 Algorithm

The problem is a Social Golfer Problem variant with an added same-company soft constraint. We use **constructive seed + swap-based local search**:

1. **Seed** (`seed.ts`): round-robin construction — for round `r`, person index `i` goes to area `(i + r·k) mod A` where `k` is coprime to `A`; each area's arrivals are partitioned in order into groups of `groupSize`. Deterministic baseline.
2. **Cost** (`cost.ts`):
   ```
   C = w1 * repeatedPairs + w2 * sameCompanyPairs
   w1 = 100, w2 = 10
   ```
   Uniqueness dominates; same-company is a strong secondary preference.
3. **Search** (`search.ts`), per restart, until `timeBudgetMs` elapses:
   - Propose a **seat swap**: pick two people from different groups in the same round; swap them.
   - Accept if `ΔC ≤ 0`.
   - Track best-ever schedule across restarts.
   - Occasional random-restart escape to leave plateaus.
4. **Under-fill**: if `roster.length < areas.length * groupSize`, distribute the shortfall as smaller groups (minimum group size = 2). If any would fall below 2, reduce the number of areas used in that round.
5. **Determinism**: seeded PRNG (`mulberry32`) — same seed → same schedule. Seed stored on the returned `Schedule`.
6. **Quality** (`quality.ts`): a single post-search pass computes `Quality`.

### 7.3 Files

```
src/domain/scheduler/
  seed.ts           # buildSeed(roster, params) → Round[]
  cost.ts           # pairKey, costOf(rounds, params), deltaOnSwap
  search.ts         # search(rounds, params, opts) → Round[]
  quality.ts        # computeQuality(rounds, roster) → Quality
  index.ts          # generateSchedule orchestrator
  seed.test.ts
  cost.test.ts
  search.test.ts
  quality.test.ts
```

## 8. Pages and flows

Top-level nav (`AppLayout`): **Setup → Schedule → Print → Run**. Steps advance only when the previous is valid; user can always navigate backwards.

### 8.1 SetupPage
- **Roster panel**: drop-zone / file picker for `.xlsx` / `.csv`; preview table; inline row-level errors (missing name, duplicate name); manual add/edit/delete row; column mapper for `Name` and `Company`.
- **Parameters panel**: number inputs for group size, area count, round count; area label editor (editable chips A–J); duration + move sliders; avoid-same-company toggle; breaks editor (add/remove `{after round N, seconds, label}`).
- **Validation banner**: seat count vs roster size, "will have empty seats", "impossible with these constraints".
- **CTA**: "Generate schedule" → `/schedule`.

### 8.2 SchedulePage
- **Generate** with editable seed and "Try again" (new random seed).
- **Progress bar** while search runs (time-budget driven).
- **Quality summary card**: repeated pairs, same-company violations, worst-case sample.
- **Round-by-round table**: rows = rounds, columns = areas, cells = comma-separated member names; click cell to open a drawer with company chips.
- **Per-person view (toggle)**: rows = people, columns = rounds, cells = area label; hover tooltip lists the other three; "never met" count per row.
- **CTA**: "Print materials" → `/print`.

### 8.3 PrintPage
- Five artifact tiles: **Personal plans**, **Name tags**, **Area signs**, **Master matrix**, **Quality report**.
- Each tile: description, small live preview, "Download PDF" + "Preview full" buttons.
- **Download all as zip** (via `jszip`).
- **CTA**: "Start event" → `/run`.

### 8.4 RunPage
- **Header strip**: current round X of N, phase indicator, big countdown timer, controls (Start / Pause / Skip phase / Skip to next round / End event).
- **Area grid** (floor-plan-style, e.g. 5×2 for 10 areas). Each card shows the area label and up to 4 chips with `Name / Company`. Card states:
  - **conversation** — calm border, timer visible on card.
  - **move** — amber pulse; per-chip arrow overlay showing each person's *next* area (e.g. "→ F").
  - **break** — full-screen break card (label + countdown + Skip / Extend +1min); area grid dimmed behind it.
  - **finished** — celebratory summary + link to quality report.
- **Search box**: type a name → highlight the card containing them ("where's Bob?").
- **Next-round ghost**: toggle to preview next round's arrangement without changing live state.

## 9. Print artifacts (`src/components/pdf/`)

Rendered with `@react-pdf/renderer` so multi-page layouts stay deterministic across browsers.

| Artifact | Component | Layout |
| --- | --- | --- |
| Personal plan (perforated tear-off) | `PersonalPlanPdf` | One A4 per person, 10 mini-tags in a 5×2 grid. Each mini-tag: Round N / Area X / "Meet: Alice, Bob, Carol". Dashed borders act as perforation guides. |
| Name tags | `NameTagsPdf` | 4-up A4, 2×2 grid. Big Name, smaller Company. |
| Area signs | `AreaSignsPdf` | One A4 per area. Very large centred letter. |
| Master matrix | `MasterMatrixPdf` | A4 landscape (A3 optional). Grid Round × Area; cells list member names. |
| Quality report | `QualityReportPdf` | Summary numbers; per-person "never met" list. |

## 10. State and persistence (`src/state/`)

- `EventContext.tsx` — React context exposing `state: EventState | undefined`, plus discrete actions (`importRoster`, `updateParams`, `generateSchedule`, `startRun`, `advancePhase`, `clearEvent`, …). No Redux/Zustand — one event, one context.
- `persistence.ts` — `load()`, `save(state)`, `clear()`. `EventContext` calls `save` on mutations, throttled to 250ms for `runState` changes and only on **phase transitions** (not per-tick, since the timer is derived from `phaseStartedAt`).
- Boot: `App` mounts → `load()` → hydrate context if present, otherwise empty Setup.
- **Explicit clear**: "New event" menu item in `AppLayout` with confirm dialog → `clear()` → back to Setup.
- Size: `EventState` for 40 people + full schedule fits comfortably in tens of KB. `localStorage` is sufficient.

## 11. Error handling

Only at real boundaries:

- **Import** — parse errors surfaced as row-level messages on SetupPage. Never rethrown to an error boundary; the user needs to see *which row* failed.
- **Impossible schedule** — SetupPage validation banner blocks "Generate" with a clear message.
- **`localStorage` unavailable / quota** — warn once on boot; app still works, just doesn't persist.
- **PDF rendering** — wrap each artifact download in try/catch; surface a snackbar naming the failed artifact; other artifacts remain downloadable.
- No global ErrorBoundary tricks beyond React's default; no defensive checks for internal invariants.

## 12. Testing

### 12.1 Unit (Vitest) — `src/domain/`
- `parseRoster`: valid xlsx, valid csv, missing columns, duplicate names, empty rows.
- `scheduler/seed`: shape correctness for 40×4×10, 20×4×5, and under-fill (30 people / 10 areas × 4).
- `scheduler/cost` & `search`: cost monotonically non-increasing; terminates within budget; deterministic given a seed.
- `scheduler/quality`: repeat count, same-company count, per-person `neverMetIds` complement.
- **Regression** — 40 people / 10 areas / 4 group / 10 rounds: 0 repeats when `avoidSameCompany=false`; bounded degradation when on.

### 12.2 Component (Vitest + Testing Library)
- **SetupPage** — file upload → preview → validation flow.
- **SchedulePage** — generate → summary shows expected counts (scheduler mocked with fixed schedule).
- **RunPage** — timer transitions conversation → move → break → next round (fake timers).

### 12.3 E2E (Cypress) — one golden-path spec
- Upload fixture xlsx (25 people) → configure params → generate → check quality card → open Print → click each artifact download → start Run → advance a round.

### 12.4 PDF snapshot (optional)
- Render each PDF component to a fixture; assert page count and selected text via `pdf-parse`. Cheap regression net.

## 13. Dependencies to add

| Package | Purpose |
| --- | --- |
| `xlsx` (SheetJS) | Excel + CSV parsing |
| `@react-pdf/renderer` | PDF generation |
| `nanoid` | Stable person IDs |
| `jszip` | "Download all" bundle |
| `file-saver` | Cross-browser blob downloads |

## 14. File layout summary

```
src/
  domain/
    types.ts
    parseRoster.ts
    parseRoster.test.ts
    scheduler/
      index.ts
      seed.ts
      cost.ts
      search.ts
      quality.ts
      *.test.ts
  state/
    EventContext.tsx
    persistence.ts
  pages/
    SetupPage.tsx
    SchedulePage.tsx
    PrintPage.tsx
    RunPage.tsx
  components/
    AppLayout.tsx
    pdf/
      PersonalPlanPdf.tsx
      NameTagsPdf.tsx
      AreaSignsPdf.tsx
      MasterMatrixPdf.tsx
      QualityReportPdf.tsx
  router.tsx
  App.tsx
  theme.ts
  index.tsx
cypress/
  e2e/
    golden-path.cy.ts
```

## 15. Build sequence (for later `writing-plans`)

1. Domain types + `parseRoster` + tests.
2. Scheduler (`seed`, `cost`, `search`, `quality`) + tests, including the 40×4×10 regression.
3. `EventContext` + `persistence`.
4. `AppLayout` with 4-page nav; scaffolded page shells.
5. `SetupPage` (import + parameters + validation).
6. `SchedulePage` (generate + quality + tables).
7. PDF components + `PrintPage`.
8. `RunPage` (timer state machine + area grid + break phase).
9. E2E golden path + PDF snapshot tests.
