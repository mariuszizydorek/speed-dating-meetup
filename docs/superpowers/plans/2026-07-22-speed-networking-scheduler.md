# Speed Networking Scheduler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only SPA (React 19 + Rsbuild + MUI) that lets an event organiser import a roster from Excel/CSV, generate a pairwise-balanced speed-networking schedule, print materials (personal plans, name tags, area signs, master matrix, quality report), and run the live event with a big-screen timer and per-round area visualisation.

**Architecture:** Framework-free `src/domain/` (types, roster parsing, scheduler); `src/state/` (React context + localStorage persistence); four pages `Setup → Schedule → Print → Run` navigated via React Router; PDFs rendered with `@react-pdf/renderer`. Single-event persistence in `localStorage` under one versioned key.

**Tech Stack:** React 19, TypeScript (`verbatimModuleSyntax: true`), Rsbuild, MUI 9, React Router 7, `@react-pdf/renderer`, `xlsx` (SheetJS), `nanoid`, `jszip`, `file-saver`, Vitest + Testing Library, Cypress.

**Spec:** `docs/superpowers/specs/2026-07-22-speed-networking-scheduler-design.md`.

---

## Read First

Before executing any task:

1. Skim the spec (link above) — every domain concept and decision is anchored there.
2. `tsconfig.json` sets `verbatimModuleSyntax: true`, `noUnusedLocals: true`, `noUnusedParameters: true`. All type-only imports MUST use `import type { … }`. Do not leave unused parameters — prefix with `_` if unavoidable.
3. Component tests must wrap the rendered tree in `<ThemeProvider theme={theme}>` and a router (`<MemoryRouter>` for pages, no router for pure components). See existing `src/pages/HomePage.test.tsx` for the pattern.
4. Every task ends with a **commit** step. Commit messages follow: `feat: …`, `test: …`, `chore: …`, `refactor: …` (Conventional Commits — style matches the initial commit).
5. Run the full test suite (`pnpm test`) at the end of each task before committing, not just the new test file.

---

## File Structure

Files created or modified by this plan (in dependency order):

**New**
- `src/domain/types.ts` — all TypeScript interfaces from spec §6.
- `src/domain/prng.ts` — seeded mulberry32 PRNG.
- `src/domain/parseRoster.ts` — Excel/CSV → `Person[]` with row-level errors.
- `src/domain/parseRoster.test.ts`
- `src/domain/scheduler/seed.ts` — round-robin constructive seed.
- `src/domain/scheduler/seed.test.ts`
- `src/domain/scheduler/cost.ts` — `pairKey`, `costOf`, `deltaOnSwap`.
- `src/domain/scheduler/cost.test.ts`
- `src/domain/scheduler/search.ts` — swap-based hill-climb with plateau walk + restarts.
- `src/domain/scheduler/search.test.ts`
- `src/domain/scheduler/quality.ts` — `computeQuality` (repeats, same-company, per-person never-met).
- `src/domain/scheduler/quality.test.ts`
- `src/domain/scheduler/index.ts` — `generateSchedule` orchestrator + regression test.
- `src/domain/scheduler/index.test.ts`
- `src/state/persistence.ts` — `load`, `save`, `clear` under one versioned key.
- `src/state/persistence.test.ts`
- `src/state/EventContext.tsx` — context + reducer + save-on-transition.
- `src/state/EventContext.test.tsx`
- `src/pages/SetupPage.tsx`
- `src/pages/SetupPage.test.tsx`
- `src/pages/SchedulePage.tsx`
- `src/pages/SchedulePage.test.tsx`
- `src/pages/PrintPage.tsx`
- `src/pages/PrintPage.test.tsx`
- `src/pages/RunPage.tsx`
- `src/pages/RunPage.test.tsx`
- `src/components/AreaGrid.tsx` — reusable area/group visualisation used by RunPage.
- `src/components/AreaGrid.test.tsx`
- `src/components/pdf/PersonalPlanPdf.tsx`
- `src/components/pdf/NameTagsPdf.tsx`
- `src/components/pdf/AreaSignsPdf.tsx`
- `src/components/pdf/MasterMatrixPdf.tsx`
- `src/components/pdf/QualityReportPdf.tsx`
- `src/components/pdf/pdf.test.tsx` — one test file with a snapshot per PDF component.
- `cypress/fixtures/roster-25.csv` — 25-person fixture for E2E.
- `cypress/e2e/golden-path.cy.ts`

**Modified**
- `package.json` — add dependencies.
- `src/router.tsx` — replace HomePage/AboutPage routes with Setup/Schedule/Print/Run.
- `src/components/AppLayout.tsx` — replace Home/About nav with a 4-step stepper-nav.

**Deleted**
- `src/pages/HomePage.tsx`
- `src/pages/HomePage.test.tsx`
- `src/pages/AboutPage.tsx`

---

## Task 1: Add dependencies and domain types

**Files:**
- Modify: `package.json`
- Create: `src/domain/types.ts`

- [ ] **Step 1: Add dependencies**

Run:
```bash
pnpm add xlsx nanoid @react-pdf/renderer jszip file-saver
pnpm add -D @types/file-saver
```

Expected: `package.json` updated, `pnpm-lock.yaml` updated. `xlsx` may print a warning about SheetJS distribution — accept the npm build; it works fine for our use.

- [ ] **Step 2: Create the domain types file**

Create `src/domain/types.ts` with the exact contents from spec §6 (Domain model). Reproduced here for convenience:

```ts
export type PersonId = string;

export interface Person {
  id: PersonId;
  name: string;
  company: string;
  rowIndex: number;
}

export interface Area {
  id: string;
  label: string;
}

export interface BreakSlot {
  afterRound: number;
  seconds: number;
  label: string;
}

export interface EventParams {
  groupSize: number;
  areas: Area[];
  numRounds: number;
  roundSeconds: number;
  moveSeconds: number;
  avoidSameCompany: boolean;
  breaks: BreakSlot[];
}

export interface Group {
  areaId: string;
  memberIds: PersonId[];
}

export interface Round {
  index: number;
  groups: Group[];
  sittingOut: PersonId[];
}

export interface PerPersonQuality {
  id: PersonId;
  metIds: PersonId[];
  neverMetIds: PersonId[];
  repeatMeetings: number;
}

export interface Quality {
  totalPairs: number;
  uniquePairs: number;
  repeatedPairs: number;
  sameCompanyPairs: number;
  perPerson: PerPersonQuality[];
}

export interface Schedule {
  rounds: Round[];
  quality: Quality;
  seed: number;
  generatedAt: string;
}

export type RunPhase =
  | 'idle'
  | 'conversation'
  | 'move'
  | 'break'
  | 'paused'
  | 'finished';

export interface RunState {
  currentRoundIndex: number;
  phase: RunPhase;
  phaseStartedAt: number;
  pausedRemainingMs?: number;
}

export interface EventState {
  version: 1;
  roster: Person[];
  params: EventParams;
  schedule?: Schedule;
  runState?: RunState;
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml src/domain/types.ts
git commit -m "chore: add scheduler dependencies and domain types"
```

---

## Task 2: Seeded PRNG

**Files:**
- Create: `src/domain/prng.ts`
- Create: `src/domain/prng.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/domain/prng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mulberry32 } from './prng';

describe('mulberry32', () => {
  it('produces a stable sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toEqual(b());
  });

  it('returns values in [0, 1)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/domain/prng.test.ts`
Expected: FAIL, cannot find module `./prng`.

- [ ] **Step 3: Implement**

Create `src/domain/prng.ts`:

```ts
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickIntExclusive(rng: () => number, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/domain/prng.test.ts`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add src/domain/prng.ts src/domain/prng.test.ts
git commit -m "feat: add seeded mulberry32 PRNG"
```

---

## Task 3: Roster parsing

**Files:**
- Create: `src/domain/parseRoster.ts`
- Create: `src/domain/parseRoster.test.ts`

Design: accept an `ArrayBuffer` (works for both `.xlsx` and `.csv` — SheetJS auto-detects); return `{ people: Person[]; errors: RowError[] }`. Never throw for row-level issues.

- [ ] **Step 1: Write the failing test**

Create `src/domain/parseRoster.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parseRoster } from './parseRoster';

function csvBuffer(text: string): ArrayBuffer {
  const bytes = new TextEncoder().encode(text);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function xlsxBuffer(rows: Array<Record<string, string>>): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return out as ArrayBuffer;
}

