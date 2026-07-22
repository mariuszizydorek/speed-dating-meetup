import { describe, expect, it } from 'vitest';
import { costOf } from './cost';
import { generateSchedule } from './index';
import { buildSeed } from './seed';
import { search } from './search';
import type { EventParams, Person } from '../types';

function roster(n: number): Person[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    company: `C${i}`,
    rowIndex: i + 2,
  }));
}

function baseParams(overrides: Partial<EventParams> = {}): EventParams {
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

describe('search integration', () => {
  it('achieves 0 repeats for 8 people / 4 areas / 2 group / 3 rounds (trivial resolvable design)', () => {
    // 8 people split into 4 pairs per round × 3 rounds = 12 seat-pairs. Total unique
    // pairs C(8,2) = 28. So 12 pairs across 3 rounds is easily arrangeable without
    // any repeat — the search should find such an assignment quickly.
    const params: EventParams = {
      groupSize: 2,
      areas: Array.from({ length: 4 }, (_, i) => ({
        id: String.fromCharCode(65 + i),
        label: String.fromCharCode(65 + i),
      })),
      numRounds: 3,
      roundSeconds: 180,
      moveSeconds: 30,
      avoidSameCompany: false,
      breaks: [],
    };
    const sched = generateSchedule(roster(8), params, {
      seed: 1,
      timeBudgetMs: 1000,
      restarts: 6,
    });
    expect(sched.quality.repeatedPairs).toBe(0);
  }, 15000);

  it('quality strictly improves vs seed for the 40 × 10 × 4 × 10 case', () => {
    const params = baseParams();
    const r = roster(40);
    const seed = buildSeed(r, params);
    const seedCost = costOf(seed, r, { avoidSameCompany: false });
    const searched = search(seed, r, params, { seed: 1, timeBudgetMs: 2000, restarts: 6 });
    const searchedCost = costOf(searched, r, { avoidSameCompany: false });
    // The seed schedule has hundreds of repeats; even a modest search run should
    // cut that substantially. Assert a strict, meaningful improvement rather than
    // just "not worse".
    expect(searchedCost).toBeLessThan(seedCost);
    expect(searchedCost).toBeLessThan(seedCost / 2);
  }, 15000);
});
