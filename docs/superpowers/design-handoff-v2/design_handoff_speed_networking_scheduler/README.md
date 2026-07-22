# Handoff: Speed Networking Scheduler

## Overview
A local-only single-page app that lets an event **organiser** turn a roster (imported or hand-entered) plus a few parameters into a **pairwise-balanced speed-networking schedule**, then print materials, generate per-attendee emails, and **run the live event** with a big-screen timer and a floor-plan view of every area.

The design realises the accepted spec (`uploads/2026-07-22-speed-networking-scheduler-design.md`) and its implementation plan (`uploads/2026-07-22-speed-networking-scheduler.md`), and extends them with organiser/attendee usability features that emerged during design review (projects, schedule import/export, email generation, name-tag configurator, icebreakers, sound cues, meet-the-gap round, follow-up emails, theming).

## About the Design Files
The two files in this bundle are **design references created in HTML** — working prototypes that show the intended look and behaviour. They are **not production code to copy directly**. The task is to **recreate these designs in the target codebase** using its established stack and patterns.

The spec/plan target stack is: **React 19 + TypeScript, Rsbuild, React Router 7, MUI 9, `@react-pdf/renderer`, `xlsx` (SheetJS), `nanoid`, `jszip`, `file-saver`, Vitest + Testing Library, Cypress.** Prefer that stack. The prototype's framework-free `src/domain/` design (types → prng → parseRoster → scheduler{seed,cost,search,quality,index}) from the plan should be implemented as written — the prototype's scheduler is a faithful JS port of that algorithm and can be used to validate the TypeScript version's outputs.

Both design files are **single-file prototypes** (a bespoke streaming component runtime). Treat the two only as **two visual themes of one product** — the feature set is identical.

## Fidelity
**High-fidelity.** Final colours, typography, spacing, layout, copy, and interactions. Recreate pixel-closely using the codebase's component library (MUI). Exact tokens are listed under **Design Tokens** below. The two files differ **only** in skin:

- **`Speed Networking Scheduler.dc.html`** — "Terminal" theme. Dark, dense, hairline-based, square-cornered (2px radii), **Lato**, no shadows/blur/glow. Follows the bound *Credit Trading Terminal* design system.
- **`Speed Networking Scheduler v2.dc.html`** — "Modern" theme. **Instrument Sans**, 8px radii, soft shadows, blur on overlays, and a **runtime light/dark switch** (moon/sun in the header). Dark sub-theme is a warm graphite with a **violet** accent; light sub-theme is warm off-white with **emerald + indigo** accents. This diverges from the bound design system by explicit user request.

Ship **one** implementation with a theme layer (light / graphite-violet / terminal-dark). The terminal file is the reference for density; v2 is the reference for the modern skin and theming mechanics.

## Screens / Views
Top-level nav is a 4-step flow in the header: **Setup → Schedule → Print → Run**, plus a global **Projects** dropdown and (v2) a theme toggle. Nav items show a two-digit index (01–04) and highlight the active page with an accent underline.

### Global shell (header)
- **Left**: product wordmark + "Scheduler" caption.
- **Center**: 4 nav tabs (`01 Setup`, `02 Schedule`, `03 Print`, `04 Run`). Active tab = primary text + 2px accent bottom-border; inactive = muted text, transparent border; hover raises row background one step.
- **Right**: active project name (opens **Projects** dropdown), [v2] theme toggle, **New event** button. Two hidden `<input type=file>` elements (schedule `.json` import; roster `.csv/.json` import).

### Projects dropdown (global)
- Anchored panel, ~320px wide. Header "Projects · N saved" + hairline.
- Scrollable list of projects; each row: name, meta (`<people> people · <plans> plans · <date> <time>`), **Load** pill (accent outline), delete ×.
- Empty state copy: "No projects yet — create one or import a .json file."
- Footer buttons: **New project** (accent), **Export .json**, **Import**.
- Behaviour: each project holds its own roster + params + plans + active plan index. Switching loads that project; the active project auto-saves on every param/roster/plan change. A "Demo event" project (40 people, 12 companies, emails) is seeded on first run.

### 1. Setup
Two-column layout (roster left ~1.3fr, parameters right ~1fr); stacks on mobile.

**Roster panel (left):**
- Header: "Roster", meta (`N people · M companies` or "empty project"), **Import .csv / .json** button.
- **Add-person form row** (always visible): Name / Company / Email inputs + **Add person** button; when editing an existing row the button becomes **Save** and a **Cancel** appears.
- **Empty state** (no people): dashed drop-zone with an upload icon, the expected CSV format shown literally (`Name,Company,Email` + two sample rows), an "or" divider, and a **Try with a 40-person demo roster** button.
- **Populated state**: table with columns `# | Name | Company | Email | (actions)`. Each row has edit (pen) and delete (×) icons; the row being edited is highlighted. Emails render in the info/link colour.

