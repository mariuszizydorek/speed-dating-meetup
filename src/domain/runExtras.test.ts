import { describe, expect, it } from 'vitest';
import { defaultIcebreaker, defaultIcebreakerList, icebreakerForRound } from './runExtras';

describe('icebreakerForRound', () => {
  it('is blank when overrides are missing', () => {
    expect(icebreakerForRound(0)).toBe('');
    expect(icebreakerForRound(0, undefined)).toBe('');
    expect(icebreakerForRound(0, [])).toBe('');
    expect(icebreakerForRound(0, [null])).toBe('');
  });

  it('returns a custom prompt when set', () => {
    expect(icebreakerForRound(1, [null, 'Custom prompt'])).toBe('Custom prompt');
  });

  it('treats empty string as blank', () => {
    expect(icebreakerForRound(0, [''])).toBe('');
  });
});

describe('defaultIcebreakerList', () => {
  it('seeds one built-in prompt per round', () => {
    expect(defaultIcebreakerList(2)).toEqual([defaultIcebreaker(0), defaultIcebreaker(1)]);
  });
});
