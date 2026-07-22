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
    email: '',
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