**Parameters panel (right):**
- **Suggested setup** card (accent-tinted): a sentence recommending areas × seats, rounds, and durations computed from roster size, with an **Apply suggestion** button. When roster empty: prompt to import first.
- **Parameters** block: number inputs for Group size, Areas, Rounds, Round length (sec), Move time (sec); an **Avoid same company** toggle (pill switch).
- **Breaks** sub-section: **+ Add break** and a list of `{label · after round N · M min}` rows with remove ×.
- **Validation** block: coloured dot + line per rule (see Form validation).
- **Generate schedule** CTA (primary), disabled + greyed when any hard-block validation is present.

### 2. Schedule
- **Plans bar**: "PLANS" label + a chip per plan (`Plan k`, sub = `<repeats> rpt · <sameCo> same-co`, green sub when 0 repeats), active chip has accent border. **+ New plan** adds a plan from a random seed. Right-aligned meta (`seed N · optimised in-browser`).
- **Quality card** (left): stat grid — MEETINGS, UNIQUE PAIRS, REPEATS (green if 0 else red), SAME COMPANY, AVG NEW PEOPLE — each a big tabular number + caption. Cards separated by 1px hairlines (per-card left border, not a gap-background). Below: a note line.
- **Never-met explorer** (right): a range slider over the roster sorted worst-first (most unmet → fewest). Selected person card (accent-tinted): name, company, `X met · Y never`, and wrapping chips listing every person they will never meet (`Name · Company`). Chips are `display:inline-block; white-space:nowrap`.
- **Table panel**: title + a view toggle **Rounds × Areas** / **People × Rounds**, and a **Print materials** CTA.
  - *Rounds × Areas*: sticky-ish header `RND | Area A | Area B | …`; each row = a round (`01`, `02`, …), each cell lists member names. Horizontal scroll; min-width scales with area count. Top border of header uses the accent.
  - *People × Rounds*: header `PERSON | R1 … | NEVER MET`; each row = a person, cells = area letter per round, last cell = never-met count coloured green (best) / muted / orange (worst).

### 3. Print
- Header: "Print materials", meta (project · people · areas · "live previews — PDF/zip export ships with the build"), **Download all (.zip)**, **Start event** CTA.
- **Five artifact tiles** (responsive grid, min 230px): each = paper-style preview thumbnail + title + description + a **PDF** button whose label shows the true page count:
  1. **Personal plans** — `N` pages, one per person; tear-off mini-tag per round (round, area, who to meet).
  2. **Name tags** — page count from the tag configurator; "Big name, smaller company. Size and per-page layout set below."
  3. **Area signs** — `A` pages, one per area in use; very large centred letter.
  4. **Master matrix** — 1 page, A4 landscape; Round × Area grid.
  5. **Quality report** — summary + per-person never-met lists.
- **Name tag layout** panel: width/height in mm (number inputs), and chip groups for **Name alignment** (Left/Center), **Company position** (Under name / Tag bottom), **Name size** (S/M/L). Two live previews: a single tag at true aspect ratio with real roster data, and an A4 sheet grid. Meta line: `W×H mm · cols × rows = per-page · pages for N people` (grid auto-computed from A4 = 190×277mm usable). Settings persist on the project.
- **Attendee emails** panel: mode toggle **Invitation / Follow-up**.
  - *Invitation*: greeting + intro (durations/rounds from params) + a table of `Round | Area | You'll meet` + tip outro.
  - *Follow-up*: intro + a table of everyone met (`Name | Company | Email`) + an outro noting how many they didn't reach.
  - Prev/next stepper across all attendees (`k / N`), **Copy text**, **Download .eml** (single draft with `X-Unsent:1`), **Generate all** (one text file, all attendees, separator between). Rendered as a light "paper" email preview regardless of app theme.

