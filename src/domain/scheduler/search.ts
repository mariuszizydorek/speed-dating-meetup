import { mulberry32, pickIntExclusive } from '../prng';
import type { EventParams, Person, PersonId, Round } from '../types';
import {
  REPEAT_WEIGHT,
  SAME_COMPANY_WEIGHT,
  applySwap,
  buildPairCounts,
  countSameCompanyPairs,
  pairKey,
  repeatTransition,
} from './cost';
import { buildSeed } from './seed';

export interface SearchOptions {
  seed: number;
  timeBudgetMs: number;
  restarts: number;
}

// With the incremental-delta hot loop we can evaluate ~10^5–10^6 proposals per
// second; the old value of 500 caused restarts to bail out almost instantly.
// This limit is now the number of *consecutively rejected* proposals we tolerate
// before giving up on a restart and diversifying.
const STAGNATION_LIMIT = 200_000;
const PLATEAU_ACCEPT_PROB = 0.2;
// Odd 32-bit constant used to derive per-restart RNG seeds. Same as the
// golden-ratio hash constant used in various PRNG mixers.
const RESTART_SEED_STRIDE = 0x9e3779b1;

export function search(
  seedRounds: Round[],
  roster: Person[],
  params: EventParams,
  opts: SearchOptions,
): Round[] {
  const avoidSameCompany = params.avoidSameCompany;
  const companyById = avoidSameCompany
    ? new Map(roster.map((p) => [p.id, p.company]))
    : null;

  let best = cloneRounds(seedRounds);
  let bestCost = evaluateCost(best, roster, avoidSameCompany);

  const deadline = Date.now() + opts.timeBudgetMs;

  for (let restart = 0; restart < opts.restarts; restart++) {
    if (Date.now() >= deadline) break;

    // Restart 0 starts from the caller-provided seed schedule. Restart k>=1
    // shuffles a copy of the roster with a fresh, seed-derived RNG and rebuilds
    // — this diversifies the starting point while preserving overall
    // determinism (same opts.seed => same result).
    const restartRng = mulberry32(opts.seed + restart * RESTART_SEED_STRIDE);
    let current: Round[];
    if (restart === 0) {
      current = cloneRounds(seedRounds);
    } else {
      const shuffled = shuffleRoster(roster, restartRng);
      current = cloneRounds(buildSeed(shuffled, params));
    }

    // Incremental running state: pair counts across the entire schedule and
    // same-company pair count. Updated on every accepted swap.
    const pairCounts = buildPairCounts(current);
    let sameCompanyPairs = avoidSameCompany
      ? countSameCompanyPairs(current, roster)
      : 0;
    let currentCost = costFromState(pairCounts, sameCompanyPairs);

    if (currentCost < bestCost) {
      best = cloneRounds(current);
      bestCost = currentCost;
      if (bestCost === 0) return best;
    }

    let stagnation = 0;

    while (Date.now() < deadline) {
      const proposal = proposeSwap(current, restartRng);
      if (!proposal) break;

      const round = current[proposal.round];
      const membersA = round.groups[proposal.gA].memberIds;
      const membersB = round.groups[proposal.gB].memberIds;
      const a = membersA[proposal.iA];
      const b = membersB[proposal.iB];

      // Local delta computation (no full costOf). We tentatively mutate the
      // pairCounts map and revert if we don't accept.
      const { repeatDelta, sameCompanyDelta, appliedOps } = computeSwapDelta(
        pairCounts,
        membersA,
        membersB,
        a,
        b,
        companyById,
      );
      const delta = repeatDelta * REPEAT_WEIGHT + sameCompanyDelta * SAME_COMPANY_WEIGHT;

      let accept = false;
      if (delta < 0) accept = true;
      else if (delta === 0 && restartRng() < PLATEAU_ACCEPT_PROB) accept = true;

      if (accept) {
        // Commit the pair swap in the schedule and keep the pairCounts map as
        // already updated by computeSwapDelta.
        applySwap(current, proposal.round, proposal.gA, proposal.iA, proposal.gB, proposal.iB);
        sameCompanyPairs += sameCompanyDelta;
        currentCost += delta;
        stagnation = 0;
        if (currentCost < bestCost) {
          best = cloneRounds(current);
          bestCost = currentCost;
          if (bestCost === 0) return best;
        }
      } else {
        // Undo the tentative pairCounts updates by replaying in reverse.
        revertSwapDelta(pairCounts, appliedOps);
        stagnation += 1;
        if (stagnation >= STAGNATION_LIMIT) break;
      }
    }
  }

  return best;
}

