import { nanoid } from 'nanoid';
import type { EventParams, EventState, Person } from '../domain/types';
import { DEFAULT_PARAMS } from './defaults';

export const PROJECTS_KEY = 'sns:projectsV1';
export const ACTIVE_PROJECT_KEY = 'sns:activeProjectId';

export interface ProjectRecord {
  version: 1;
  type: 'sns-schedule';
  id: string;
  name: string;
  savedAt: number;
  state: EventState;
}

export function loadLibrary(): ProjectRecord[] {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProjectRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLibrary(library: ProjectRecord[]): void {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(library));
  } catch {
    /* noop */
  }
}

export function getActiveProjectId(): string | undefined {
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function setActiveProjectId(id: string | undefined): void {
  try {
    if (!id) localStorage.removeItem(ACTIVE_PROJECT_KEY);
    else localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  } catch {
    /* noop */
  }
}

export function upsertProject(
  library: ProjectRecord[],
  project: ProjectRecord,
): ProjectRecord[] {
  const idx = library.findIndex((p) => p.id === project.id);
  if (idx < 0) return [...library, project];
  const next = [...library];
  next[idx] = project;
  return next;
}

export function deleteProject(library: ProjectRecord[], id: string): ProjectRecord[] {
  return library.filter((p) => p.id !== id);
}

export function createEmptyProject(name = 'New event'): ProjectRecord {
  return {
    version: 1,
    type: 'sns-schedule',
    id: nanoid(10),
    name,
    savedAt: Date.now(),
    state: {
      version: 1,
      roster: [],
      params: structuredClone(DEFAULT_PARAMS),
    },
  };
}

export function projectFromState(
  state: EventState,
  name: string,
  id?: string,
): ProjectRecord {
  return {
    version: 1,
    type: 'sns-schedule',
    id: id ?? nanoid(10),
    name,
    savedAt: Date.now(),
    state,
  };
}

export function exportProjectJson(project: ProjectRecord): string {
  return JSON.stringify(project, null, 2);
}

export function importProjectJson(raw: string): ProjectRecord | undefined {
  try {
    const parsed = JSON.parse(raw) as ProjectRecord;
    if (parsed?.type !== 'sns-schedule' || parsed.version !== 1 || !parsed.state) {
      return undefined;
    }
    return {
      ...parsed,
      id: parsed.id || nanoid(10),
      name: parsed.name || 'Imported event',
      savedAt: Date.now(),
    };
  } catch {
    return undefined;
  }
}

const FIRST = [
  'Alice', 'Marcus', 'Priya', 'Jonah', 'Elena', 'Noah', 'Sofia', 'Liam',
  'Ava', 'Ethan', 'Mia', 'Owen', 'Isla', 'Leo', 'Chloe', 'Ryan',
  'Grace', 'Hugo', 'Nina', 'Felix', 'Amelia', 'Theo', 'Lara', 'Kai',
  'Vera', 'Omar', 'Ruby', 'Sam', 'Ivy', 'Max', 'Zoe', 'Ben',
  'Nora', 'Jake', 'Cora', 'Dan', 'Iris', 'Paul', 'June', 'Tom',
];
const LAST = [
  'Kowalski', 'Nguyen', 'Patel', 'Brooks', 'Silva', 'Chen', 'Anders', 'Kim',
  'Rossi', 'Park', 'Singh', 'Novak', 'Hassan', 'Murray', 'Fischer', 'Cruz',
  'Walsh', 'Berg', 'Diaz', 'Shaw',
];
const COMPANIES = [
  'Helios Energy', 'Nordbank', 'Pulse Labs', 'Orbit Media', 'Cedar Health',
  'Brightline', 'Quanta Systems', 'Harbor Legal', 'Summit Foods', 'Apex Cloud',
  'Lumen Design', 'Forge Capital',
];

/** 40-person demo roster matching the design prototype. */
export function makeDemoRoster(): Person[] {
  return Array.from({ length: 40 }, (_, i) => {
    const first = FIRST[i];
    const last = LAST[i % LAST.length];
    const company = COMPANIES[i % COMPANIES.length];
    const dom = company.toLowerCase().replace(/[^a-z]/g, '') + '.com';
    return {
      id: nanoid(10),
      name: `${first} ${last}`,
      company,
      email: `${first.toLowerCase()}.${last.toLowerCase().replace(/[^a-z]/g, '')}@${dom}`,
      rowIndex: i + 2,
    };
  });
}

/** Suggest areas / rounds / group size from roster size (design "Suggested setup"). */
export function suggestParams(rosterSize: number, current: EventParams): EventParams {
  if (rosterSize <= 0) return current;
  const groupSize = Math.min(4, Math.max(2, current.groupSize || 4));
  const areasCount = Math.max(1, Math.min(16, Math.ceil(rosterSize / groupSize)));
  const areas = Array.from({ length: areasCount }, (_, i) => {
    const existing = current.areas[i];
    const label = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(i) : '');
    return existing ?? { id: label, label };
  });
  return {
    ...current,
    groupSize,
    areas,
    numRounds: Math.min(areasCount, Math.max(1, current.numRounds || areasCount)),
  };
}

export function describeSuggestion(rosterSize: number, params: EventParams): string {
  const seats = params.areas.length * params.groupSize;
  if (rosterSize <= 0) {
    return 'Import a roster to get a suggested layout of areas, rounds, and group size.';
  }
  if (rosterSize > seats) {
    return `${rosterSize} people → ${params.areas.length} areas × ${params.groupSize} (group) leaves ${rosterSize - seats} sitting out each round. ${params.numRounds} rounds.`;
  }
  if (rosterSize < seats) {
    return `${rosterSize} people → ${params.areas.length} areas × ${params.groupSize} with some smaller groups. ${params.numRounds} rounds.`;
  }
  return `${rosterSize} people → ${params.areas.length} areas of ${params.groupSize}, ${params.numRounds} rounds. Exact fill.`;
}
