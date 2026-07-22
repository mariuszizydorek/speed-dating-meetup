import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RunPage } from './RunPage';
import { EventProvider, useEvent } from '../state/EventContext';
import { theme } from '../theme';
import type { Schedule } from '../domain/types';

function Seed() {
  const { state, actions } = useEvent();
  if (!state) {
    actions.importRoster([
      { id: 'a', name: 'Alice', company: 'Acme', rowIndex: 2 },
      { id: 'b', name: 'Bob', company: 'Beta', rowIndex: 3 },
    ]);
    return null;
  }
  if (!state.schedule) {
    const schedule: Schedule = {
      seed: 1, generatedAt: '2026-07-22T00:00:00.000Z',
      rounds: [
        { index: 0, groups: [{ areaId: 'A', memberIds: ['a', 'b'] }], sittingOut: [] },
        { index: 1, groups: [{ areaId: 'A', memberIds: ['a', 'b'] }], sittingOut: [] },
      ],
      quality: { totalPairs: 0, uniquePairs: 0, repeatedPairs: 0, sameCompanyPairs: 0,
        perPerson: [
          { id: 'a', metIds: [], neverMetIds: [], repeatMeetings: 0 },
          { id: 'b', metIds: [], neverMetIds: [], repeatMeetings: 0 },
        ] },
    };
    actions.updateParams({
      areas: [{ id: 'A', label: 'A' }], numRounds: 2, roundSeconds: 3, moveSeconds: 1, groupSize: 2,
    });
    actions.setSchedule(schedule);
  }
  return null;
}

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <EventProvider>
        <MemoryRouter>
          <Seed />
          <RunPage />
        </MemoryRouter>
      </EventProvider>
    </ThemeProvider>,
  );
}

describe('RunPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('shows Start button when idle', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
  });

  it('transitions conversation → move → next round conversation', () => {
    renderPage();
    act(() => screen.getByRole('button', { name: /start/i }).click());
    expect(screen.getByText(/round 1/i)).toBeInTheDocument();
    // conversation phase lasts roundSeconds - moveSeconds = 2s
    act(() => vi.advanceTimersByTime(2100));
    expect(screen.getByText(/move/i)).toBeInTheDocument();
    // move lasts 1s → next round
    act(() => vi.advanceTimersByTime(1100));
    expect(screen.getByText(/round 2/i)).toBeInTheDocument();
  });

  it('pauses during move and resumes into move (not conversation)', () => {
    renderPage();
    act(() => screen.getByRole('button', { name: /start/i }).click());
    // Advance into move phase.
    act(() => vi.advanceTimersByTime(2100));
    expect(screen.getByText(/move/i)).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: /pause/i }).click());
    expect(screen.getByText(/paused/i)).toBeInTheDocument();
    // Ticks while paused should not advance the phase.
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText(/paused/i)).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: /resume/i }).click());
    // We resumed into MOVE, not CONVERSATION.
    expect(screen.getByText(/move/i)).toBeInTheDocument();
  });
});
