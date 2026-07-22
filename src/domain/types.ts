export type PersonId = string;

export interface Person {
  id: PersonId;
  name: string;
  company: string;
  email: string;
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

export interface TagConfig {
  w: number; // mm
  h: number; // mm
  align: 'left' | 'center';
  companyPos: 'under' | 'bottom';
  nameSize: 'S' | 'M' | 'L';
}

export const DEFAULT_TAG_CFG: TagConfig = {
  w: 90,
  h: 55,
  align: 'center',
  companyPos: 'under',
  nameSize: 'M',
};

export interface EventParams {
  groupSize: number;
  areas: Area[];
  numRounds: number;
  roundSeconds: number;
  moveSeconds: number;
  avoidSameCompany: boolean;
  breaks: BreakSlot[];
  tagCfg?: TagConfig;
  /**
   * Per-round icebreaker prompts (index = round). Empty / missing = no banner.
   */
  icebreakers?: (string | null)[];
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
  | 'finished'
  | 'gap';

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
  /** Active schedule (mirrors plans[planIdx] when plans exist). */
  schedule?: Schedule;
  /** Multiple generated plans for comparison. */
  plans?: Schedule[];
  planIdx?: number;
  runState?: RunState;
}
