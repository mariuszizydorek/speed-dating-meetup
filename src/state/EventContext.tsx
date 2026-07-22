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
import { DEFAULT_PARAMS } from './defaults';

export { DEFAULT_PARAMS };

type Action =
  | { type: 'IMPORT_ROSTER'; payload: Person[] }
  | { type: 'UPDATE_ROSTER'; payload: Person[] }
  | { type: 'UPDATE_PARAMS'; payload: Partial<EventParams> }
  | { type: 'SET_SCHEDULE'; payload: Schedule }
  | { type: 'ADD_PLAN'; payload: Schedule }
  | { type: 'SELECT_PLAN'; payload: number }
  | { type: 'START_RUN' }
  | { type: 'SET_PHASE'; payload: { phase: RunPhase; roundIndex: number; startedAt: number } }
  | { type: 'PAUSE_RUN'; payload: { remainingMs: number } }
  | { type: 'RESUME_RUN'; payload: { startedAt: number } }
  | { type: 'END_RUN' }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE'; payload: EventState };

function reducer(state: EventState | undefined, action: Action): EventState | undefined {
  switch (action.type) {
    case 'CLEAR':
      return undefined;
    case 'HYDRATE':
      // Replaces the full state wholesale, e.g. when loading a saved project
      // from the library or importing a project .json file.
      return action.payload;
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
      // Cosmetic-only keys (print layout / icebreaker copy) must not invalidate
      // the generated schedule/plans/runState.
      const COSMETIC = new Set(['tagCfg', 'icebreakers']);
      const keys = Object.keys(action.payload);
      const isCosmeticOnly = keys.length > 0 && keys.every((k) => COSMETIC.has(k));
      if (isCosmeticOnly) {
        return { ...state, params: { ...state.params, ...action.payload } };
      }
      return {
        ...state,
        params: { ...state.params, ...action.payload },
        schedule: undefined,
        runState: undefined,
      };
    }
    case 'SET_SCHEDULE':
      if (!state) return state;
      return {
        ...state,
        schedule: action.payload,
        plans: [action.payload],
        planIdx: 0,
        runState: undefined,
      };
    case 'ADD_PLAN': {
      if (!state) return state;
      const plans = [...(state.plans ?? (state.schedule ? [state.schedule] : [])), action.payload];
      const planIdx = plans.length - 1;
      return { ...state, plans, planIdx, schedule: action.payload, runState: undefined };
    }
    case 'SELECT_PLAN': {
      if (!state?.plans?.length) return state;
      const planIdx = Math.max(0, Math.min(action.payload, state.plans.length - 1));
      return { ...state, planIdx, schedule: state.plans[planIdx], runState: undefined };
    }
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
  addPlan(schedule: Schedule): void;
  selectPlan(index: number): void;
  startRun(): void;
  setPhase(input: { phase: RunPhase; roundIndex: number; startedAt: number }): void;
  pauseRun(remainingMs: number): void;
  resumeRun(startedAt: number): void;
  endRun(): void;
  clearEvent(): void;
  loadEvent(state: EventState): void;
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
      addPlan: (schedule) => dispatch({ type: 'ADD_PLAN', payload: schedule }),
      selectPlan: (index) => dispatch({ type: 'SELECT_PLAN', payload: index }),
      startRun: () => dispatch({ type: 'START_RUN' }),
      setPhase: (input) => dispatch({ type: 'SET_PHASE', payload: input }),
      pauseRun: (remainingMs) => dispatch({ type: 'PAUSE_RUN', payload: { remainingMs } }),
      resumeRun: (startedAt) => dispatch({ type: 'RESUME_RUN', payload: { startedAt } }),
      endRun: () => dispatch({ type: 'END_RUN' }),
      clearEvent: () => {
        clearStorage();
        dispatch({ type: 'CLEAR' });
      },
      // Persistence happens via the `save(state)` effect below, which fires
      // whenever `state` changes — including after this HYDRATE dispatch.
      loadEvent: (state) => dispatch({ type: 'HYDRATE', payload: state }),
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
