import type { EventParams, Group, Person, Round } from '../types';

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export function chooseCoprimeK(groupSize: number, areaCount: number): number {
  for (let k = groupSize; k < areaCount; k++) {
    if (gcd(k, areaCount) === 1) return k;
  }
  return 1;
}

export function buildSeed(roster: Person[], params: EventParams): Round[] {
  const A = params.areas.length;
  const G = params.groupSize;
  const N = roster.length;
  const k = chooseCoprimeK(G, A);
  const rounds: Round[] = [];

  for (let r = 0; r < params.numRounds; r++) {
    // Assign each person to an area for this round.
    const buckets: string[][] = Array.from({ length: A }, () => []);
    for (let i = 0; i < N; i++) {
      const areaIdx = (i + r * k) % A;
      buckets[areaIdx].push(roster[i].id);
    }

    // Convert buckets into groups. For a normally-sized event (N === A*G),
    // each bucket has exactly G people. For under-fill, we distribute.
    const groups: Group[] = params.areas.map((area) => ({
      areaId: area.id,
      memberIds: [],
    }));

    if (N === A * G) {
      for (let a = 0; a < A; a++) groups[a].memberIds = buckets[a];
    } else if (N >= 2) {
      // Under-fill or over-fill relative to A*G. We just consume people
      // in arrival order (per-bucket flatten) and pack area-by-area,
      // giving out groups of size G until we can't sustain the min size 2.
      const flat: string[] = [];
      for (const b of buckets) flat.push(...b);

      // Determine how many areas we can actually fill with >= 2 each.
      // Distribute as evenly as possible in groups of size <= G, min 2.
      const usableAreas = Math.min(A, Math.floor(N / 2));
      if (usableAreas === 0) {
        // Not enough people to form any group of 2; leave everyone sitting out.
        rounds.push({ index: r, groups, sittingOut: roster.map((p) => p.id) });
        continue;
      }

      // Compute per-area size: base = floor(N / usableAreas), remainder to first areas,
      // clipped to G.
      const sizes = distributeSizes(N, usableAreas, G);

      let cursor = 0;
      for (let a = 0; a < usableAreas; a++) {
        groups[a].memberIds = flat.slice(cursor, cursor + sizes[a]);
        cursor += sizes[a];
      }

      // Over-fill: anyone who did not get a seat sits out this round.
      // (Bucket rotation above cycles who lands in the overflow across rounds.)
      const sittingOut = flat.slice(cursor);
      rounds.push({ index: r, groups, sittingOut });
      continue;
    }

    rounds.push({ index: r, groups, sittingOut: [] });
  }

  return rounds;
}

function distributeSizes(total: number, buckets: number, maxSize: number): number[] {
  const sizes: number[] = [];
  let remaining = total;
  for (let a = 0; a < buckets; a++) {
    const areasLeft = buckets - a;
    // Give this bucket ceil(remaining/areasLeft), capped at maxSize, min 2.
    let size = Math.max(2, Math.min(maxSize, Math.ceil(remaining / areasLeft)));
    // If giving this bucket `size` leaves later buckets unable to hit 2 each, shrink.
    while (remaining - size < 2 * (areasLeft - 1) && size > 2) {
      size -= 1;
    }
    sizes.push(size);
    remaining -= size;
  }
  return sizes;
}
