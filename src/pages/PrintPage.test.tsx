import { fireEvent, render, screen } from '@testing-library/react';
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
    actions.importRoster([
      { id: 'a', name: 'Alice', company: 'Acme', email: 'alice@acme.com', rowIndex: 2 },
      { id: 'b', name: 'Bob', company: 'Beta', email: 'bob@beta.com', rowIndex: 3 },
    ]);
    return null;
  }
  if (withSchedule && !state.schedule) {
    const schedule: Schedule = {
      seed: 1, generatedAt: '2026-07-22T00:00:00.000Z',
      rounds: [{ index: 0, groups: [{ areaId: 'A', memberIds: ['a', 'b'] }], sittingOut: [] }],
      quality: {
        totalPairs: 1, uniquePairs: 1, repeatedPairs: 0, sameCompanyPairs: 0,
        perPerson: [
          { id: 'a', metIds: ['b'], neverMetIds: [], repeatMeetings: 0 },
          { id: 'b', metIds: ['a'], neverMetIds: [], repeatMeetings: 0 },
        ],
      },
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

  it('shows the name tag layout panel with a live per-page meta line', () => {
    renderPage(true);
    expect(screen.getByText('Name tag layout')).toBeInTheDocument();
    // Default tag config is 90×55mm; meta line reports the computed grid.
    expect(screen.getByText(/90×55 mm/)).toBeInTheDocument();
    expect(screen.getByText(/for 2 people/)).toBeInTheDocument();
  });

  it('updating the tag width does not clear the generated schedule', () => {
    renderPage(true);
    const input = screen.getByDisplayValue('90') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '70' } });
    // The meta line recomputes immediately (cosmetic tagCfg update only).
    expect(screen.getByText(/70×55 mm/)).toBeInTheDocument();
    // The five artifact tiles (which only render when a schedule exists)
    // should still be present after the tag-width change — proving the
    // schedule was not cleared by the tagCfg-only param update.
    expect(screen.getByText(/Personal plans/i)).toBeInTheDocument();
  });

  it('shows the attendee emails panel with an invitation preview by default', () => {
    renderPage(true);
    expect(screen.getByText('Attendee emails')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText(/Hi Alice,/)).toBeInTheDocument();
  });
});
