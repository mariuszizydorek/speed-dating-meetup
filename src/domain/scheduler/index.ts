import type { EventParams, Person, Schedule } from '../types';
import { buildSeed } from './seed';
import { computeQuality } from './quality';
import { search } from './search';

export interface GenerateOptions {
  seed?: number;
  timeBudgetMs?: number;
  restarts?: number;
}

export function generateSchedule(
  roster: Person[],
  params: EventParams,
  opts: GenerateOptions = {},
): Schedule {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const timeBudgetMs = opts.timeBudgetMs ?? 2000;
  const restarts = opts.restarts ?? 8;

  const seedRounds = buildSeed(roster, params);
  const searched = search(seedRounds, roster, params, { seed, timeBudgetMs, restarts });
  const quality = computeQuality(searched, roster, params.avoidSameCompany);

  return {
    rounds: searched,
    quality,
    seed,
    generatedAt: new Date().toISOString(),
  };
}

export { buildSeed } from './seed';
export { computeQuality } from './quality';
export { search } from './search';