/** Compute cost from an incremental running state. */
function costFromState(
  pairCounts: Map<string, number>,
  sameCompanyPairs: number,
): number {
  let repeats = 0;
  for (const count of pairCounts.values()) {
    if (count > 1) repeats += count - 1;
  }
  return repeats * REPEAT_WEIGHT + sameCompanyPairs * SAME_COMPANY_WEIGHT;
}

/** Evaluate the exact cost of a schedule; used only outside the hot loop. */
function evaluateCost(
  rounds: Round[],
  roster: Person[],
  avoidSameCompany: boolean,
): number {
  const counts = buildPairCounts(rounds);
  const same = avoidSameCompany ? countSameCompanyPairs(rounds, roster) : 0;
  return costFromState(counts, same);
}

interface PairOp {
  key: string;
  /** +1 if we incremented (revert by decrementing), -1 if decremented. */
  step: 1 | -1;
}

interface SwapDelta {
  repeatDelta: number;
  sameCompanyDelta: number;
  appliedOps: PairOp[];
}

/**
 * Tentatively apply pairCounts changes that a swap (a <-> b between membersA
 * and membersB) would produce, returning the resulting deltas plus the list
 * of applied operations so the caller can revert if the swap is rejected.
 */
function computeSwapDelta(
  pairCounts: Map<string, number>,
  membersA: PersonId[],
  membersB: PersonId[],
  a: PersonId,
  b: PersonId,
  companyById: Map<PersonId, string> | null,
): SwapDelta {
  let repeatDelta = 0;
  let sameCompanyDelta = 0;
  const appliedOps: PairOp[] = [];

  for (const x of membersA) {
    if (x === a) continue;
    repeatDelta += repeatTransition(pairCounts, a, x, -1);
    stepPair(pairCounts, a, x, -1, appliedOps);
    repeatDelta += repeatTransition(pairCounts, b, x, +1);
    stepPair(pairCounts, b, x, +1, appliedOps);
    if (companyById) {
      const cx = companyById.get(x) ?? '';
      const ca = companyById.get(a) ?? '';
      const cb = companyById.get(b) ?? '';
      if (cx && ca === cx) sameCompanyDelta -= 1;
      if (cx && cb === cx) sameCompanyDelta += 1;
    }
  }

  for (const y of membersB) {
    if (y === b) continue;
    repeatDelta += repeatTransition(pairCounts, b, y, -1);
    stepPair(pairCounts, b, y, -1, appliedOps);
    repeatDelta += repeatTransition(pairCounts, a, y, +1);
    stepPair(pairCounts, a, y, +1, appliedOps);
    if (companyById) {
      const cy = companyById.get(y) ?? '';
      const ca = companyById.get(a) ?? '';
      const cb = companyById.get(b) ?? '';
      if (cy && cb === cy) sameCompanyDelta -= 1;
      if (cy && ca === cy) sameCompanyDelta += 1;
    }
  }

  return { repeatDelta, sameCompanyDelta, appliedOps };
}

function stepPair(
  counts: Map<string, number>,
  a: PersonId,
  b: PersonId,
  step: 1 | -1,
  log: PairOp[],
): void {
  const key = pairKey(a, b);
  const next = (counts.get(key) ?? 0) + step;
  if (next <= 0) counts.delete(key);
  else counts.set(key, next);
  log.push({ key, step });
}

function revertSwapDelta(counts: Map<string, number>, ops: PairOp[]): void {
  // Reverse order to unwind exactly; direction of each op is inverted.
  for (let i = ops.length - 1; i >= 0; i--) {
    const op = ops[i];
    const next = (counts.get(op.key) ?? 0) - op.step;
    if (next <= 0) counts.delete(op.key);
    else counts.set(op.key, next);
  }
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

/**
 * Fisher-Yates shuffle a copy of the roster using the provided RNG. The input
 * is not mutated. Determinism follows from the RNG.
 */
export function shuffleRoster(roster: Person[], rng: () => number): Person[] {
  const copy = roster.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = pickIntExclusive(rng, i + 1);
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

function cloneRounds(rounds: Round[]): Round[] {
  return rounds.map((r) => ({
    ...r,
    groups: r.groups.map((g) => ({ ...g, memberIds: [...g.memberIds] })),
    sittingOut: [...r.sittingOut],
  }));
}