### 4. Run (big-screen / projector)
- **Header strip**: ROUND `k / N`, phase badge, huge countdown timer, controls: **Start event / Pause / Resume / Restart**, **Skip phase**, **Next round**, **End**.
- **Phase progress bar**: thin bar under controls, fills over the current phase, coloured per phase (accent talk / orange move / info break / accent gap).
- **Icebreaker banner** (idle/conversation/move): "ICEBREAKER · ROUND k" (or "NEXT ICEBREAKER" during move) + a rotating prompt.
- **Toolbar**: name search ("Where's who?"), **Next-round ghost** toggle, **Edit floor layout** toggle, **×10 demo speed** toggle, **Sound** toggle, right-aligned hint.
- **Floor grid**: area cards positioned on a floor plan.
  - Wide screens: absolutely-positioned draggable cards (5×2 default). When **Edit floor layout** is on, drag a card to reposition; layout saved to `localStorage` (`sns:floorV1`).
  - Narrow screens: responsive grid of cards (drag disabled).
  - Card: big area letter + seat count; member rows (`Name · Company`), and during **move** an arrow to each person's next area (`→ F` or `✓`). During move, non-highlighted cards pulse/glow (v2) or pulse border (terminal). Search matches highlight the card + names in accent. Ghost toggle shows next round's names faintly.
- **Phase overlays**:
  - *Break*: dimmed/blurred floor + centered card "BREAK", label, big countdown, **Skip break** / **+1 minute**.
  - *Finished*: overlay "EVENT COMPLETE / That's a wrap", summary line, **View quality report**, **Meet-the-gap round · 5:00**, **Reset run**.
  - *Meet-the-gap*: replaces the floor with per-person cards ("find: <top-3 never-met names>"); 5:00 timer; a free-form final mingle.
- **Timer warnings**: at **15s** left in conversation and **10s** left in move, the timer turns orange and pulses (+glow in v2).
- **Sound cues**: two-tone rising chime at round start; lower two-tone at move/break start. WebAudio, gated by the Sound toggle, persisted (`sns:soundV1`).

## Interactions & Behavior
- **Navigation**: header tabs switch pages; CTAs advance the flow (Generate→Schedule, Print materials→Print, Start event→Run).
- **Timer state machine** (derive elapsed from a `phaseStartedAt` timestamp, not per-tick persistence): `idle → conversation → move → (break?) → conversation(next) … → finished`. From `finished`, an optional `gap` phase. Pause captures remaining time and the phase to resume into. A 250ms interval drives the countdown; demo speed multiplies elapsed ×10.
- **Durations**: conversation = `roundSeconds − moveSeconds`; move = `moveSeconds`; break = the matching break's seconds; gap = 300s.
- **Animations/motion**: terminal theme uses only opacity pulses and border pulses (no bounce/spring; easing `cubic-bezier(0.2,0,0,1)`, ~120–280ms). v2 adds soft shadows, a running-timer glow, width-transition on the progress bar, and `backdrop-filter: blur(6px)` on break/finished overlays.
- **Responsive**: <760px switches the floor to a grid and disables drag; header, forms, tiles all wrap. Timer uses `clamp()`.
- **Downloads** (real in prototype): schedule/project `.json` export & import (FileReader), `.eml` per attendee, all-emails `.txt`. **Stubbed** (toast only, wire in build): all PDF generation and the "Download all .zip".
- **Clipboard**: Copy text uses `navigator.clipboard`.

## State Management
Implement per the plan's `EventContext` + reducer, extended with a **project layer**:
- **Project**: `{ id, name, savedAt, roster, params, plans[], planIdx }`. Library of projects persisted under one key; the active project mirrors live edits.
- **Params** (`EventParams` from spec §6) + additions: `tagCfg { w, h, align, companyPos, nameSize }`; `breaks[]` as specified.
- **Plan** = the spec's `Schedule` (rounds + quality + seed + generatedAt) plus derived lookups `met` (per-person Set) and `areaByRound`.
- **RunState**: `{ round, phase, remainMs, durMs, last, paused }` in memory; phase transitions are what get persisted (per spec §10).
- **UI/session**: `page`, `viewMode`, `personSlider`, `search`, `editFloor`, `ghost`, `demo`, `sound`, `emailMode`, `theme`, add-person `form` + `formEditId`, `libOpen`, `toast`.
- **Persistence keys** (localStorage): projects library, floor layout (`sns:floorV1`), sound (`sns:soundV1`), theme (`sns:themeV1`). Everything is single-user, browser-only (spec §4).

## Scheduler (implement from the plan, not the prototype's inline port)
Social-Golfer variant: **constructive round-robin seed → swap-based hill-climb** with plateau walk (p=0.2) + restarts on stagnation (500). Cost `C = 100·repeatedPairs + 10·sameCompanyPairs`. Under-fill → smaller groups (min 2), then fewer areas. Seeded `mulberry32` for determinism; seed stored on the schedule. Quality computed in one post pass. See plan Tasks 2–8 for exact code, tests, and the 40×10×4×10 regression (0 repeats when `avoidSameCompany=false`).

