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
