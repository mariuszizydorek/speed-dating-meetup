export const ICEBREAKERS = [
  'What are you working on right now that excites you?',
  'What’s the best thing you’ve shipped or finished this year?',
  'What problem would you love someone in this room to solve?',
  'What’s a tool or habit you couldn’t work without?',
  'What was your first job — and what did it teach you?',
  'What are you trying to learn at the moment?',
  'What’s a common belief in your field you disagree with?',
  'If you had a free month, what would you build or do?',
  'What’s the best piece of advice you’ve been given?',
  'Who would you love an introduction to — and why?',
  'What does a perfect workday look like for you?',
  'What’s something people usually get wrong about your job?',
];

/** Built-in default prompt for round `i` (0-based). */
export function defaultIcebreaker(roundIndex: number): string {
  return ICEBREAKERS[roundIndex % ICEBREAKERS.length];
}

/**
 * Effective prompt for a round.
 * Missing / `null` / `''` → blank (no banner). Only non-empty strings show.
 */
export function icebreakerForRound(
  roundIndex: number,
  overrides?: (string | null)[] | null,
): string {
  return overrides?.[roundIndex] ?? '';
}

/** Seed the per-round list with the built-in prompts (opt-in from Setup). */
export function defaultIcebreakerList(numRounds: number): string[] {
  return Array.from({ length: Math.max(0, numRounds) }, (_, i) => defaultIcebreaker(i));
}

/** Two-tone WebAudio chime. Rising = round start; falling = move/break. */
export function playCue(kind: 'start' | 'move', enabled: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const freqs = kind === 'start' ? [523.25, 659.25] : [392, 329.63];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.25);
    });
    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    /* ignore autoplay / unsupported */
  }
}

export function loadSoundEnabled(): boolean {
  try {
    return localStorage.getItem('sns:soundV1') !== 'off';
  } catch {
    return true;
  }
}

export function saveSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem('sns:soundV1', on ? 'on' : 'off');
  } catch {
    /* noop */
  }
}

export type FloorLayout = Record<string, { x: number; y: number }>;

export function loadFloorLayout(): FloorLayout {
  try {
    const raw = localStorage.getItem('sns:floorV1');
    if (!raw) return {};
    return JSON.parse(raw) as FloorLayout;
  } catch {
    return {};
  }
}

export function saveFloorLayout(layout: FloorLayout): void {
  try {
    localStorage.setItem('sns:floorV1', JSON.stringify(layout));
  } catch {
    /* noop */
  }
}
