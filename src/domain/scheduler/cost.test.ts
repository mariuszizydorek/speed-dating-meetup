import { describe, expect, it } from 'vitest';
import { costOf, deltaOnSwap, pairKey } from './cost';
import type { Person, Round } from '../types';

const W1 = 100;
const W2 = 10;

function person(id: string, company = 'X'): Person {
  return { id, name: id.toUpperCase(), company, email: '', rowIndex: 0 };
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
    swapped[1].groups[0].memberIds[2] = 'c'; // was 'd'
    swapped[1].groups[1].memberIds[0] = 'd'; // was 'c'
    const after = costOf(swapped, roster, { avoidSameCompany: false });
    expect(after - before).toBe(delta);
  });
});
