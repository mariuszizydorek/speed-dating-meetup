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
