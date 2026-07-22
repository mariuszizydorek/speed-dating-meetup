import type { EventParams } from '../domain/types';

export const DEFAULT_PARAMS: EventParams = {
  groupSize: 4,
  areas: Array.from({ length: 10 }, (_, i) => ({
    id: String.fromCharCode(65 + i),
    label: String.fromCharCode(65 + i),
  })),
  numRounds: 10,
  roundSeconds: 180,
  moveSeconds: 30,
  avoidSameCompany: true,
  breaks: [],
};
