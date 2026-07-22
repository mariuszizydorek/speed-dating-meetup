import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type {
  EventParams,
  EventState,
  Person,
  RunPhase,
  Schedule,
} from '../domain/types';
import { clear as clearStorage, load, save } from './persistence';

const DEFAULT_PARAMS: EventParams = {
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

type Action =
  | { type: 'IMPORT_ROSTER'; payload: Person[] }         // fresh import; clears schedule + runState
  | { type: 'UPDATE_ROSTER'; payload: Person[] }         // inline edit; preserves schedule
  | { type: 'UPDATE_PARAMS'; payload: Partial<EventParams> }
  | { type: 'SET_SCHEDULE'; payload: Schedule }
  | { type: 'START_RUN' }
  | { type: 'SET_PHASE'; payload: { phase: RunPhase; roundIndex: number; startedAt: number } }
  | { type: 'PAUSE_RUN'; payload: { remainingMs: number } }
  | { type: 'RESUME_RUN'; payload: { startedAt: number } }
  | { type: 'END_RUN' }
  | { type: 'CLEAR' };

function reducer(state: EventState | undefined, action: Action): EventState | undefined {
  switch (action.type) {
    case 'CLEAR':
      return undefined;
    case 'IMPORT_ROSTER': {
      const base: EventState = state ?? {
        version: 1,
        roster: [],
        params: DEFAULT_PARAMS,
      };
      return { ...base, roster: action.payload, schedule: undefined, runState: undefined };
    }
    case 'UPDATE_ROSTER': {
      if (!state) return state;
      return { ...state, roster: action.payload };
    }
    case 'UPDATE_PARAMS': {
      if (!state) return state;
      return {
        ...state,
        params: { ...state.params, ...action.payload },
        schedule: undefined,
        runState: undefined,
      };
    }
    case 'SET_SCHEDULE':
      if (!state) return state;
      return { ...state, schedule: action.payload, runState: undefined };
    case 'START_RUN':
      if (!state?.schedule) return state;
      return {
        ...state,
        runState: {
          currentRoundIndex: 0,
          phase: 'conversation',
          phaseStartedAt: Date.now(),
        },
      };
    case 'SET_PHASE':
      if (!state?.runState) return state;
      return {
        ...state,
        runState: {
          ...state.runState,
          phase: action.payload.phase,
          currentRoundIndex: action.payload.roundIndex,
          phaseStartedAt: action.payload.startedAt,
          pausedRemainingMs: undefined,
          pausedFromPhase: undefined,
        },
      };
    case 'PAUSE_RUN':
      if (!state?.runState) return state;
      // Don't overwrite pausedFromPhase if already paused (idempotent pause).
      if (state.runState.phase === 'paused') return state;
      return {
        ...state,
        runState: {
          ...state.runState,
          phase: 'paused',
          pausedFromPhase: state.runState.phase,
          pausedRemainingMs: action.payload.remainingMs,
        },
      };
    case 'RESUME_RUN': {
      if (!state?.runState) return state;
      const restorePhase: RunPhase = state.runState.pausedFromPhase ?? 'conversation';
      return {
        ...state,
        runState: {
          ...state.runState,
          phase: restorePhase,
          phaseStartedAt: action.payload.startedAt,
          pausedRemainingMs: undefined,
          pausedFromPhase: undefined,
        },
      };
    }
    case 'END_RUN':
      if (!state?.runState) return state;
      return {
        ...state,
        runState: { ...state.runState, phase: 'finished' },
      };
    default:
      return state;
  }
}

interface EventActions {
  importRoster(people: Person[]): void;
  updateRoster(people: Person[]): void;
  updateParams(patch: Partial<EventParams>): void;
  setSchedule(schedule: Schedule): void;
  startRun(): void;
  setPhase(input: { phase: RunPhase; roundIndex: number; startedAt: number }): void;
  pauseRun(remainingMs: number): void;
  resumeRun(startedAt: number): void;
  endRun(): void;
  clearEvent(): void;
}

interface EventContextValue {
  state: EventState | undefined;
  actions: EventActions;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

export function EventProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => load());

  // Persist on every state change except undefined-clear (handled explicitly by CLEAR/clearStorage).
  useEffect(() => {
    if (state) save(state);
  }, [state]);

  const actions = useMemo<EventActions>(
    () => ({
      importRoster: (people) => dispatch({ type: 'IMPORT_ROSTER', payload: people }),
      updateRoster: (people) => dispatch({ type: 'UPDATE_ROSTER', payload: people }),
      updateParams: (patch) => dispatch({ type: 'UPDATE_PARAMS', payload: patch }),
      setSchedule: (schedule) => dispatch({ type: 'SET_SCHEDULE', payload: schedule }),
      startRun: () => dispatch({ type: 'START_RUN' }),
      setPhase: (input) => dispatch({ type: 'SET_PHASE', payload: input }),
      pauseRun: (remainingMs) => dispatch({ type: 'PAUSE_RUN', payload: { remainingMs } }),
      resumeRun: (startedAt) => dispatch({ type: 'RESUME_RUN', payload: { startedAt } }),
      endRun: () => dispatch({ type: 'END_RUN' }),
      clearEvent: () => {
        clearStorage();
        dispatch({ type: 'CLEAR' });
      },
    }),
    [],
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

export function useEvent(): EventContextValue {
  const ctx = useContext(EventContext);
  if (!ctx) throw new Error('useEvent must be used inside <EventProvider>');
  return ctx;
}

// re-export for callers that build default params externally
export { DEFAULT_PARAMS };
