import { describe, expect, it } from 'vitest';
import { buildSeed, chooseCoprimeK } from './seed';
import type { EventParams, Person } from '../types';

function roster(n: number, companyStride = 1): Person[] {
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

  it('puts over-fill into sittingOut and seats everyone exactly once', () => {
    const p = params(); // 10 areas × 4 = 40 seats
    const r = roster(50);
    const rounds = buildSeed(r, p);
    for (const round of rounds) {
      const seated = round.groups.flatMap((g) => g.memberIds);
      expect(seated).toHaveLength(40);
      expect(round.sittingOut).toHaveLength(10);
      const all = [...seated, ...round.sittingOut];
      expect(new Set(all).size).toBe(50);
      for (const g of round.groups) {
        expect(g.memberIds.length).toBeLessThanOrEqual(4);
      }
    }
  });
});
