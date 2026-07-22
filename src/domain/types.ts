export type PersonId = string;

export interface Person {
  id: PersonId;
  name: string;
  company: string;
  rowIndex: number;
}

export interface Area {
  id: string;
  label: string;
}

export interface BreakSlot {
  afterRound: number;
  seconds: number;
  label: string;
}

export interface EventParams {
  groupSize: number;
  areas: Area[];
  numRounds: number;
  roundSeconds: number;
  moveSeconds: number;
  avoidSameCompany: boolean;
  breaks: BreakSlot[];
}

export interface Group {
  areaId: string;
  memberIds: PersonId[];
}

export interface Round {
  index: number;
  groups: Group[];
  sittingOut: PersonId[];
}

export interface PerPersonQuality {
  id: PersonId;
  metIds: PersonId[];
  neverMetIds: PersonId[];
  repeatMeetings: number;
}

export interface Quality {
  totalPairs: number;
  uniquePairs: number;
  repeatedPairs: number;
  sameCompanyPairs: number;
  perPerson: PerPersonQuality[];
}

export interface Schedule {
  rounds: Round[];
  quality: Quality;
  seed: number;
  generatedAt: string;
}

export type RunPhase =
  | 'idle'
  | 'conversation'
  | 'move'
  | 'break'
  | 'paused'
  | 'finished';

export interface RunState {
  currentRoundIndex: number;
  phase: RunPhase;
  phaseStartedAt: number;
  pausedRemainingMs?: number;
  /**
   * When phase === 'paused', remembers which phase we paused from so
   * that Resume restores the correct running phase (conversation / move / break).
   */
  pausedFromPhase?: RunPhase;
}

export interface EventState {
  version: 1;
  roster: Person[];
  params: EventParams;
  schedule?: Schedule;
  runState?: RunState;
}
