import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { beforeEach, describe, expect, it } from 'vitest';
import { PrintPage } from './PrintPage';
import { EventProvider, useEvent } from '../state/EventContext';
import { theme } from '../theme';
import type { Schedule } from '../domain/types';

function Seed({ withSchedule }: { withSchedule: boolean }) {
  const { state, actions } = useEvent();
  if (!state) {
    actions.importRoster([{ id: 'a', name: 'A', company: '', rowIndex: 2 }]);
    return null;
  }
  if (withSchedule && !state.schedule) {
    const schedule: Schedule = {
      seed: 1, generatedAt: '2026-07-22T00:00:00.000Z',
      rounds: [{ index: 0, groups: [{ areaId: 'A', memberIds: ['a'] }], sittingOut: [] }],
      quality: { totalPairs: 0, uniquePairs: 0, repeatedPairs: 0, sameCompanyPairs: 0,
        perPerson: [{ id: 'a', metIds: [], neverMetIds: [], repeatMeetings: 0 }] },
    };
    actions.setSchedule(schedule);
  }
  return null;
}

function renderPage(withSchedule: boolean) {
  return render(
    <ThemeProvider theme={theme}>
      <EventProvider>
        <MemoryRouter>
          <Seed withSchedule={withSchedule} />
          <PrintPage />
        </MemoryRouter>
      </EventProvider>
    </ThemeProvider>,
  );
}

describe('PrintPage', () => {
  beforeEach(() => localStorage.clear());

  it('prompts to generate a schedule when none exists', () => {
    renderPage(false);
    expect(screen.getByText(/generate a schedule/i)).toBeInTheDocument();
  });

  it('lists the five artifact tiles when a schedule exists', () => {
    renderPage(true);
    expect(screen.getByText(/Personal plans/i)).toBeInTheDocument();
    expect(screen.getByText(/Name tags/i)).toBeInTheDocument();
    expect(screen.getByText(/Area signs/i)).toBeInTheDocument();
    expect(screen.getByText(/Master matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/Quality report/i)).toBeInTheDocument();
  });
});
