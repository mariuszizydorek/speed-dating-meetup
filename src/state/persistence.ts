import type { EventState } from '../domain/types';

export const STORAGE_KEY = 'speedDating:currentEvent';
const CURRENT_VERSION = 1;

export function load(): EventState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as EventState;
    if (parsed?.version !== CURRENT_VERSION) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

export function save(state: EventState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage unavailable — surface via boot-time warning
    // in App, not here. Silent no-op keeps app functional.
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
