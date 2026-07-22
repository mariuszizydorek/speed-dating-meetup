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