describe('parseRoster', () => {
  it('parses a valid CSV with Name and Company', async () => {
    const buf = csvBuffer('Name,Company\nAlice,Acme\nBob,Beta\n');
    const result = await parseRoster(buf, 'roster.csv');
    expect(result.errors).toEqual([]);
    expect(result.people.map((p) => ({ name: p.name, company: p.company }))).toEqual([
      { name: 'Alice', company: 'Acme' },
      { name: 'Bob', company: 'Beta' },
    ]);
    // stable ids
    expect(new Set(result.people.map((p) => p.id)).size).toBe(2);
  });

  it('parses an xlsx buffer', async () => {
    const buf = xlsxBuffer([
      { Name: 'Alice', Company: 'Acme' },
      { Name: 'Bob', Company: 'Beta' },
    ]);
    const result = await parseRoster(buf, 'roster.xlsx');
    expect(result.errors).toEqual([]);
    expect(result.people).toHaveLength(2);
  });

  it('accepts missing Company (empty string)', async () => {
    const buf = csvBuffer('Name,Company\nAlice,\nBob,Beta\n');
    const result = await parseRoster(buf, 'roster.csv');
    expect(result.errors).toEqual([]);
    expect(result.people[0].company).toBe('');
  });

  it('reports rows with missing Name', async () => {
    const buf = csvBuffer('Name,Company\n,Acme\nBob,Beta\n');
    const result = await parseRoster(buf, 'roster.csv');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ rowIndex: 2, reason: 'missing_name' });
    expect(result.people).toHaveLength(1);
    expect(result.people[0].name).toBe('Bob');
  });

  it('reports duplicate names', async () => {
    const buf = csvBuffer('Name,Company\nAlice,Acme\nAlice,Beta\n');
    const result = await parseRoster(buf, 'roster.csv');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ rowIndex: 3, reason: 'duplicate_name' });
  });

  it('reports missing Name column', async () => {
    const buf = csvBuffer('First,Company\nAlice,Acme\n');
    const result = await parseRoster(buf, 'roster.csv');
    expect(result.people).toEqual([]);
    expect(result.errors[0]).toMatchObject({ rowIndex: 1, reason: 'missing_name_column' });
  });

  it('skips fully empty rows silently', async () => {
    const buf = csvBuffer('Name,Company\nAlice,Acme\n,\nBob,Beta\n');
    const result = await parseRoster(buf, 'roster.csv');
    expect(result.errors).toEqual([]);
    expect(result.people).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/domain/parseRoster.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Implement**

Create `src/domain/parseRoster.ts`:

```ts
import * as XLSX from 'xlsx';
import { nanoid } from 'nanoid';
import type { Person } from './types';

export type RowErrorReason =
  | 'missing_name_column'
  | 'missing_name'
  | 'duplicate_name';

export interface RowError {
  rowIndex: number; // 1-based, matching what the user sees in Excel (header = row 1)
  reason: RowErrorReason;
  message: string;
}

export interface ParseResult {
  people: Person[];
  errors: RowError[];
}

export async function parseRoster(
  buffer: ArrayBuffer,
  _filename: string,
): Promise<ParseResult> {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  const errors: RowError[] = [];
  const people: Person[] = [];

  if (rows.length === 0) {
    return { people, errors };
  }

  const nameKey = findKey(rows[0], ['name', 'full name', 'attendee']);
  const companyKey = findKey(rows[0], ['company', 'organization', 'organisation', 'org']);

  if (!nameKey) {
    errors.push({
      rowIndex: 1,
      reason: 'missing_name_column',
      message: 'The first sheet must have a "Name" column.',
    });
    return { people, errors };
  }

  const seen = new Set<string>();

  rows.forEach((row, idx) => {
    // idx 0 corresponds to the first data row → Excel row 2 (header = row 1).
    const excelRow = idx + 2;
    const name = String(row[nameKey] ?? '').trim();
    const company = companyKey ? String(row[companyKey] ?? '').trim() : '';

    if (!name && !company) {
      // Fully empty row — silently skip.
      return;
    }
    if (!name) {
      errors.push({
        rowIndex: excelRow,
        reason: 'missing_name',
        message: `Row ${excelRow}: missing Name.`,
      });
      return;
    }
    const lower = name.toLowerCase();
    if (seen.has(lower)) {
      errors.push({
        rowIndex: excelRow,
        reason: 'duplicate_name',
        message: `Row ${excelRow}: duplicate name "${name}".`,
      });
      return;
    }
    seen.add(lower);
    people.push({
      id: nanoid(10),
      name,
      company,
      rowIndex: excelRow,
    });
  });

  return { people, errors };
}

function findKey(sample: Record<string, unknown>, aliases: string[]): string | undefined {
  const keys = Object.keys(sample);
  const lowerMap = new Map(keys.map((k) => [k.toLowerCase().trim(), k] as const));
  for (const alias of aliases) {
    const hit = lowerMap.get(alias);
    if (hit) return hit;
  }
  return undefined;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/domain/parseRoster.test.ts`
Expected: 7 passing.

- [ ] **Step 5: Full suite + commit**

Run: `pnpm test`
Expected: all passing.

```bash
git add src/domain/parseRoster.ts src/domain/parseRoster.test.ts
git commit -m "feat: parse roster from xlsx/csv with row-level error reporting"
```

---

## Task 4: Scheduler — constructive seed

**Files:**
- Create: `src/domain/scheduler/seed.ts`
- Create: `src/domain/scheduler/seed.test.ts`

Algorithm (spec §7.2, step 1): for round `r`, person `i` → area `(i + r·k) mod A` where `k` = smallest integer ≥ `groupSize` coprime to `A` (fallback `k = 1` if none exists in `[groupSize, A)`). Each area's arrivals are partitioned in order into groups of `groupSize`. Under-fill: shortfall distributed as smaller groups (min size 2).

- [ ] **Step 1: Write the failing test**

Create `src/domain/scheduler/seed.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildSeed, chooseCoprimeK } from './seed';
import type { EventParams, Person } from '../types';

function roster(n: number, companyStride = 1): Person[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    company: `C${Math.floor(i / companyStride)}`,
    rowIndex: i + 2,
  }));
}

function params(overrides: Partial<EventParams> = {}): EventParams {
  return {
    groupSize: 4,
    areas: Array.from({ length: 10 }, (_, i) => ({
      id: String.fromCharCode(65 + i),
      label: String.fromCharCode(65 + i),
    })),
    numRounds: 10,
    roundSeconds: 180,
    moveSeconds: 30,
    avoidSameCompany: false,
    breaks: [],
    ...overrides,
  };
}

describe('chooseCoprimeK', () => {
  it('picks the smallest k >= groupSize coprime to A', () => {
    expect(chooseCoprimeK(4, 10)).toBe(7); // 4,5,6 share factors; 7 coprime
    expect(chooseCoprimeK(3, 7)).toBe(3);
    expect(chooseCoprimeK(1, 5)).toBe(1);
  });

  it('falls back to 1 when no coprime k exists in [groupSize, A)', () => {
    expect(chooseCoprimeK(4, 4)).toBe(1);
  });
});

describe('buildSeed', () => {
  it('produces one Round per numRounds, with A groups each', () => {
    const p = params();
    const r = roster(40);
    const rounds = buildSeed(r, p);
    expect(rounds).toHaveLength(10);
    for (const round of rounds) {
      expect(round.groups).toHaveLength(10);
      const total = round.groups.reduce((s, g) => s + g.memberIds.length, 0);
      expect(total).toBe(40);
    }
  });

  it('assigns every person exactly once per round', () => {
    const p = params();
    const r = roster(40);
    const rounds = buildSeed(r, p);
    for (const round of rounds) {
      const ids = round.groups.flatMap((g) => g.memberIds);
      expect(new Set(ids).size).toBe(40);
    }
  });

  it('handles under-fill by using smaller groups (min 2)', () => {
    const p = params({ areas: params().areas.slice(0, 4), numRounds: 4, groupSize: 4 });
    // 4 areas × 4 = 16 seats, but 10 people
    const r = roster(10);
    const rounds = buildSeed(r, p);
    for (const round of rounds) {
      const sizes = round.groups.map((g) => g.memberIds.length);
      for (const s of sizes) expect(s).toBeGreaterThanOrEqual(2);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(10);
    }
  });

  it('shrinks areas used when there are not enough people for min group size 2', () => {
    const p = params({ areas: params().areas.slice(0, 4), numRounds: 4, groupSize: 4 });
    const r = roster(3); // only 3 people → only 1 group of 3 possible
    const rounds = buildSeed(r, p);
    for (const round of rounds) {
      const used = round.groups.filter((g) => g.memberIds.length > 0);
      expect(used).toHaveLength(1);
      expect(used[0].memberIds).toHaveLength(3);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/domain/scheduler/seed.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/domain/scheduler/seed.ts`:

```ts
import type { EventParams, Group, Person, Round } from '../types';

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function chooseCoprimeK(groupSize: number, areaCount: number): number {
  for (let k = groupSize; k < areaCount; k++) {
    if (gcd(k, areaCount) === 1) return k;
  }
  return 1;
}

export function buildSeed(roster: Person[], params: EventParams): Round[] {
  const A = params.areas.length;
  const G = params.groupSize;
  const N = roster.length;
  const k = chooseCoprimeK(G, A);
  const rounds: Round[] = [];

  for (let r = 0; r < params.numRounds; r++) {
    // Assign each person to an area for this round.
    const buckets: string[][] = Array.from({ length: A }, () => []);
    for (let i = 0; i < N; i++) {
      const areaIdx = (i + r * k) % A;
      buckets[areaIdx].push(roster[i].id);
    }

    // Convert buckets into groups. For a normally-sized event (N === A*G),
    // each bucket has exactly G people. For under-fill, we distribute.
    const groups: Group[] = params.areas.map((area) => ({
      areaId: area.id,
      memberIds: [],
    }));

    if (N === A * G) {
      for (let a = 0; a < A; a++) groups[a].memberIds = buckets[a];
    } else if (N >= 2) {
      // Under-fill or over-fill relative to A*G. We just consume people
      // in arrival order (per-bucket flatten) and pack area-by-area,
      // giving out groups of size G until we can't sustain the min size 2.
      const flat: string[] = [];
      for (const b of buckets) flat.push(...b);

      // Determine how many areas we can actually fill with >= 2 each.
      // Distribute as evenly as possible in groups of size <= G, min 2.
      const usableAreas = Math.min(A, Math.floor(N / 2));
      if (usableAreas === 0) {
        // Not enough people to form any group of 2; leave everyone sitting out.
        rounds.push({ index: r, groups, sittingOut: roster.map((p) => p.id) });
        continue;
      }

      // Compute per-area size: base = floor(N / usableAreas), remainder to first areas,
      // clipped to G.
      const sizes = distributeSizes(N, usableAreas, G);

      let cursor = 0;
      for (let a = 0; a < usableAreas; a++) {
        groups[a].memberIds = flat.slice(cursor, cursor + sizes[a]);
        cursor += sizes[a];
      }
    }

    rounds.push({ index: r, groups, sittingOut: [] });
  }

  return rounds;
}

function distributeSizes(total: number, buckets: number, maxSize: number): number[] {
  const sizes: number[] = [];
  let remaining = total;
  for (let a = 0; a < buckets; a++) {
    const areasLeft = buckets - a;
    // Give this bucket ceil(remaining/areasLeft), capped at maxSize, min 2.
    let size = Math.max(2, Math.min(maxSize, Math.ceil(remaining / areasLeft)));
    // If giving this bucket `size` leaves later buckets unable to hit 2 each, shrink.
    while (remaining - size < 2 * (areasLeft - 1) && size > 2) {
      size -= 1;
    }
    sizes.push(size);
    remaining -= size;
  }
  return sizes;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/domain/scheduler/seed.test.ts`
Expected: all passing.

- [ ] **Step 5: Full suite + commit**

Run: `pnpm test`
Expected: all passing.

```bash
git add src/domain/scheduler/seed.ts src/domain/scheduler/seed.test.ts
git commit -m "feat: constructive round-robin schedule seed"
```

---

## Task 5: Scheduler — cost function

**Files:**
- Create: `src/domain/scheduler/cost.ts`
- Create: `src/domain/scheduler/cost.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/domain/scheduler/cost.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { costOf, deltaOnSwap, pairKey } from './cost';
import type { Person, Round } from '../types';

const W1 = 100;
const W2 = 10;

function person(id: string, company = 'X'): Person {
  return { id, name: id.toUpperCase(), company, rowIndex: 0 };
}

function round(index: number, groups: Array<{ areaId: string; memberIds: string[] }>): Round {
  return { index, groups, sittingOut: [] };
}

describe('pairKey', () => {
  it('is order-independent', () => {
    expect(pairKey('a', 'b')).toBe(pairKey('b', 'a'));
    expect(pairKey('a', 'b')).not.toBe(pairKey('a', 'c'));
  });
});

describe('costOf', () => {
  it('is zero when every pair meets at most once and no same-company', () => {
    const roster = [person('a', 'X'), person('b', 'Y'), person('c', 'X'), person('d', 'Y')];
    const rounds: Round[] = [
      round(0, [{ areaId: 'A', memberIds: ['a', 'b'] }, { areaId: 'B', memberIds: ['c', 'd'] }]),
      round(1, [{ areaId: 'A', memberIds: ['a', 'c'] }, { areaId: 'B', memberIds: ['b', 'd'] }]),
      round(2, [{ areaId: 'A', memberIds: ['a', 'd'] }, { areaId: 'B', memberIds: ['b', 'c'] }]),
    ];
    // All same-company pairs (a-c, b-d) do meet — so avoidSameCompany=false gives 0
    expect(costOf(rounds, roster, { avoidSameCompany: false })).toBe(0);
  });

  it('penalises repeated pairs with weight w1', () => {
    const roster = [person('a'), person('b'), person('c'), person('d')];
    const rounds: Round[] = [
      round(0, [{ areaId: 'A', memberIds: ['a', 'b'] }, { areaId: 'B', memberIds: ['c', 'd'] }]),
      round(1, [{ areaId: 'A', memberIds: ['a', 'b'] }, { areaId: 'B', memberIds: ['c', 'd'] }]),
    ];
    // 2 pairs repeated once each
    expect(costOf(rounds, roster, { avoidSameCompany: false })).toBe(2 * W1);
  });

  it('penalises same-company pairs when the option is on', () => {
    const roster = [person('a', 'X'), person('b', 'X'), person('c', 'Y'), person('d', 'Y')];
    const rounds: Round[] = [
      round(0, [{ areaId: 'A', memberIds: ['a', 'b'] }, { areaId: 'B', memberIds: ['c', 'd'] }]),
    ];
    // 2 same-company pairs
    expect(costOf(rounds, roster, { avoidSameCompany: true })).toBe(2 * W2);
    expect(costOf(rounds, roster, { avoidSameCompany: false })).toBe(0);
  });

  it('matches delta from before-and-after full costOf on a swap', () => {
    const roster = [person('a'), person('b'), person('c'), person('d'), person('e'), person('f')];
    const rounds: Round[] = [
      round(0, [{ areaId: 'A', memberIds: ['a', 'b', 'c'] }, { areaId: 'B', memberIds: ['d', 'e', 'f'] }]),
      round(1, [{ areaId: 'A', memberIds: ['a', 'b', 'd'] }, { areaId: 'B', memberIds: ['c', 'e', 'f'] }]),
    ];
    const before = costOf(rounds, roster, { avoidSameCompany: false });
    const delta = deltaOnSwap(rounds, roster, { avoidSameCompany: false }, 1, 0, 2, 1, 0);
    // Actually perform the swap:
    const swapped = JSON.parse(JSON.stringify(rounds)) as Round[];
    swapped[1].groups[0].memberIds[2] = 'e'; // was 'd'
    swapped[1].groups[1].memberIds[0] = 'd'; // was 'e'
    const after = costOf(swapped, roster, { avoidSameCompany: false });
    expect(after - before).toBe(delta);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/domain/scheduler/cost.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/domain/scheduler/cost.ts`:

```ts
import type { Person, PersonId, Round } from '../types';

export const REPEAT_WEIGHT = 100;
export const SAME_COMPANY_WEIGHT = 10;

export interface CostOptions {
  avoidSameCompany: boolean;
}

export function pairKey(a: PersonId, b: PersonId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function costOf(
  rounds: Round[],
  roster: Person[],
  options: CostOptions,
): number {
  const companyById = new Map(roster.map((p) => [p.id, p.company]));
  const pairCounts = new Map<string, number>();
  let sameCompanyPairs = 0;

  for (const round of rounds) {
    for (const group of round.groups) {
      const members = group.memberIds;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const key = pairKey(members[i], members[j]);
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
          if (options.avoidSameCompany) {
            const ca = companyById.get(members[i]) ?? '';
            const cb = companyById.get(members[j]) ?? '';
            if (ca && ca === cb) sameCompanyPairs += 1;
          }
        }
      }
    }
  }

  let repeats = 0;
  for (const count of pairCounts.values()) {
    if (count > 1) repeats += count - 1;
  }

  return repeats * REPEAT_WEIGHT + sameCompanyPairs * SAME_COMPANY_WEIGHT;
}

/**
 * Return the cost delta of swapping members at (roundIndex, groupA, indexA)
 * and (roundIndex, groupB, indexB). Does NOT mutate the rounds argument.
 *
 * We compute the delta locally: only the pair contributions inside groupA and
 * groupB, involving the swapped members, change. Cost from other rounds is
 * unaffected structurally, but repeat counts depend on cross-round pair totals,
 * so we recompute globally for correctness. (Fast enough for the sizes we handle;
 * see search.ts for the tight loop that uses this.)
 */
export function deltaOnSwap(
  rounds: Round[],
  roster: Person[],
  options: CostOptions,
  roundIndex: number,
  groupA: number,
  indexA: number,
  groupB: number,
  indexB: number,
): number {
  const before = costOf(rounds, roster, options);
  const swapped = swapClone(rounds, roundIndex, groupA, indexA, groupB, indexB);
  const after = costOf(swapped, roster, options);
  return after - before;
}

function swapClone(
  rounds: Round[],
  roundIndex: number,
  groupA: number,
  indexA: number,
  groupB: number,
  indexB: number,
): Round[] {
  const cloned = rounds.map((r) => ({
    ...r,
    groups: r.groups.map((g) => ({ ...g, memberIds: [...g.memberIds] })),
  }));
  const round = cloned[roundIndex];
  const a = round.groups[groupA].memberIds[indexA];
  const b = round.groups[groupB].memberIds[indexB];
  round.groups[groupA].memberIds[indexA] = b;
  round.groups[groupB].memberIds[indexB] = a;
  return cloned;
}

export function applySwap(
  rounds: Round[],
  roundIndex: number,
  groupA: number,
  indexA: number,
  groupB: number,
  indexB: number,
): void {
  const round = rounds[roundIndex];
  const a = round.groups[groupA].memberIds[indexA];
  const b = round.groups[groupB].memberIds[indexB];
  round.groups[groupA].memberIds[indexA] = b;
  round.groups[groupB].memberIds[indexB] = a;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/domain/scheduler/cost.test.ts`
Expected: all passing.

- [ ] **Step 5: Full suite + commit**

Run: `pnpm test`

```bash
git add src/domain/scheduler/cost.ts src/domain/scheduler/cost.test.ts
git commit -m "feat: cost function and swap delta for scheduler"
```

---

## Task 6: Scheduler — swap-based local search

**Files:**
- Create: `src/domain/scheduler/search.ts`
- Create: `src/domain/scheduler/search.test.ts`

Algorithm (spec §7.2, step 3): per restart, until time budget elapses, propose a swap of two people from different groups in the same round. Accept if `ΔC < 0`, or with `p_plateau = 0.2` if `ΔC == 0`. Restart if 500 consecutive proposals produce no acceptance. Return the best schedule seen.

- [ ] **Step 1: Write the failing test**

Create `src/domain/scheduler/search.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { costOf } from './cost';
import { buildSeed } from './seed';
import { search } from './search';
import type { EventParams, Person } from '../types';

function roster(n: number, companyStride = 100): Person[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    company: `C${Math.floor(i / companyStride)}`,
    rowIndex: i + 2,
  }));
}

function params(overrides: Partial<EventParams> = {}): EventParams {
  return {
    groupSize: 4,
    areas: Array.from({ length: 10 }, (_, i) => ({
      id: String.fromCharCode(65 + i),
      label: String.fromCharCode(65 + i),
    })),
    numRounds: 10,
    roundSeconds: 180,
    moveSeconds: 30,
    avoidSameCompany: false,
    breaks: [],
    ...overrides,
  };
}

describe('search', () => {
  it('never returns a worse schedule than the seed', () => {
    const p = params();
    const r = roster(40);
    const seed = buildSeed(r, p);
    const seedCost = costOf(seed, r, { avoidSameCompany: false });
    const out = search(seed, r, p, { seed: 1, timeBudgetMs: 300, restarts: 2 });
    const outCost = costOf(out, r, { avoidSameCompany: false });
    expect(outCost).toBeLessThanOrEqual(seedCost);
  });

  it('is deterministic for the same seed and inputs', () => {
    const p = params();
    const r = roster(40);
    const s = buildSeed(r, p);
    const a = search(s, r, p, { seed: 42, timeBudgetMs: 200, restarts: 1 });
    const b = search(s, r, p, { seed: 42, timeBudgetMs: 200, restarts: 1 });
    expect(a).toEqual(b);
  });

  it('terminates within roughly the time budget', () => {
    const p = params();
    const r = roster(40);
    const s = buildSeed(r, p);
    const start = Date.now();
    search(s, r, p, { seed: 1, timeBudgetMs: 200, restarts: 1 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(1500); // generous slack for CI
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/domain/scheduler/search.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/domain/scheduler/search.ts`:

```ts
import { mulberry32, pickIntExclusive } from '../prng';
import type { EventParams, Person, Round } from '../types';
import { applySwap, costOf } from './cost';
import { buildSeed } from './seed';

export interface SearchOptions {
  seed: number;
  timeBudgetMs: number;
  restarts: number;
}

const STAGNATION_LIMIT = 500;
const PLATEAU_ACCEPT_PROB = 0.2;

export function search(
  seedRounds: Round[],
  roster: Person[],
  params: EventParams,
  opts: SearchOptions,
): Round[] {
  const rng = mulberry32(opts.seed);
  const costOpts = { avoidSameCompany: params.avoidSameCompany };

  let best = cloneRounds(seedRounds);
  let bestCost = costOf(best, roster, costOpts);

  const deadline = Date.now() + opts.timeBudgetMs;

  for (let restart = 0; restart < opts.restarts; restart++) {
    if (Date.now() >= deadline) break;

    // First restart starts from provided seed; subsequent restarts rebuild
    // (deterministic — same params/roster give same seed schedule).
    let current = restart === 0 ? cloneRounds(seedRounds) : cloneRounds(buildSeed(roster, params));
    let currentCost = costOf(current, roster, costOpts);
    let stagnation = 0;

    while (Date.now() < deadline) {
      const proposal = proposeSwap(current, rng);
      if (!proposal) break;

      // Compute delta by trial swap: apply, measure, keep or revert.
      applySwap(current, proposal.round, proposal.gA, proposal.iA, proposal.gB, proposal.iB);
      const newCost = costOf(current, roster, costOpts);
      const delta = newCost - currentCost;

      let accept = false;
      if (delta < 0) accept = true;
      else if (delta === 0 && rng() < PLATEAU_ACCEPT_PROB) accept = true;

      if (accept) {
        currentCost = newCost;
        stagnation = 0;
        if (currentCost < bestCost) {
          best = cloneRounds(current);
          bestCost = currentCost;
          if (bestCost === 0) return best;
        }
      } else {
        // Revert
        applySwap(current, proposal.round, proposal.gA, proposal.iA, proposal.gB, proposal.iB);
        stagnation += 1;
        if (stagnation >= STAGNATION_LIMIT) break;
      }
    }
  }

  return best;
}

interface Proposal {
  round: number;
  gA: number;
  iA: number;
  gB: number;
  iB: number;
}

function proposeSwap(rounds: Round[], rng: () => number): Proposal | null {
  if (rounds.length === 0) return null;
  const roundIdx = pickIntExclusive(rng, rounds.length);
  const round = rounds[roundIdx];
  const nonEmpty = round.groups
    .map((g, i) => ({ g, i }))
    .filter((x) => x.g.memberIds.length > 0);
  if (nonEmpty.length < 2) return null;

  const gAIdx = pickIntExclusive(rng, nonEmpty.length);
  let gBIdx = pickIntExclusive(rng, nonEmpty.length - 1);
  if (gBIdx >= gAIdx) gBIdx += 1;

  const gA = nonEmpty[gAIdx];
  const gB = nonEmpty[gBIdx];
  const iA = pickIntExclusive(rng, gA.g.memberIds.length);
  const iB = pickIntExclusive(rng, gB.g.memberIds.length);

  return { round: roundIdx, gA: gA.i, iA, gB: gB.i, iB };
}

function cloneRounds(rounds: Round[]): Round[] {
  return rounds.map((r) => ({
    ...r,
    groups: r.groups.map((g) => ({ ...g, memberIds: [...g.memberIds] })),
    sittingOut: [...r.sittingOut],
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/domain/scheduler/search.test.ts`
Expected: 3 passing (may run for up to ~1s total).

- [ ] **Step 5: Full suite + commit**

Run: `pnpm test`

```bash
git add src/domain/scheduler/search.ts src/domain/scheduler/search.test.ts
git commit -m "feat: swap-based local-search schedule optimiser"
```

---

## Task 7: Scheduler — quality metrics

**Files:**
- Create: `src/domain/scheduler/quality.ts`
- Create: `src/domain/scheduler/quality.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/domain/scheduler/quality.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { computeQuality } from './quality';
import type { Person, Round } from '../types';

function p(id: string, company = 'X'): Person {
  return { id, name: id, company, rowIndex: 0 };
}

describe('computeQuality', () => {
  it('reports 0 repeats when every pair is unique', () => {
    const roster = [p('a'), p('b'), p('c'), p('d')];
    const rounds: Round[] = [
      { index: 0, groups: [{ areaId: 'A', memberIds: ['a', 'b'] }, { areaId: 'B', memberIds: ['c', 'd'] }], sittingOut: [] },
      { index: 1, groups: [{ areaId: 'A', memberIds: ['a', 'c'] }, { areaId: 'B', memberIds: ['b', 'd'] }], sittingOut: [] },
    ];
    const q = computeQuality(rounds, roster, false);
    expect(q.repeatedPairs).toBe(0);
    expect(q.uniquePairs).toBe(4);
    expect(q.totalPairs).toBe(4);
  });

  it('counts repeated pairs correctly', () => {
    const roster = [p('a'), p('b'), p('c'), p('d')];
    const rounds: Round[] = [
      { index: 0, groups: [{ areaId: 'A', memberIds: ['a', 'b'] }, { areaId: 'B', memberIds: ['c', 'd'] }], sittingOut: [] },
      { index: 1, groups: [{ areaId: 'A', memberIds: ['a', 'b'] }, { areaId: 'B', memberIds: ['c', 'd'] }], sittingOut: [] },
    ];
    const q = computeQuality(rounds, roster, false);
    expect(q.repeatedPairs).toBe(2); // a-b and c-d each meet a 2nd time
    expect(q.totalPairs).toBe(4);
    expect(q.uniquePairs).toBe(2);
  });

  it('counts same-company pairs regardless of avoidSameCompany flag', () => {
    const roster = [p('a', 'X'), p('b', 'X'), p('c', 'Y'), p('d', 'Y')];
    const rounds: Round[] = [
      { index: 0, groups: [{ areaId: 'A', memberIds: ['a', 'b'] }, { areaId: 'B', memberIds: ['c', 'd'] }], sittingOut: [] },
    ];
    const q = computeQuality(rounds, roster, true);
    expect(q.sameCompanyPairs).toBe(2);
  });

  it('lists neverMetIds as the roster complement for each person', () => {
    const roster = [p('a'), p('b'), p('c'), p('d')];
    const rounds: Round[] = [
      { index: 0, groups: [{ areaId: 'A', memberIds: ['a', 'b'] }, { areaId: 'B', memberIds: ['c', 'd'] }], sittingOut: [] },
    ];
    const q = computeQuality(rounds, roster, false);
    const a = q.perPerson.find((x) => x.id === 'a')!;
    expect(new Set(a.metIds)).toEqual(new Set(['b']));
    expect(new Set(a.neverMetIds)).toEqual(new Set(['c', 'd']));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/domain/scheduler/quality.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/domain/scheduler/quality.ts`:

```ts
import type { PerPersonQuality, Person, PersonId, Quality, Round } from '../types';
import { pairKey } from './cost';

export function computeQuality(
  rounds: Round[],
  roster: Person[],
  _avoidSameCompany: boolean,
): Quality {
  const companyById = new Map(roster.map((p) => [p.id, p.company]));
  const pairCounts = new Map<string, number>();
  const metByPerson = new Map<PersonId, Set<PersonId>>();
  const repeatByPerson = new Map<PersonId, number>();
  roster.forEach((p) => {
    metByPerson.set(p.id, new Set());
    repeatByPerson.set(p.id, 0);
  });

  let sameCompanyPairs = 0;
  let totalPairs = 0;

  for (const round of rounds) {
    for (const group of round.groups) {
      const members = group.memberIds;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          totalPairs += 1;
          const a = members[i];
          const b = members[j];
          const key = pairKey(a, b);
          const prev = pairCounts.get(key) ?? 0;
          pairCounts.set(key, prev + 1);
          metByPerson.get(a)!.add(b);
          metByPerson.get(b)!.add(a);
          if (prev >= 1) {
            repeatByPerson.set(a, (repeatByPerson.get(a) ?? 0) + 1);
            repeatByPerson.set(b, (repeatByPerson.get(b) ?? 0) + 1);
          }
          const ca = companyById.get(a) ?? '';
          const cb = companyById.get(b) ?? '';
          if (ca && ca === cb) sameCompanyPairs += 1;
        }
      }
    }
  }

  let uniquePairs = 0;
  let repeatedPairs = 0;
  for (const count of pairCounts.values()) {
    uniquePairs += 1;
    if (count > 1) repeatedPairs += count - 1;
  }

  const allIds = roster.map((p) => p.id);
  const perPerson: PerPersonQuality[] = roster.map((p) => {
    const metSet = metByPerson.get(p.id)!;
    const metIds = allIds.filter((id) => metSet.has(id));
    const neverMetIds = allIds.filter((id) => id !== p.id && !metSet.has(id));
    return {
      id: p.id,
      metIds,
      neverMetIds,
      repeatMeetings: repeatByPerson.get(p.id) ?? 0,
    };
  });

  return {
    totalPairs,
    uniquePairs,
    repeatedPairs,
    sameCompanyPairs,
    perPerson,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/domain/scheduler/quality.test.ts`
Expected: 4 passing.

- [ ] **Step 5: Full suite + commit**

Run: `pnpm test`

```bash
git add src/domain/scheduler/quality.ts src/domain/scheduler/quality.test.ts
git commit -m "feat: schedule quality metrics with per-person breakdown"
```

---

## Task 8: Scheduler — orchestrator + regression

**Files:**
- Create: `src/domain/scheduler/index.ts`
- Create: `src/domain/scheduler/index.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/domain/scheduler/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generateSchedule } from './index';
import type { EventParams, Person } from '../types';

function roster(n: number, companyStride = 1000): Person[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    company: `C${Math.floor(i / companyStride)}`,
    rowIndex: i + 2,
  }));
}

function params(overrides: Partial<EventParams> = {}): EventParams {
  return {
    groupSize: 4,
    areas: Array.from({ length: 10 }, (_, i) => ({
      id: String.fromCharCode(65 + i),
      label: String.fromCharCode(65 + i),
    })),
    numRounds: 10,
    roundSeconds: 180,
    moveSeconds: 30,
    avoidSameCompany: false,
    breaks: [],
    ...overrides,
  };
}

describe('generateSchedule', () => {
  it('returns a Schedule with matching seed', () => {
    const sched = generateSchedule(roster(20), params({ areas: params().areas.slice(0, 5), numRounds: 5 }), {
      seed: 7,
      timeBudgetMs: 100,
      restarts: 1,
    });
    expect(sched.seed).toBe(7);
    expect(sched.rounds).toHaveLength(5);
    expect(typeof sched.generatedAt).toBe('string');
  });

  it('regression: 40 people / 10 areas / 4 group / 10 rounds achieves few or zero repeats', () => {
    const sched = generateSchedule(roster(40), params(), {
      seed: 1,
      timeBudgetMs: 1500,
      restarts: 4,
    });
    // Perfect zero is possible for these parameters. We accept a small tolerance
    // to keep the test deterministic across machines.
    expect(sched.quality.repeatedPairs).toBeLessThanOrEqual(5);
  });

  it('avoidSameCompany reduces same-company pair count vs disabled', () => {
    const strided = roster(40, 4); // groups of 4 share company
    const withOn = generateSchedule(strided, params({ avoidSameCompany: true }), {
      seed: 2,
      timeBudgetMs: 500,
      restarts: 2,
    });
    const withOff = generateSchedule(strided, params({ avoidSameCompany: false }), {
      seed: 2,
      timeBudgetMs: 500,
      restarts: 2,
    });
    expect(withOn.quality.sameCompanyPairs).toBeLessThanOrEqual(withOff.quality.sameCompanyPairs);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/domain/scheduler/index.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/domain/scheduler/index.ts`:

```ts
import type { EventParams, Person, Schedule } from '../types';
import { buildSeed } from './seed';
import { computeQuality } from './quality';
import { search } from './search';

export interface GenerateOptions {
  seed?: number;
  timeBudgetMs?: number;
  restarts?: number;
}

export function generateSchedule(
  roster: Person[],
  params: EventParams,
  opts: GenerateOptions = {},
): Schedule {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const timeBudgetMs = opts.timeBudgetMs ?? 2000;
  const restarts = opts.restarts ?? 8;

  const seedRounds = buildSeed(roster, params);
  const searched = search(seedRounds, roster, params, { seed, timeBudgetMs, restarts });
  const quality = computeQuality(searched, roster, params.avoidSameCompany);

  return {
    rounds: searched,
    quality,
    seed,
    generatedAt: new Date().toISOString(),
  };
}

export { buildSeed } from './seed';
export { computeQuality } from './quality';
export { search } from './search';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/domain/scheduler/index.test.ts`
Expected: 3 passing. Regression test may take 1–2 s.

- [ ] **Step 5: Full suite + commit**

Run: `pnpm test`

```bash
git add src/domain/scheduler/index.ts src/domain/scheduler/index.test.ts
git commit -m "feat: scheduler orchestrator with 40-person regression"
```

---

## Task 9: Persistence

**Files:**
- Create: `src/state/persistence.ts`
- Create: `src/state/persistence.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/state/persistence.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clear, load, save, STORAGE_KEY } from './persistence';
import type { EventState } from '../domain/types';

const sample: EventState = {
  version: 1,
  roster: [{ id: 'p1', name: 'Alice', company: 'Acme', rowIndex: 2 }],
  params: {
    groupSize: 4,
    areas: [{ id: 'A', label: 'A' }],
    numRounds: 1,
    roundSeconds: 180,
    moveSeconds: 30,
    avoidSameCompany: true,
    breaks: [],
  },
};

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips an EventState', () => {
    save(sample);
    expect(load()).toEqual(sample);
  });

  it('returns undefined when nothing is stored', () => {
    expect(load()).toBeUndefined();
  });

  it('clear removes the stored state', () => {
    save(sample);
    clear();
    expect(load()).toBeUndefined();
  });

  it('ignores stored payloads with a wrong version', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...sample, version: 999 }));
    expect(load()).toBeUndefined();
  });

  it('ignores malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    expect(load()).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/state/persistence.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/state/persistence.ts`:

```ts
import type { EventState } from '../domain/types';

export const STORAGE_KEY = 'speedDating:currentEvent';
const CURRENT_VERSION = 1;

export function load(): EventState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as EventState;
    if (parsed?.version !== CURRENT_VERSION) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function save(state: EventState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage unavailable — surface via boot-time warning
    // in App, not here. Silent no-op keeps app functional.
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/state/persistence.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Full suite + commit**

Run: `pnpm test`

```bash
git add src/state/persistence.ts src/state/persistence.test.ts
git commit -m "feat: single-event localStorage persistence"
```

---

## Task 10: EventContext

**Files:**
- Create: `src/state/EventContext.tsx`
- Create: `src/state/EventContext.test.tsx`

Design: a React context exposing `{ state, actions }` where `actions` are pure helpers (`importRoster`, `updateParams`, `setSchedule`, `startRun`, `advancePhase`, `pauseRun`, `resumeRun`, `endRun`, `clearEvent`). Backed by `useReducer` so timer transitions are testable. `save(state)` runs on every action except `TICK` (there is no TICK action — time is derived, see spec §10).

- [ ] **Step 1: Write the failing test**

Create `src/state/EventContext.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EventProvider, useEvent } from './EventContext';

function Probe() {
  const { state, actions } = useEvent();
  return (
    <div>
      <div data-testid="version">{state?.version ?? 'none'}</div>
      <div data-testid="roster">{state?.roster.length ?? 0}</div>
      <button
        onClick={() =>
          actions.importRoster([
            { id: 'p1', name: 'Alice', company: 'Acme', rowIndex: 2 },
            { id: 'p2', name: 'Bob', company: 'Beta', rowIndex: 3 },
          ])
        }
      >
        import
      </button>
      <button onClick={() => actions.clearEvent()}>clear</button>
    </div>
  );
}

describe('EventContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with undefined state', () => {
    render(
      <EventProvider>
        <Probe />
      </EventProvider>,
    );
    expect(screen.getByTestId('version').textContent).toBe('none');
  });

  it('importRoster creates initial state with default params', () => {
    render(
      <EventProvider>
        <Probe />
      </EventProvider>,
    );
    act(() => {
      screen.getByText('import').click();
    });
    expect(screen.getByTestId('version').textContent).toBe('1');
    expect(screen.getByTestId('roster').textContent).toBe('2');
    expect(localStorage.getItem('speedDating:currentEvent')).not.toBeNull();
  });

  it('clearEvent wipes storage and state', () => {
    render(
      <EventProvider>
        <Probe />
      </EventProvider>,
    );
    act(() => screen.getByText('import').click());
    act(() => screen.getByText('clear').click());
    expect(screen.getByTestId('version').textContent).toBe('none');
    expect(localStorage.getItem('speedDating:currentEvent')).toBeNull();
  });

  it('hydrates from localStorage on mount', () => {
    localStorage.setItem(
      'speedDating:currentEvent',
      JSON.stringify({
        version: 1,
        roster: [{ id: 'x', name: 'X', company: 'Y', rowIndex: 2 }],
        params: {
          groupSize: 4,
          areas: [{ id: 'A', label: 'A' }],
          numRounds: 1,
          roundSeconds: 180,
          moveSeconds: 30,
          avoidSameCompany: true,
          breaks: [],
        },
      }),
    );
    render(
      <EventProvider>
        <Probe />
      </EventProvider>,
    );
    expect(screen.getByTestId('roster').textContent).toBe('1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/state/EventContext.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/state/EventContext.tsx`:

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type {
  EventParams,
  EventState,
  Person,
  RunPhase,
  Schedule,
} from '../domain/types';
import { clear as clearStorage, load, save } from './persistence';

const DEFAULT_PARAMS: EventParams = {
  groupSize: 4,
  areas: Array.from({ length: 10 }, (_, i) => ({
    id: String.fromCharCode(65 + i),
    label: String.fromCharCode(65 + i),
  })),
  numRounds: 10,
  roundSeconds: 180,
  moveSeconds: 30,
  avoidSameCompany: true,
  breaks: [],
};

type Action =
  | { type: 'HYDRATE'; payload: EventState | undefined }
  | { type: 'IMPORT_ROSTER'; payload: Person[] }
  | { type: 'UPDATE_PARAMS'; payload: Partial<EventParams> }
  | { type: 'SET_SCHEDULE'; payload: Schedule }
  | { type: 'START_RUN' }
  | { type: 'SET_PHASE'; payload: { phase: RunPhase; roundIndex: number; startedAt: number } }
  | { type: 'PAUSE_RUN'; payload: { remainingMs: number } }
  | { type: 'RESUME_RUN'; payload: { startedAt: number } }
  | { type: 'END_RUN' }
  | { type: 'CLEAR' };

function reducer(state: EventState | undefined, action: Action): EventState | undefined {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;
    case 'CLEAR':
      return undefined;
    case 'IMPORT_ROSTER': {
      const base: EventState = state ?? {
        version: 1,
        roster: [],
        params: DEFAULT_PARAMS,
      };
      return { ...base, roster: action.payload, schedule: undefined, runState: undefined };
    }
    case 'UPDATE_PARAMS': {
      if (!state) return state;
      return {
        ...state,
        params: { ...state.params, ...action.payload },
        schedule: undefined,
        runState: undefined,
      };
    }
    case 'SET_SCHEDULE':
      if (!state) return state;
      return { ...state, schedule: action.payload, runState: undefined };
    case 'START_RUN':
      if (!state?.schedule) return state;
      return {
        ...state,
        runState: {
          currentRoundIndex: 0,
          phase: 'conversation',
          phaseStartedAt: Date.now(),
        },
      };
    case 'SET_PHASE':
      if (!state?.runState) return state;
      return {
        ...state,
        runState: {
          ...state.runState,
          phase: action.payload.phase,
          currentRoundIndex: action.payload.roundIndex,
          phaseStartedAt: action.payload.startedAt,
          pausedRemainingMs: undefined,
        },
      };
    case 'PAUSE_RUN':
      if (!state?.runState) return state;
      return {
        ...state,
        runState: {
          ...state.runState,
          phase: 'paused',
          pausedRemainingMs: action.payload.remainingMs,
        },
      };
    case 'RESUME_RUN':
      if (!state?.runState) return state;
      return {
        ...state,
        runState: {
          ...state.runState,
          phase: 'conversation',
          phaseStartedAt: action.payload.startedAt,
          pausedRemainingMs: undefined,
        },
      };
    case 'END_RUN':
      if (!state?.runState) return state;
      return {
        ...state,
        runState: { ...state.runState, phase: 'finished' },
      };
    default:
      return state;
  }
}

interface EventActions {
  importRoster(people: Person[]): void;
  updateParams(patch: Partial<EventParams>): void;
  setSchedule(schedule: Schedule): void;
  startRun(): void;
  setPhase(input: { phase: RunPhase; roundIndex: number; startedAt: number }): void;
  pauseRun(remainingMs: number): void;
  resumeRun(startedAt: number): void;
  endRun(): void;
  clearEvent(): void;
}

interface EventContextValue {
  state: EventState | undefined;
  actions: EventActions;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }): JSX.Element {
  const [state, dispatch] = useReducer(reducer, undefined, () => load());

  // Persist on every state change except undefined-clear (handled explicitly by CLEAR/clearStorage).
  useEffect(() => {
    if (state) save(state);
  }, [state]);

  const actions = useMemo<EventActions>(
    () => ({
      importRoster: (people) => dispatch({ type: 'IMPORT_ROSTER', payload: people }),
      updateParams: (patch) => dispatch({ type: 'UPDATE_PARAMS', payload: patch }),
      setSchedule: (schedule) => dispatch({ type: 'SET_SCHEDULE', payload: schedule }),
      startRun: () => dispatch({ type: 'START_RUN' }),
      setPhase: (input) => dispatch({ type: 'SET_PHASE', payload: input }),
      pauseRun: (remainingMs) => dispatch({ type: 'PAUSE_RUN', payload: { remainingMs } }),
      resumeRun: (startedAt) => dispatch({ type: 'RESUME_RUN', payload: { startedAt } }),
      endRun: () => dispatch({ type: 'END_RUN' }),
      clearEvent: () => {
        clearStorage();
        dispatch({ type: 'CLEAR' });
      },
    }),
    [],
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvent(): EventContextValue {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvent must be used inside <EventProvider>');
  return ctx;
}

// re-export for callers that build default params externally
export { DEFAULT_PARAMS };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/state/EventContext.test.tsx`
Expected: 4 passing.

- [ ] **Step 5: Full suite + commit**

Run: `pnpm test`

```bash
git add src/state/EventContext.tsx src/state/EventContext.test.tsx
git commit -m "feat: event context with reducer, actions, persistence"
```

---

## Task 11: Router + AppLayout rewrite

**Files:**
- Modify: `src/router.tsx`
- Modify: `src/components/AppLayout.tsx`
- Modify: `src/App.tsx`
- Create: `src/pages/SetupPage.tsx` (placeholder)
- Create: `src/pages/SchedulePage.tsx` (placeholder)
- Create: `src/pages/PrintPage.tsx` (placeholder)
- Create: `src/pages/RunPage.tsx` (placeholder)
- Delete: `src/pages/HomePage.tsx`
- Delete: `src/pages/HomePage.test.tsx`
- Delete: `src/pages/AboutPage.tsx`

Purpose: swap the 4-page nav in and wire `EventProvider` at the App root. Pages are placeholders; each will be filled in its own task.

- [ ] **Step 1: Delete old pages**

```bash
git rm src/pages/HomePage.tsx src/pages/HomePage.test.tsx src/pages/AboutPage.tsx
```

- [ ] **Step 2: Create page placeholders**

Each file (`SetupPage.tsx`, `SchedulePage.tsx`, `PrintPage.tsx`, `RunPage.tsx`) starts as:

```tsx
// src/pages/SetupPage.tsx (repeat for each page, changing the label)
import { Container, Typography } from '@mui/material';

export function SetupPage() {
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" component="h1">Setup</Typography>
    </Container>
  );
}
```

- [ ] **Step 3: Rewrite `AppLayout.tsx`**

```tsx
import { AppBar, Box, Button, Stack, Toolbar, Typography } from '@mui/material';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEvent } from '../state/EventContext';

const NAV = [
  { to: '/setup', label: 'Setup' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/print', label: 'Print' },
  { to: '/run', label: 'Run' },
] as const;

export function AppLayout() {
  const { actions } = useEvent();
  const location = useLocation();

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" elevation={0} color="transparent"
        sx={{ borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(8px)',
              bgcolor: 'rgba(240, 253, 250, 0.85)' }}>
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700, mr: 2 }}>
            Speed Networking
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
            {NAV.map((item) => (
              <Button key={item.to} component={NavLink} to={item.to} size="small"
                sx={{
                  color: location.pathname.startsWith(item.to) ? 'primary.main' : 'text.primary',
                  fontWeight: location.pathname.startsWith(item.to) ? 700 : 500,
                }}>
                {item.label}
              </Button>
            ))}
          </Stack>
          <Button size="small" color="inherit"
            onClick={() => {
              if (confirm('Start a new event? This will clear the current roster, schedule, and run state.')) {
                actions.clearEvent();
              }
            }}>
            New event
          </Button>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Rewrite `router.tsx`**

```tsx
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { SetupPage } from './pages/SetupPage';
import { SchedulePage } from './pages/SchedulePage';
import { PrintPage } from './pages/PrintPage';
import { RunPage } from './pages/RunPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/setup" replace />} />
          <Route path="setup" element={<SetupPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="print" element={<PrintPage />} />
          <Route path="run" element={<RunPage />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Wrap `App` in `EventProvider`**

Modify `src/App.tsx`:

```tsx
import { CssBaseline, ThemeProvider } from '@mui/material';
import { AppRouter } from './router';
import { EventProvider } from './state/EventContext';
import { theme } from './theme';

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <EventProvider>
      <AppRouter />
    </EventProvider>
  </ThemeProvider>
);

export default App;
```

- [ ] **Step 6: Type-check + suite + build sanity**

Run:
```bash
pnpm exec tsc --noEmit
pnpm test
pnpm run build
```
Expected: all pass, build succeeds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: swap in 4-page router with EventProvider at root"
```

---

## Task 12: SetupPage — import + parameters + validation

**Files:**
- Modify: `src/pages/SetupPage.tsx`
- Create: `src/pages/SetupPage.test.tsx`

Design: two-column layout on desktop, stacked on mobile.

- **Roster panel**: `<input type="file" accept=".xlsx,.csv">`. On file → read as ArrayBuffer → `parseRoster` → dispatch `importRoster` with the returned people; render errors as a MUI Alert list; small table preview with delete-row buttons; a "+ Add person" row for manual entry.
- **Parameters panel**: number inputs for group size, area count, rounds; sliders for round duration and move duration; toggle for avoid-same-company; break editor (add/remove `{ afterRound, seconds, label }`).
- **Validation banner** at top (hard-block conditions from spec §8.1) — disables "Generate schedule" CTA when triggered.

- [ ] **Step 1: Write the failing test**

Create `src/pages/SetupPage.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { beforeEach, describe, expect, it } from 'vitest';
import { SetupPage } from './SetupPage';
import { EventProvider } from '../state/EventContext';
import { theme } from '../theme';

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <EventProvider>
        <MemoryRouter>
          <SetupPage />
        </MemoryRouter>
      </EventProvider>
    </ThemeProvider>,
  );
}

function csvFile(name: string, content: string): File {
  return new File([content], name, { type: 'text/csv' });
}

describe('SetupPage', () => {
  beforeEach(() => localStorage.clear());

  it('imports a CSV roster and shows the count', async () => {
    renderPage();
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [csvFile('r.csv', 'Name,Company\nAlice,Acme\nBob,Beta\n')] },
    });
    await waitFor(() => {
      expect(screen.getByText(/2 people/i)).toBeInTheDocument();
    });
  });

  it('shows row errors from the parser', async () => {
    renderPage();
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [csvFile('r.csv', 'Name,Company\n,Acme\nBob,Beta\n')] },
    });
    await waitFor(() => {
      expect(screen.getByText(/missing name/i)).toBeInTheDocument();
    });
  });

  it('disables Generate when roster is smaller than group size', async () => {
    renderPage();
    // With no roster, Generate should be disabled.
    expect(screen.getByRole('button', { name: /generate schedule/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/pages/SetupPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Overwrite `src/pages/SetupPage.tsx`:

```tsx
import { useState } from 'react';
import {
  Alert, Box, Button, Container, FormControlLabel, IconButton, Stack, Switch,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { parseRoster } from '../domain/parseRoster';
import type { RowError } from '../domain/parseRoster';
import { useEvent } from '../state/EventContext';
import type { BreakSlot, Person } from '../domain/types';

export function SetupPage() {
  const { state, actions } = useEvent();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<RowError[]>([]);

  const roster = state?.roster ?? [];
  const params = state?.params;

  async function handleFile(file: File) {
    const buf = await file.arrayBuffer();
    const result = await parseRoster(buf, file.name);
    actions.importRoster(result.people);
    setErrors(result.errors);
  }

  function removePerson(id: string) {
    actions.importRoster(roster.filter((p) => p.id !== id));
  }

  function addManualPerson() {
    const person: Person = { id: nanoid(10), name: 'New attendee', company: '', rowIndex: -1 };
    actions.importRoster([...roster, person]);
  }

  function editPerson(id: string, patch: Partial<Person>) {
    actions.importRoster(roster.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  // Validation
  const areaCount = params?.areas.length ?? 0;
  const groupSize = params?.groupSize ?? 0;
  const hardErrors: string[] = [];
  if (!params) hardErrors.push('Import a roster to configure parameters.');
  else {
    if (roster.length < groupSize) hardErrors.push(`Need at least ${groupSize} people to form one group.`);
    if (groupSize < 2) hardErrors.push('Group size must be at least 2.');
    if (areaCount < 1) hardErrors.push('At least one area is required.');
    if (params.numRounds < 1) hardErrors.push('At least one round is required.');
    for (const b of params.breaks) {
      if (b.afterRound < 1 || b.afterRound >= params.numRounds) {
        hardErrors.push(`Break "${b.label}" must occur between rounds 1 and ${params.numRounds - 1}.`);
      }
    }
  }
  const softWarn = params && roster.length < areaCount * groupSize
    ? `Only ${roster.length} people for ${areaCount * groupSize} seats — some groups will be smaller.`
    : undefined;

  return (
    <Container sx={{ py: 4 }} maxWidth="lg">
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">Setup</Typography>

        {hardErrors.length > 0 && (
          <Alert severity="error">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {hardErrors.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          </Alert>
        )}
        {softWarn && <Alert severity="warning">{softWarn}</Alert>}

        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { md: '1fr 1fr' } }}>
          <Box>
            <Typography variant="h6">Roster</Typography>
            <Box sx={{ my: 2 }}>
              <Button variant="outlined" component="label">
                Choose Excel or CSV file
                <input
                  hidden
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </Button>
              <Button startIcon={<AddIcon />} onClick={addManualPerson} sx={{ ml: 1 }}>
                Add person
              </Button>
            </Box>
            {errors.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {errors.map((e) => <li key={`${e.rowIndex}-${e.reason}`}>{e.message}</li>)}
                </ul>
              </Alert>
            )}
            {roster.length > 0 && (
              <>
                <Typography variant="body2" sx={{ mb: 1 }}>{roster.length} people</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Company</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roster.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <TextField size="small" variant="standard" value={p.name}
                            onChange={(e) => editPerson(p.id, { name: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" variant="standard" value={p.company}
                            onChange={(e) => editPerson(p.id, { company: e.target.value })} />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => removePerson(p.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </Box>

          <Box>
            <Typography variant="h6">Parameters</Typography>
            {params && (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField label="Group size" type="number" size="small" value={params.groupSize}
                  onChange={(e) => actions.updateParams({ groupSize: Math.max(1, Number(e.target.value)) })} />
                <TextField label="Number of areas" type="number" size="small" value={areaCount}
                  onChange={(e) => {
                    const n = Math.max(1, Number(e.target.value));
                    const areas = Array.from({ length: n }, (_, i) => ({
                      id: String.fromCharCode(65 + i),
                      label: String.fromCharCode(65 + i),
                    }));
                    actions.updateParams({ areas, numRounds: Math.max(params.numRounds, n) });
                  }} />
                <TextField label="Number of rounds" type="number" size="small" value={params.numRounds}
                  onChange={(e) => actions.updateParams({ numRounds: Math.max(1, Number(e.target.value)) })} />
                <TextField label="Round seconds (total)" type="number" size="small" value={params.roundSeconds}
                  onChange={(e) => actions.updateParams({ roundSeconds: Math.max(30, Number(e.target.value)) })} />
                <TextField label="Move seconds" type="number" size="small" value={params.moveSeconds}
                  onChange={(e) => actions.updateParams({ moveSeconds: Math.max(0, Number(e.target.value)) })} />
                <FormControlLabel
                  control={<Switch checked={params.avoidSameCompany}
                    onChange={(e) => actions.updateParams({ avoidSameCompany: e.target.checked })} />}
                  label="Avoid same-company pairings" />

                <BreakEditor
                  breaks={params.breaks}
                  onChange={(breaks) => actions.updateParams({ breaks })}
                  maxRound={params.numRounds - 1}
                />
              </Stack>
            )}
          </Box>
        </Box>

        <Box>
          <Button
            variant="contained"
            size="large"
            disabled={hardErrors.length > 0}
            onClick={() => navigate('/schedule')}
          >
            Generate schedule
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}

function BreakEditor({ breaks, onChange, maxRound }: {
  breaks: BreakSlot[]; onChange: (b: BreakSlot[]) => void; maxRound: number;
}) {
  return (
    <Box>
      <Typography variant="subtitle2">Breaks</Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {breaks.map((b, i) => (
          <Stack key={i} direction="row" spacing={1} alignItems="center">
            <TextField size="small" label="After round" type="number" value={b.afterRound}
              onChange={(e) => {
                const next = [...breaks];
                next[i] = { ...next[i], afterRound: Number(e.target.value) };
                onChange(next);
              }} sx={{ width: 120 }} />
            <TextField size="small" label="Seconds" type="number" value={b.seconds}
              onChange={(e) => {
                const next = [...breaks];
                next[i] = { ...next[i], seconds: Number(e.target.value) };
                onChange(next);
              }} sx={{ width: 120 }} />
            <TextField size="small" label="Label" value={b.label}
              onChange={(e) => {
                const next = [...breaks];
                next[i] = { ...next[i], label: e.target.value };
                onChange(next);
              }} />
            <IconButton size="small" onClick={() => onChange(breaks.filter((_, j) => j !== i))}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        <Button
          size="small"
          startIcon={<AddIcon />}
          disabled={maxRound < 1}
          onClick={() => onChange([...breaks, { afterRound: Math.max(1, maxRound), seconds: 600, label: 'Break' }])}
        >
          Add break
        </Button>
      </Stack>
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/pages/SetupPage.test.tsx`
Expected: 3 passing.

- [ ] **Step 5: Full suite + commit**

Run: `pnpm test && pnpm exec tsc --noEmit`

```bash
git add src/pages/SetupPage.tsx src/pages/SetupPage.test.tsx
git commit -m "feat: setup page with roster import, params editor, validation"
```

---

## Task 13: SchedulePage — generate + inspect

**Files:**
- Modify: `src/pages/SchedulePage.tsx`
- Create: `src/pages/SchedulePage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/SchedulePage.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { beforeEach, describe, expect, it } from 'vitest';
import { SchedulePage } from './SchedulePage';
import { EventProvider, useEvent } from '../state/EventContext';
import { theme } from '../theme';
import type { Person } from '../domain/types';

const people: Person[] = Array.from({ length: 8 }, (_, i) => ({
  id: `p${i}`, name: `P${i}`, company: `C${i % 2}`, rowIndex: i + 2,
}));

function Seed() {
  const { actions, state } = useEvent();
  if (!state) {
    actions.importRoster(people);
    actions.updateParams({
      areas: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
      numRounds: 3,
      groupSize: 4,
    });
    return null;
  }
  return null;
}

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <EventProvider>
        <MemoryRouter>
          <Seed />
          <SchedulePage />
        </MemoryRouter>
      </EventProvider>
    </ThemeProvider>,
  );
}

describe('SchedulePage', () => {
  beforeEach(() => localStorage.clear());

  it('generates a schedule and displays the round-by-area table', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /generate/i }));
    await waitFor(
      () => expect(screen.getByText(/round 1/i)).toBeInTheDocument(),
      { timeout: 3000 },
    );
    // Quality card shows some numeric summary.
    expect(screen.getByText(/repeated pairs/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/pages/SchedulePage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Overwrite `src/pages/SchedulePage.tsx`:

```tsx
import { useState, useTransition } from 'react';
import {
  Alert, Box, Button, Chip, Container, Paper, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEvent } from '../state/EventContext';
import { generateSchedule } from '../domain/scheduler';

export function SchedulePage() {
  const { state, actions } = useEvent();
  const navigate = useNavigate();
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 100000));
  const [isPending, startTransition] = useTransition();

  if (!state || state.roster.length === 0 || state.params.areas.length === 0) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="info">Import a roster on the Setup page first.</Alert>
      </Container>
    );
  }

  const nameById = new Map(state.roster.map((p) => [p.id, p.name]));
  const schedule = state.schedule;

  function generate() {
    startTransition(() => {
      const s = generateSchedule(state!.roster, state!.params, { seed, timeBudgetMs: 2000, restarts: 6 });
      actions.setSchedule(s);
    });
  }

  return (
    <Container sx={{ py: 4 }} maxWidth="lg">
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">Schedule</Typography>

        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField label="Seed" size="small" type="number" value={seed}
              onChange={(e) => setSeed(Number(e.target.value))} sx={{ width: 160 }} />
            <Button variant="contained" onClick={generate} disabled={isPending}>
              {isPending ? 'Generating…' : schedule ? 'Regenerate' : 'Generate'}
            </Button>
            <Button onClick={() => setSeed(Math.floor(Math.random() * 100000))} disabled={isPending}>
              New seed
            </Button>
          </Stack>
        </Paper>

        {schedule && (
          <>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Quality</Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 1 }} flexWrap="wrap">
                <Chip label={`Repeated pairs: ${schedule.quality.repeatedPairs}`} color={schedule.quality.repeatedPairs === 0 ? 'success' : 'warning'} />
                <Chip label={`Same-company pairs: ${schedule.quality.sameCompanyPairs}`} />
                <Chip label={`Unique pairs: ${schedule.quality.uniquePairs}`} />
                <Chip label={`Total meetings: ${schedule.quality.totalPairs}`} />
              </Stack>
            </Paper>

            <Paper sx={{ p: 2, overflowX: 'auto' }}>
              <Typography variant="h6">Rounds × Areas</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    {state.params.areas.map((a) => <TableCell key={a.id}>{a.label}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedule.rounds.map((r, i) => (
                    <TableRow key={r.index}>
                      <TableCell>Round {i + 1}</TableCell>
                      {r.groups.map((g) => (
                        <TableCell key={g.areaId}>
                          {g.memberIds.map((id) => nameById.get(id) ?? id).join(', ')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            <Box>
              <Button variant="contained" size="large" onClick={() => navigate('/print')}>
                Print materials
              </Button>
            </Box>
          </>
        )}
      </Stack>
    </Container>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/pages/SchedulePage.test.tsx`
Expected: 1 passing.

- [ ] **Step 5: Full suite + commit**

Run: `pnpm test`

```bash
git add src/pages/SchedulePage.tsx src/pages/SchedulePage.test.tsx
git commit -m "feat: schedule page with generation and quality summary"
```

---

## Task 14: PDF components

**Files:**
- Create: `src/components/pdf/PersonalPlanPdf.tsx`
- Create: `src/components/pdf/NameTagsPdf.tsx`
- Create: `src/components/pdf/AreaSignsPdf.tsx`
- Create: `src/components/pdf/MasterMatrixPdf.tsx`
- Create: `src/components/pdf/QualityReportPdf.tsx`
- Create: `src/components/pdf/pdf.test.tsx`

All PDF components are React components rendered by `@react-pdf/renderer` (not the browser React DOM). They accept plain data props and return a `<Document>`.

- [ ] **Step 1: Write the failing test (one snapshot per component)**

Create `src/components/pdf/pdf.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import { PersonalPlanPdf } from './PersonalPlanPdf';
import { NameTagsPdf } from './NameTagsPdf';
import { AreaSignsPdf } from './AreaSignsPdf';
import { MasterMatrixPdf } from './MasterMatrixPdf';
import { QualityReportPdf } from './QualityReportPdf';
import type { EventState, Schedule } from '../../domain/types';

const state: EventState = {
  version: 1,
  roster: [
    { id: 'a', name: 'Alice', company: 'Acme', rowIndex: 2 },
    { id: 'b', name: 'Bob', company: 'Beta', rowIndex: 3 },
    { id: 'c', name: 'Carol', company: 'Casa', rowIndex: 4 },
    { id: 'd', name: 'Dan', company: 'Delta', rowIndex: 5 },
  ],
  params: {
    groupSize: 4,
    areas: [{ id: 'A', label: 'A' }],
    numRounds: 1,
    roundSeconds: 180,
    moveSeconds: 30,
    avoidSameCompany: false,
    breaks: [],
  },
};

const schedule: Schedule = {
  seed: 1,
  generatedAt: '2026-07-22T00:00:00.000Z',
  rounds: [{ index: 0, groups: [{ areaId: 'A', memberIds: ['a', 'b', 'c', 'd'] }], sittingOut: [] }],
  quality: {
    totalPairs: 6, uniquePairs: 6, repeatedPairs: 0, sameCompanyPairs: 0,
    perPerson: state.roster.map((p) => ({ id: p.id, metIds: [], neverMetIds: [], repeatMeetings: 0 })),
  },
};

async function renderToBlob(node: React.ReactElement) {
  const blob = await pdf(node).toBlob();
  return blob;
}

describe('PDF components render to a non-empty PDF blob', () => {
  it('PersonalPlanPdf', async () => {
    const blob = await renderToBlob(<PersonalPlanPdf roster={state.roster} params={state.params} schedule={schedule} />);
    expect(blob.size).toBeGreaterThan(500);
  });
  it('NameTagsPdf', async () => {
    const blob = await renderToBlob(<NameTagsPdf roster={state.roster} />);
    expect(blob.size).toBeGreaterThan(500);
  });
  it('AreaSignsPdf', async () => {
    const blob = await renderToBlob(<AreaSignsPdf areas={state.params.areas} />);
    expect(blob.size).toBeGreaterThan(500);
  });
  it('MasterMatrixPdf', async () => {
    const blob = await renderToBlob(<MasterMatrixPdf roster={state.roster} params={state.params} schedule={schedule} />);
    expect(blob.size).toBeGreaterThan(500);
  });
  it('QualityReportPdf', async () => {
    const blob = await renderToBlob(<QualityReportPdf roster={state.roster} schedule={schedule} />);
    expect(blob.size).toBeGreaterThan(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/pdf/pdf.test.tsx`
Expected: FAIL (missing modules).

- [ ] **Step 3: Implement PersonalPlanPdf**

Create `src/components/pdf/PersonalPlanPdf.tsx`:

```tsx
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { EventParams, Person, Schedule } from '../../domain/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: 'Helvetica' },
  header: { fontSize: 14, marginBottom: 4, fontWeight: 700 },
  sub: { fontSize: 10, marginBottom: 12, color: '#555' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '48%',
    marginBottom: 8,
    marginHorizontal: '1%',
    padding: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#666',
  },
  cellHead: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  cellArea: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  cellMeet: { fontSize: 9, color: '#333' },
});

export function PersonalPlanPdf({
  roster, params, schedule,
}: { roster: Person[]; params: EventParams; schedule: Schedule }) {
  const nameById = new Map(roster.map((p) => [p.id, p.name]));

  return (
    <Document>
      {roster.map((person) => {
        // For each round, find where this person is and who they're with.
        const per = schedule.rounds.map((round) => {
          const group = round.groups.find((g) => g.memberIds.includes(person.id));
          const others = group?.memberIds.filter((id) => id !== person.id) ?? [];
          return {
            roundNum: round.index + 1,
            areaLabel: params.areas.find((a) => a.id === group?.areaId)?.label ?? '—',
            others: others.map((id) => nameById.get(id) ?? id),
          };
        });

        return (
          <Page key={person.id} size="A4" style={styles.page}>
            <Text style={styles.header}>{person.name}{person.company ? ` — ${person.company}` : ''}</Text>
            <Text style={styles.sub}>Your speed-networking plan. Tear off one tag per round.</Text>
            <View style={styles.grid}>
              {per.map((slot) => (
                <View key={slot.roundNum} style={styles.cell}>
                  <Text style={styles.cellHead}>Round {slot.roundNum}</Text>
                  <Text style={styles.cellArea}>Area {slot.areaLabel}</Text>
                  <Text style={styles.cellMeet}>Meet: {slot.others.join(', ') || '—'}</Text>
                </View>
              ))}
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
```

- [ ] **Step 4: Implement NameTagsPdf**

Create `src/components/pdf/NameTagsPdf.tsx`:

```tsx
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Person } from '../../domain/types';

const styles = StyleSheet.create({
  page: { padding: 12, flexDirection: 'row', flexWrap: 'wrap' },
  tag: {
    width: '50%',
    height: '50%',
    padding: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { fontSize: 28, fontWeight: 700, textAlign: 'center' },
  company: { fontSize: 14, marginTop: 8, color: '#444', textAlign: 'center' },
});

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export function NameTagsPdf({ roster }: { roster: Person[] }) {
  const pages = chunk(roster, 4);
  return (
    <Document>
      {pages.map((tags, i) => (
        <Page key={i} size="A4" style={styles.page}>
          {tags.map((p) => (
            <View key={p.id} style={styles.tag}>
              <Text style={styles.name}>{p.name}</Text>
              {p.company && <Text style={styles.company}>{p.company}</Text>}
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
```

- [ ] **Step 5: Implement AreaSignsPdf**

Create `src/components/pdf/AreaSignsPdf.tsx`:

```tsx
import { Document, Page, StyleSheet, Text } from '@react-pdf/renderer';
import type { Area } from '../../domain/types';

const styles = StyleSheet.create({
  page: { padding: 24, justifyContent: 'center', alignItems: 'center' },
  letter: { fontSize: 400, fontWeight: 700 },
});

export function AreaSignsPdf({ areas }: { areas: Area[] }) {
  return (
    <Document>
      {areas.map((a) => (
        <Page key={a.id} size="A4" style={styles.page}>
          <Text style={styles.letter}>{a.label}</Text>
        </Page>
      ))}
    </Document>
  );
}
```

- [ ] **Step 6: Implement MasterMatrixPdf**

Create `src/components/pdf/MasterMatrixPdf.tsx`:

```tsx
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { EventParams, Person, Schedule } from '../../domain/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: 'Helvetica' },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 12 },
  row: { flexDirection: 'row' },
  cell: { borderWidth: 0.5, borderColor: '#999', padding: 4, flexGrow: 1, flexBasis: 0 },
  head: { backgroundColor: '#f0f0f0', fontWeight: 700 },
});

export function MasterMatrixPdf({
  roster, params, schedule,
}: { roster: Person[]; params: EventParams; schedule: Schedule }) {
  const nameById = new Map(roster.map((p) => [p.id, p.name]));
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Master schedule</Text>
        <View style={styles.row}>
          <View style={[styles.cell, styles.head]}><Text>Round</Text></View>
          {params.areas.map((a) => (
            <View key={a.id} style={[styles.cell, styles.head]}><Text>{a.label}</Text></View>
          ))}
        </View>
        {schedule.rounds.map((round) => (
          <View key={round.index} style={styles.row}>
            <View style={[styles.cell, styles.head]}><Text>{round.index + 1}</Text></View>
            {round.groups.map((g) => (
              <View key={g.areaId} style={styles.cell}>
                <Text>{g.memberIds.map((id) => nameById.get(id) ?? id).join(', ')}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
```

- [ ] **Step 7: Implement QualityReportPdf**

Create `src/components/pdf/QualityReportPdf.tsx`:

```tsx
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Person, Schedule } from '../../domain/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 8 },
  summary: { marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 160 },
  personRow: { flexDirection: 'row', paddingVertical: 2, borderBottomWidth: 0.5, borderColor: '#eee' },
  name: { width: 120 },
});

export function QualityReportPdf({
  roster, schedule,
}: { roster: Person[]; schedule: Schedule }) {
  const nameById = new Map(roster.map((p) => [p.id, p.name]));
  const q = schedule.quality;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Schedule quality report</Text>
        <View style={styles.summary}>
          <View style={styles.row}><Text style={styles.label}>Total meetings</Text><Text>{q.totalPairs}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Unique pairs</Text><Text>{q.uniquePairs}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Repeated pairs</Text><Text>{q.repeatedPairs}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Same-company pairs</Text><Text>{q.sameCompanyPairs}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Seed</Text><Text>{schedule.seed}</Text></View>
        </View>
        <Text style={styles.title}>Per person</Text>
        {q.perPerson.map((row) => (
          <View key={row.id} style={styles.personRow}>
            <Text style={styles.name}>{nameById.get(row.id) ?? row.id}</Text>
            <Text>Met {row.metIds.length}; Never met {row.neverMetIds.length}; Repeats {row.repeatMeetings}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
```

- [ ] **Step 8: Run tests**

Run: `pnpm exec vitest run src/components/pdf/pdf.test.tsx`
Expected: 5 passing. If `pdf().toBlob()` errors under jsdom, check the `@react-pdf/renderer` installed version supports it; the test may need to be adapted to `renderToStream` — the package docs are the authoritative reference here (`https://react-pdf.org/`).

- [ ] **Step 9: Full suite + commit**

Run: `pnpm test`

```bash
git add src/components/pdf/
git commit -m "feat: PDF components for plans, tags, signs, matrix, quality"
```

---

## Task 15: PrintPage — download tiles

**Files:**
- Modify: `src/pages/PrintPage.tsx`
- Create: `src/pages/PrintPage.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/pages/PrintPage.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { beforeEach, describe, expect, it } from 'vitest';
import { PrintPage } from './PrintPage';
import { EventProvider, useEvent } from '../state/EventContext';
import { theme } from '../theme';
import type { Schedule } from '../domain/types';

function Seed({ withSchedule }: { withSchedule: boolean }) {
  const { state, actions } = useEvent();
  if (!state) {
    actions.importRoster([{ id: 'a', name: 'A', company: '', rowIndex: 2 }]);
    return null;
  }
  if (withSchedule && !state.schedule) {
    const schedule: Schedule = {
      seed: 1, generatedAt: '2026-07-22T00:00:00.000Z',
      rounds: [{ index: 0, groups: [{ areaId: 'A', memberIds: ['a'] }], sittingOut: [] }],
      quality: { totalPairs: 0, uniquePairs: 0, repeatedPairs: 0, sameCompanyPairs: 0,
        perPerson: [{ id: 'a', metIds: [], neverMetIds: [], repeatMeetings: 0 }] },
    };
    actions.setSchedule(schedule);
  }
  return null;
}

function renderPage(withSchedule: boolean) {
  return render(
    <ThemeProvider theme={theme}>
      <EventProvider>
        <MemoryRouter>
          <Seed withSchedule={withSchedule} />
          <PrintPage />
        </MemoryRouter>
      </EventProvider>
    </ThemeProvider>,
  );
}

describe('PrintPage', () => {
  beforeEach(() => localStorage.clear());

  it('prompts to generate a schedule when none exists', () => {
    renderPage(false);
    expect(screen.getByText(/generate a schedule/i)).toBeInTheDocument();
  });

  it('lists the five artifact tiles when a schedule exists', () => {
    renderPage(true);
    expect(screen.getByText(/Personal plans/i)).toBeInTheDocument();
    expect(screen.getByText(/Name tags/i)).toBeInTheDocument();
    expect(screen.getByText(/Area signs/i)).toBeInTheDocument();
    expect(screen.getByText(/Master matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/Quality report/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/pages/PrintPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Overwrite `src/pages/PrintPage.tsx`:

```tsx
import { useState } from 'react';
import {
  Alert, Box, Button, Card, CardActions, CardContent, Container, Snackbar, Stack, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { useEvent } from '../state/EventContext';
import { PersonalPlanPdf } from '../components/pdf/PersonalPlanPdf';
import { NameTagsPdf } from '../components/pdf/NameTagsPdf';
import { AreaSignsPdf } from '../components/pdf/AreaSignsPdf';
import { MasterMatrixPdf } from '../components/pdf/MasterMatrixPdf';
import { QualityReportPdf } from '../components/pdf/QualityReportPdf';

export function PrintPage() {
  const { state } = useEvent();
  const navigate = useNavigate();
  const [error, setError] = useState<string | undefined>(undefined);

  if (!state?.schedule) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="info">Generate a schedule first.</Alert>
      </Container>
    );
  }

  const { roster, params, schedule } = state;

  const tiles = [
    {
      key: 'plans',
      title: 'Personal plans',
      description: 'Perforated A4 per person, 10 mini-tags each.',
      node: () => <PersonalPlanPdf roster={roster} params={params} schedule={schedule} />,
      filename: 'personal-plans.pdf',
    },
    {
      key: 'tags',
      title: 'Name tags',
      description: 'Four wearable tags per A4 sheet.',
      node: () => <NameTagsPdf roster={roster} />,
      filename: 'name-tags.pdf',
    },
    {
      key: 'signs',
      title: 'Area signs',
      description: 'One A4 per area with a big letter.',
      node: () => <AreaSignsPdf areas={params.areas} />,
      filename: 'area-signs.pdf',
    },
    {
      key: 'matrix',
      title: 'Master matrix',
      description: "Organiser's cheat-sheet, landscape A4.",
      node: () => <MasterMatrixPdf roster={roster} params={params} schedule={schedule} />,
      filename: 'master-matrix.pdf',
    },
    {
      key: 'quality',
      title: 'Quality report',
      description: 'Repeat counts and per-person never-met list.',
      node: () => <QualityReportPdf roster={roster} schedule={schedule} />,
      filename: 'quality-report.pdf',
    },
  ];

  async function downloadOne(title: string, filename: string, node: React.ReactElement) {
    try {
      const blob = await pdf(node).toBlob();
      saveAs(blob, filename);
    } catch (e) {
      setError(`Could not generate ${title}: ${(e as Error).message}`);
    }
  }

  async function downloadAll() {
    try {
      const zip = new JSZip();
      for (const t of tiles) {
        const blob = await pdf(t.node()).toBlob();
        zip.file(t.filename, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'speed-networking-materials.zip');
    } catch (e) {
      setError(`Could not build zip: ${(e as Error).message}`);
    }
  }

  return (
    <Container sx={{ py: 4 }} maxWidth="lg">
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">Print materials</Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}>
          {tiles.map((t) => (
            <Card key={t.key}>
              <CardContent>
                <Typography variant="h6">{t.title}</Typography>
                <Typography variant="body2" color="text.secondary">{t.description}</Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => downloadOne(t.title, t.filename, t.node())}>
                  Download PDF
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={downloadAll}>Download all as ZIP</Button>
          <Button variant="contained" onClick={() => navigate('/run')}>Start event</Button>
        </Stack>
      </Stack>
      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(undefined)}
        message={error} />
    </Container>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/pages/PrintPage.test.tsx`
Expected: 2 passing.

- [ ] **Step 5: Full suite + commit**

Run: `pnpm test`

```bash
git add src/pages/PrintPage.tsx src/pages/PrintPage.test.tsx
git commit -m "feat: print page with per-artifact download and zip bundle"
```

---

## Task 16: AreaGrid component

**Files:**
- Create: `src/components/AreaGrid.tsx`
- Create: `src/components/AreaGrid.test.tsx`

Reusable visualisation: given a `Round`, `roster`, and `params`, render the area cards with names/companies. Accepts a `phase` prop so callers can drive colour states.

- [ ] **Step 1: Write the failing test**

Create `src/components/AreaGrid.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { describe, expect, it } from 'vitest';
import { AreaGrid } from './AreaGrid';
import { theme } from '../theme';
import type { EventParams, Person, Round } from '../domain/types';

const roster: Person[] = [
  { id: 'a', name: 'Alice', company: 'Acme', rowIndex: 2 },
  { id: 'b', name: 'Bob', company: 'Beta', rowIndex: 3 },
];
const params: EventParams = {
  groupSize: 2, areas: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
  numRounds: 1, roundSeconds: 180, moveSeconds: 30, avoidSameCompany: false, breaks: [],
};
const round: Round = {
  index: 0,
  groups: [{ areaId: 'A', memberIds: ['a', 'b'] }, { areaId: 'B', memberIds: [] }],
  sittingOut: [],
};

describe('AreaGrid', () => {
  it('renders one card per area with member names', () => {
    render(
      <ThemeProvider theme={theme}>
        <AreaGrid roster={roster} params={params} round={round} phase="conversation" />
      </ThemeProvider>,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/components/AreaGrid.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/components/AreaGrid.tsx`:

```tsx
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { EventParams, Person, Round, RunPhase } from '../domain/types';

interface Props {
  roster: Person[];
  params: EventParams;
  round: Round;
  phase: RunPhase;
  nextRound?: Round;                  // when set, arrows show each person's next area
  highlightPersonId?: string;         // "where's Bob?"
}

export function AreaGrid({ roster, params, round, phase, nextRound, highlightPersonId }: Props) {
  const personById = new Map(roster.map((p) => [p.id, p]));
  const nextAreaByPerson = new Map<string, string>();
  if (nextRound) {
    for (const g of nextRound.groups) {
      const label = params.areas.find((a) => a.id === g.areaId)?.label ?? '';
      for (const id of g.memberIds) nextAreaByPerson.set(id, label);
    }
  }

  return (
    <Box sx={{
      display: 'grid',
      gap: 2,
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
    }}>
      {round.groups.map((g) => {
        const areaLabel = params.areas.find((a) => a.id === g.areaId)?.label ?? g.areaId;
        return (
          <Paper key={g.areaId}
            sx={{
              p: 2,
              minHeight: 160,
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor:
                phase === 'move' ? 'warning.main'
                : phase === 'break' ? 'grey.300'
                : 'primary.light',
              opacity: phase === 'break' ? 0.4 : 1,
              transition: 'border-color 200ms',
            }}>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>{areaLabel}</Typography>
            <Stack spacing={0.5}>
              {g.memberIds.map((id) => {
                const person = personById.get(id);
                if (!person) return null;
                const nextArea = nextAreaByPerson.get(id);
                const highlight = highlightPersonId === id;
                return (
                  <Chip
                    key={id}
                    color={highlight ? 'primary' : 'default'}
                    label={
                      <Box>
                        <Typography component="span" sx={{ fontWeight: 600 }}>{person.name}</Typography>
                        {person.company && (
                          <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                            {person.company}
                          </Typography>
                        )}
                        {phase === 'move' && nextArea && (
                          <Typography component="span" variant="caption" sx={{ ml: 1, color: 'warning.dark', fontWeight: 700 }}>
                            → {nextArea}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                );
              })}
            </Stack>
          </Paper>
        );
      })}
    </Box>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/components/AreaGrid.test.tsx`
Expected: 1 passing.

- [ ] **Step 5: Commit**

```bash
git add src/components/AreaGrid.tsx src/components/AreaGrid.test.tsx
git commit -m "feat: AreaGrid visualisation for run page"
```

---

## Task 17: RunPage — timer + area grid

**Files:**
- Modify: `src/pages/RunPage.tsx`
- Create: `src/pages/RunPage.test.tsx`

Design:
- A single `useEffect` sets up a `setInterval(1000)` that recomputes `elapsedMs` and calls `actions.setPhase(next)` when the current phase should end.
- Phase transitions per spec §8.4 + §5 breaks table:
  - `conversation` (duration = `roundSeconds - moveSeconds`) → `move`
  - `move` (duration = `moveSeconds`) → if a break is configured after this round, `break`; else advance to next round's `conversation`
  - `break` (duration = matching `BreakSlot.seconds`) → next round's `conversation`
  - When last round ends → `finished`
- Controls: Start (if idle), Pause/Resume, Skip phase (advance immediately), End event.

- [ ] **Step 1: Write the failing test**

Create `src/pages/RunPage.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RunPage } from './RunPage';
import { EventProvider, useEvent } from '../state/EventContext';
import { theme } from '../theme';
import type { Schedule } from '../domain/types';

function Seed() {
  const { state, actions } = useEvent();
  if (!state) {
    actions.importRoster([
      { id: 'a', name: 'Alice', company: 'Acme', rowIndex: 2 },
      { id: 'b', name: 'Bob', company: 'Beta', rowIndex: 3 },
    ]);
    return null;
  }
  if (!state.schedule) {
    const schedule: Schedule = {
      seed: 1, generatedAt: '2026-07-22T00:00:00.000Z',
      rounds: [
        { index: 0, groups: [{ areaId: 'A', memberIds: ['a', 'b'] }], sittingOut: [] },
        { index: 1, groups: [{ areaId: 'A', memberIds: ['a', 'b'] }], sittingOut: [] },
      ],
      quality: { totalPairs: 0, uniquePairs: 0, repeatedPairs: 0, sameCompanyPairs: 0,
        perPerson: [
          { id: 'a', metIds: [], neverMetIds: [], repeatMeetings: 0 },
          { id: 'b', metIds: [], neverMetIds: [], repeatMeetings: 0 },
        ] },
    };
    actions.updateParams({
      areas: [{ id: 'A', label: 'A' }], numRounds: 2, roundSeconds: 3, moveSeconds: 1, groupSize: 2,
    });
    actions.setSchedule(schedule);
  }
  return null;
}

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <EventProvider>
        <MemoryRouter>
          <Seed />
          <RunPage />
        </MemoryRouter>
      </EventProvider>
    </ThemeProvider>,
  );
}

describe('RunPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('shows Start button when idle', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('transitions conversation → move → next round conversation', () => {
    renderPage();
    act(() => screen.getByRole('button', { name: /start/i }).click());
    expect(screen.getByText(/round 1/i)).toBeInTheDocument();
    // conversation phase lasts roundSeconds - moveSeconds = 2s
    act(() => vi.advanceTimersByTime(2100));
    expect(screen.getByText(/move/i)).toBeInTheDocument();
    // move lasts 1s → next round
    act(() => vi.advanceTimersByTime(1100));
    expect(screen.getByText(/round 2/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/pages/RunPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

Overwrite `src/pages/RunPage.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Container, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { useEvent } from '../state/EventContext';
import { AreaGrid } from '../components/AreaGrid';
import type { BreakSlot, RunPhase } from '../domain/types';

function phaseDurationMs(
  phase: RunPhase,
  roundIndex: number,
  roundSeconds: number,
  moveSeconds: number,
  breaks: BreakSlot[],
): number {
  if (phase === 'conversation') return Math.max(0, (roundSeconds - moveSeconds) * 1000);
  if (phase === 'move') return moveSeconds * 1000;
  if (phase === 'break') {
    const slot = breaks.find((b) => b.afterRound === roundIndex + 1);
    return (slot?.seconds ?? 0) * 1000;
  }
  return 0;
}

function nextPhase(
  current: RunPhase,
  roundIndex: number,
  totalRounds: number,
  breaks: BreakSlot[],
): { phase: RunPhase; roundIndex: number } {
  if (current === 'conversation') return { phase: 'move', roundIndex };
  if (current === 'move') {
    if (breaks.some((b) => b.afterRound === roundIndex + 1) && roundIndex + 1 < totalRounds) {
      return { phase: 'break', roundIndex };
    }
    if (roundIndex + 1 >= totalRounds) return { phase: 'finished', roundIndex };
    return { phase: 'conversation', roundIndex: roundIndex + 1 };
  }
  if (current === 'break') {
    if (roundIndex + 1 >= totalRounds) return { phase: 'finished', roundIndex };
    return { phase: 'conversation', roundIndex: roundIndex + 1 };
  }
  return { phase: current, roundIndex };
}

export function RunPage() {
  const { state, actions } = useEvent();
  const [now, setNow] = useState(Date.now());
  const [find, setFind] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const run = state?.runState;

  useEffect(() => {
    if (!state || !state.schedule || !run || run.phase === 'idle'
        || run.phase === 'paused' || run.phase === 'finished') return;
    const dur = phaseDurationMs(run.phase, run.currentRoundIndex,
      state.params.roundSeconds, state.params.moveSeconds, state.params.breaks);
    if (now - run.phaseStartedAt >= dur) {
      const next = nextPhase(run.phase, run.currentRoundIndex,
        state.schedule.rounds.length, state.params.breaks);
      actions.setPhase({ phase: next.phase, roundIndex: next.roundIndex, startedAt: Date.now() });
    }
  }, [now, run, state, actions]);

  const currentRound = useMemo(() => {
    if (!state?.schedule) return undefined;
    const idx = run?.currentRoundIndex ?? 0;
    return state.schedule.rounds[idx];
  }, [state, run]);

  const nextRoundData = useMemo(() => {
    if (!state?.schedule) return undefined;
    const idx = (run?.currentRoundIndex ?? 0) + 1;
    return state.schedule.rounds[idx];
  }, [state, run]);

  if (!state?.schedule) {
    return <Container sx={{ py: 4 }}><Alert severity="info">Generate a schedule first.</Alert></Container>;
  }
  if (!currentRound) {
    return <Container sx={{ py: 4 }}><Alert severity="info">No round available.</Alert></Container>;
  }

  const phase = run?.phase ?? 'idle';
  const dur = phaseDurationMs(phase, run?.currentRoundIndex ?? 0, state.params.roundSeconds, state.params.moveSeconds, state.params.breaks);
  const elapsed = run ? now - run.phaseStartedAt : 0;
  const remaining = Math.max(0, dur - elapsed);
  const mm = Math.floor(remaining / 60000).toString().padStart(2, '0');
  const ss = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');

  const highlight = find.trim()
    ? state.roster.find((p) => p.name.toLowerCase().includes(find.trim().toLowerCase()))?.id
    : undefined;

  return (
    <Container sx={{ py: 3 }} maxWidth="xl">
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="h5">Round {(run?.currentRoundIndex ?? 0) + 1} of {state.schedule.rounds.length}</Typography>
          <Chip label={phase.toUpperCase()} color={phase === 'move' ? 'warning' : phase === 'break' ? 'default' : 'primary'} />
          <Typography variant="h3" sx={{ fontVariantNumeric: 'tabular-nums', ml: 'auto' }}>{mm}:{ss}</Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
          {phase === 'idle' && (
            <Button variant="contained" onClick={actions.startRun}>Start</Button>
          )}
          {phase !== 'idle' && phase !== 'paused' && phase !== 'finished' && (
            <>
              <Button onClick={() => actions.pauseRun(remaining)}>Pause</Button>
              <Button onClick={() => {
                const next = nextPhase(phase, run!.currentRoundIndex, state.schedule!.rounds.length, state.params.breaks);
                actions.setPhase({ phase: next.phase, roundIndex: next.roundIndex, startedAt: Date.now() });
              }}>Skip phase</Button>
              <Button color="error" onClick={actions.endRun}>End event</Button>
            </>
          )}
          {phase === 'paused' && (
            <>
              <Button variant="contained" onClick={() => actions.resumeRun(Date.now() - (dur - (run!.pausedRemainingMs ?? 0)))}>Resume</Button>
              <Button color="error" onClick={actions.endRun}>End event</Button>
            </>
          )}
          <TextField size="small" placeholder="Find a name…" value={find}
            onChange={(e) => setFind(e.target.value)} sx={{ ml: 'auto', minWidth: 200 }} />
        </Stack>
      </Paper>

      {phase === 'break' ? (
        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'grey.100' }}>
          <Typography variant="h2">
            {state.params.breaks.find((b) => b.afterRound === (run?.currentRoundIndex ?? 0) + 1)?.label ?? 'Break'}
          </Typography>
          <Typography variant="h1" sx={{ mt: 2, fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</Typography>
        </Paper>
      ) : phase === 'finished' ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h3">Event complete 🎉</Typography>
        </Paper>
      ) : (
        <AreaGrid
          roster={state.roster}
          params={state.params}
          round={currentRound}
          phase={phase}
          nextRound={phase === 'move' ? nextRoundData : undefined}
          highlightPersonId={highlight}
        />
      )}
    </Container>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/pages/RunPage.test.tsx`
Expected: 2 passing.

- [ ] **Step 5: Full suite + commit**

Run: `pnpm test && pnpm exec tsc --noEmit`

```bash
git add src/pages/RunPage.tsx src/pages/RunPage.test.tsx
git commit -m "feat: run page timer state machine and area grid visualisation"
```

---

## Task 18: E2E golden path

**Files:**
- Create: `cypress/fixtures/roster-25.csv`
- Create: `cypress/e2e/golden-path.cy.ts`

- [ ] **Step 1: Create the CSV fixture**

Create `cypress/fixtures/roster-25.csv`:

```csv
Name,Company
Alice,Acme
Bob,Beta
Carol,Casa
Dan,Delta
Eve,Echo
Frank,Foxtrot
Grace,Gulf
Heidi,Hotel
Ivan,India
Judy,Juliet
Karl,Kilo
Liam,Lima
Mia,Mike
Nia,November
Owen,Oscar
Peggy,Papa
Quinn,Quebec
Ruth,Romeo
Sam,Sierra
Trent,Tango
Uma,Uniform
Vince,Victor
Wendy,Whiskey
Xander,Xray
Yara,Yankee
```

- [ ] **Step 2: Write the E2E spec**

Create `cypress/e2e/golden-path.cy.ts`:

```ts
describe('speed-networking golden path', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.visit('/setup');
  });

  it('imports roster, generates schedule, opens print, starts run', () => {
    cy.get('input[type=file]').selectFile('cypress/fixtures/roster-25.csv', { force: true });
    cy.contains(/25 people/i);
    cy.contains(/generate schedule/i).click();
    cy.location('pathname').should('eq', '/schedule');
    cy.contains(/^Generate$/).click();
    cy.contains(/round 1/i, { timeout: 8000 });
    cy.contains(/print materials/i).click();
    cy.location('pathname').should('eq', '/print');
    cy.contains(/personal plans/i);
    cy.contains(/start event/i).click();
    cy.location('pathname').should('eq', '/run');
    cy.contains(/round 1/i);
  });
});
```

- [ ] **Step 3: Sanity — run the app and confirm no runtime errors**

In one shell: `pnpm run dev`
In another: `pnpm exec cypress run --spec cypress/e2e/golden-path.cy.ts`
Expected: pass.

If dev-server-timing makes the run flaky, use `pnpm run build && pnpm run preview` instead of `dev`.

- [ ] **Step 4: Commit**

```bash
git add cypress/fixtures/roster-25.csv cypress/e2e/golden-path.cy.ts
git commit -m "test: e2e golden path from import to run"
```

---

## Task 19: Final polish + verification

**Files:**
- Modify: `README.md` if the workflow warrants a quick user-facing note.

- [ ] **Step 1: Type-check + full test suite + build**

Run:
```bash
pnpm exec tsc --noEmit
pnpm test
pnpm run build
```
All expected to pass.

- [ ] **Step 2: Manual smoke in a real browser**

```bash
pnpm run dev
```

Walk through: import `cypress/fixtures/roster-25.csv` → tweak parameters → generate → open Print (download one PDF and verify it opens) → Start event → let the timer transition at least once.

- [ ] **Step 3: Update README with a one-line usage pointer**

Add under Scripts:

```
Open http://localhost:3000/setup, upload an .xlsx or .csv roster (Name, Company columns), configure parameters, then generate/print/run.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: point users at /setup as the entry route"
```

---

## Verification checklist

Before declaring the plan complete:

- [ ] `pnpm exec tsc --noEmit` passes.
- [ ] `pnpm test` passes with 0 failures.
- [ ] `pnpm run build` succeeds.
- [ ] `pnpm exec cypress run` passes for the golden-path spec.
- [ ] Manually running the app end-to-end works: import → generate → print → run.
- [ ] `localStorage` persists an event across a page reload.
- [ ] "New event" clears state and returns to Setup.
