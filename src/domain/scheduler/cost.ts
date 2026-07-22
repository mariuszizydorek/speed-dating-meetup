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
 * Build the initial `pairCounts` map over the entire schedule. Used to seed
 * the search's incremental running state. The map key is `pairKey(a, b)` and
 * the value is the number of times that pair appears together in any group.
 */
export function buildPairCounts(rounds: Round[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const round of rounds) {
    for (const group of round.groups) {
      const members = group.memberIds;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const key = pairKey(members[i], members[j]);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
    }
  }
  return counts;
}

/**
 * Count how many pairs in the schedule are within the same company. Used to
 * seed the search's incremental running same-company counter.
 */
export function countSameCompanyPairs(
  rounds: Round[],
  roster: Person[],
): number {
  const companyById = new Map(roster.map((p) => [p.id, p.company]));
  let sameCompanyPairs = 0;
  for (const round of rounds) {
    for (const group of round.groups) {
      const members = group.memberIds;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const ca = companyById.get(members[i]) ?? '';
          const cb = companyById.get(members[j]) ?? '';
          if (ca && ca === cb) sameCompanyPairs += 1;
        }
      }
    }
  }
  return sameCompanyPairs;
}

/**
 * Return the cost delta of swapping members at (roundIndex, groupA, indexA)
 * and (roundIndex, groupB, indexB). Does NOT mutate the rounds argument.
 *
 * Purely local computation:
 * - Only pair contributions that involve `a` moving to groupB or `b` moving to
 *   groupA change. All other groups (and other rounds) are unaffected in
 *   contribution, but repeat counts are global across rounds, so we consult
 *   the full-schedule `pairCounts` map to determine repeat transitions.
 * - We build that map once from `rounds` here. In the hot search loop the
 *   caller maintains an incremental `pairCounts` map and computes the delta
 *   directly (see search.ts) — this function is kept for tests and API
 *   compatibility.
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
  if (groupA === groupB) return 0;

  const round = rounds[roundIndex];
  const membersA = round.groups[groupA].memberIds;
  const membersB = round.groups[groupB].memberIds;
  const a = membersA[indexA];
  const b = membersB[indexB];
  if (a === b) return 0;

  const pairCounts = buildPairCounts(rounds);
  const companyById = options.avoidSameCompany
    ? new Map(roster.map((p) => [p.id, p.company]))
    : null;

  let repeatDelta = 0;
  let sameCompanyDelta = 0;

  // For each x in membersA where x !== a:
  //   removed pair (a,x), added pair (b,x)
  for (const x of membersA) {
    if (x === a) continue;
    repeatDelta += repeatTransition(pairCounts, a, x, -1);
    // Reflect the removal so subsequent transitions for the same pair see
    // the updated count (matters if (a,x) and (b,x) are the same pair —
    // impossible here since x !== a and x is in membersA (which excludes b),
    // but safe in general).
    decrement(pairCounts, a, x);
    repeatDelta += repeatTransition(pairCounts, b, x, +1);
    increment(pairCounts, b, x);

    if (companyById) {
      const cx = companyById.get(x) ?? '';
      const ca = companyById.get(a) ?? '';
      const cb = companyById.get(b) ?? '';
      if (cx && ca === cx) sameCompanyDelta -= 1;
      if (cx && cb === cx) sameCompanyDelta += 1;
    }
  }

  // For each y in membersB where y !== b:
  //   removed pair (b,y), added pair (a,y)
  for (const y of membersB) {
    if (y === b) continue;
    repeatDelta += repeatTransition(pairCounts, b, y, -1);
    decrement(pairCounts, b, y);
    repeatDelta += repeatTransition(pairCounts, a, y, +1);
    increment(pairCounts, a, y);

    if (companyById) {
      const cy = companyById.get(y) ?? '';
      const ca = companyById.get(a) ?? '';
      const cb = companyById.get(b) ?? '';
      if (cy && cb === cy) sameCompanyDelta -= 1;
      if (cy && ca === cy) sameCompanyDelta += 1;
    }
  }

  return repeatDelta * REPEAT_WEIGHT + sameCompanyDelta * SAME_COMPANY_WEIGHT;
}

/**
 * How the number-of-repeats term changes when the pair (a,b) count goes from
 * `n` to `n + step` where `step` is +1 or -1. Repeats contribute `max(0, n-1)`.
 */
export function repeatTransition(
  counts: Map<string, number>,
  a: PersonId,
  b: PersonId,
  step: 1 | -1,
): number {
  const key = pairKey(a, b);
  const n = counts.get(key) ?? 0;
  const before = n > 1 ? n - 1 : 0;
  const after = n + step > 1 ? n + step - 1 : 0;
  return after - before;
}

function increment(counts: Map<string, number>, a: PersonId, b: PersonId): void {
  const key = pairKey(a, b);
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

function decrement(counts: Map<string, number>, a: PersonId, b: PersonId): void {
  const key = pairKey(a, b);
  const next = (counts.get(key) ?? 0) - 1;
  if (next <= 0) counts.delete(key);
  else counts.set(key, next);
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
