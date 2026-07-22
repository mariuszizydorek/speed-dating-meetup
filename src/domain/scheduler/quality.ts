import type { PerPersonQuality, Person, PersonId, Quality, Round } from '../types';
import { pairKey } from './cost';

export function computeQuality(
  rounds: Round[],
  roster: Person[],
  _avoidSameCompany: boolean,
): Quality {
  const companyById = new Map(roster.map((p) => [p.id, p.company]));
  const pairCounts = new Map<string, number>();
  const metByPerson = new Map<PersonId, Set<PersonId>>();
  const repeatByPerson = new Map<PersonId, number>();
  roster.forEach((p) => {
    metByPerson.set(p.id, new Set());
    repeatByPerson.set(p.id, 0);
  });

  let sameCompanyPairs = 0;
  let totalPairs = 0;

  for (const round of rounds) {
    for (const group of round.groups) {
      const members = group.memberIds;
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          totalPairs += 1;
          const a = members[i];
          const b = members[j];
          const key = pairKey(a, b);
          const prev = pairCounts.get(key) ?? 0;
          pairCounts.set(key, prev + 1);
          metByPerson.get(a)!.add(b);
          metByPerson.get(b)!.add(a);
          if (prev >= 1) {
            repeatByPerson.set(a, (repeatByPerson.get(a) ?? 0) + 1);
            repeatByPerson.set(b, (repeatByPerson.get(b) ?? 0) + 1);
          }
          const ca = companyById.get(a) ?? '';
          const cb = companyById.get(b) ?? '';
          if (ca && ca === cb) sameCompanyPairs += 1;
        }
      }
    }
  }

  let uniquePairs = 0;
  let repeatedPairs = 0;
  for (const count of pairCounts.values()) {
    uniquePairs += 1;
    if (count > 1) repeatedPairs += count - 1;
  }

  const allIds = roster.map((p) => p.id);
  const perPerson: PerPersonQuality[] = roster.map((p) => {
    const metSet = metByPerson.get(p.id)!;
    const metIds = allIds.filter((id) => metSet.has(id));
    const neverMetIds = allIds.filter((id) => id !== p.id && !metSet.has(id));
    return {
      id: p.id,
      metIds,
      neverMetIds,
      repeatMeetings: repeatByPerson.get(p.id) ?? 0,
    };
  });

  return {
    totalPairs,
    uniquePairs,
    repeatedPairs,
    sameCompanyPairs,
    perPerson,
  };
}