## Form validation (Setup)
- **Hard blocks** (red dot, disable Generate): roster empty; `groupSize < 2`; seats (`areas·groupSize`) `< N`; any break `afterRound` outside `[1, numRounds−1]`. (Also degenerate `areas<1`, `numRounds<1`.)
- **Soft warnings** (orange, non-blocking): empty seats when `seats > N`.
- **Info** (blue/accent): "parameters changed — regenerate to apply" after edits.
- **Ready** (green): `seats seats / N people · each meets min(rounds·(groupSize−1), N−1) of N−1`.

## Design Tokens

### Terminal theme (file 1) — Credit Trading Terminal
Font **Lato** (`letter-spacing:-0.02em`, tabular-nums for all numbers). Radii **2px** (4px composer). No shadows/blur.
- App bg `#000`; panel `#0A0C0F` (`rgb(10,12,15)`); inset `#2E3541`(`rgb(46,53,65)`); hover `rgb(25,28,33)`; quiet inset `rgb(38,43,50)`.
- Hairlines `#3D3D3D`, `#585858`, `#505050`, `rgb(51,51,51)`, input stroke `rgb(56,66,83)`.
- Text: white `#fff`; title `rgb(190,190,190)`; muted `rgb(173,169,169)`; label `rgb(135,135,135)`; subtle `rgb(136,136,136)`.
- Signals: mint `rgb(57,233,169)` / bright `rgb(44,255,170)` (Won/keen/positive/active); crimson `rgb(189,51,51)` (Lost/negative); blue CTA `rgb(25,96,159)`; info `rgb(140,167,236)`; orange `rgb(255,114,70)` (move/warn).

### Modern theme (file 2) — CSS variables, switchable
Font **Instrument Sans**, tabular-nums for numbers. Radii **8px**. Soft shadow token `--cardsh`.

Light (`.sns-light`): `--bg#F2F2EC --panel#FFFFFF --hover#F3F3EC --inset#EFEFE8 --dim#D9D9CF` · lines `#ECECE5 #E3E3DB #DDDDD3 #D5D5CB #CFD2C8` · text `#1A1C22 #3F434C #5A5E66 #83868E` + body `#4A4E57` · **acc #0D9B6C** (emerald) · red `#CB4238` · orange `#DE7326` · **cta #4A57D2** (indigo) · info `#5F6DE0` · tints tgb/tgr `#EDF7F1/#C4E5D5`, tib/tir `#EEF0FB/#D3D8F4` · disabled `#DBDBD2/#9A9DA4` · `--cardsh rgba(26,28,34,.07)`.

Dark (`.sns-dark`, warm graphite + violet): `--bg#141416 --panel#1C1C1F --hover#242428 --inset#28282D --dim#333338` · lines `#26262A #2B2B30 #303036 #3A3A41 #404049` · text `#ECECEE #CFCFD4 #A6A6AD #828289` + body `#BCBCC2` · **acc #9D8CFF** (violet) · red `#E56B60` · orange `#EFA05C` · **cta #6673E8** · info `#8E9BF0` · tints `#272438/#3C3859`, `#232637/#383D5C` · disabled `#2E2E33/#77777E` · `--cardsh rgba(0,0,0,.4)`.

Email/paper previews stay literal light values in both themes: paper `#ffffff` (+`#E6E6DE` border), header row `#F1F1EA`, muted `#8A8D94`, body `#4a4e57`, ink `#1a1c22`. Toast is a dark inverse pill `#22242B` with white text.

### Shared
- Spacing ladder 4/8/12/16/24/32; outer gutter 8px; panel padding ~12–16px.
- A4 usable area for tag grid math: **190 × 277 mm**.
- Icons: **Font Awesome 6** (free CDN in the prototype; swap for the licensed Pro kit in prod — class names match). No emoji, no unicode icons.

## Assets
- **Fonts**: Lato (terminal) and Instrument Sans (modern), both from Google Fonts.
- **Icons**: Font Awesome 6 (free CDN). Replace with your licensed Pro kit for production.
- **Sample data**: a built-in 40-person / 12-company demo roster with generated emails (used for the "Demo event" project and demos). No photography or illustration anywhere.
- No other binary assets.

## Files
- `Speed Networking Scheduler.dc.html` — Terminal (dark) theme, full app.
- `Speed Networking Scheduler v2.dc.html` — Modern theme with light/dark switch, full app (feature-identical).
- `2026-07-22-speed-networking-scheduler-design.md` — accepted design spec (domain model §6, scheduler §7, pages §8, PDFs §9, state §10).
- `2026-07-22-speed-networking-scheduler.md` — task-by-task implementation plan with tests.

Open either `.dc.html` in a browser to interact with the reference. The two markdown docs are the source of truth for the domain/algorithm; this README is the source of truth for UI, copy, tokens, and the added features.
