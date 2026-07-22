import { describe, expect, it } from 'vitest';
import { computeQuality } from './quality';
import type { Person, Round } from '../types';

function p(id: string, company = 'X'): Person {
  return { id, name: id, company, email: '', rowIndex: 0 };
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
