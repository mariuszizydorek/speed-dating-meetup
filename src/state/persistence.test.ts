import { beforeEach, describe, expect, it } from 'vitest';
import { clear, load, save, STORAGE_KEY } from './persistence';
import type { EventState } from '../domain/types';

const sample: EventState = {
  version: 1,
  roster: [{ id: 'p1', name: 'Alice', company: 'Acme', rowIndex: 2 }],
  params: {
    groupSize: 4,
    areas: [{ id: 'A', label: 'A' }],
    numRounds: 1,
    roundSeconds: 180,
    moveSeconds: 30,
    avoidSameCompany: true,
    breaks: [],
  },
};

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips an EventState', () => {
    save(sample);
    expect(load()).toEqual(sample);
  });

  it('returns undefined when nothing is stored', () => {
    expect(load()).toBeUndefined();
  });

  it('clear removes the stored state', () => {
    save(sample);
    clear();
    expect(load()).toBeUndefined();
  });

  it('ignores stored payloads with a wrong version', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...sample, version: 999 }));
    expect(load()).toBeUndefined();
  });

  it('ignores malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    expect(load()).toBeUndefined();
  });
});
