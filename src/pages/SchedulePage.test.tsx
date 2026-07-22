import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { beforeEach, describe, expect, it } from 'vitest';
import { SchedulePage } from './SchedulePage';
import { EventProvider, useEvent } from '../state/EventContext';
import { theme } from '../theme';
import type { Person } from '../domain/types';

const people: Person[] = Array.from({ length: 8 }, (_, i) => ({
  id: `p${i}`, name: `P${i}`, company: `C${i % 2}`, email: '', rowIndex: i + 2,
}));

function Seed() {
  const { actions, state } = useEvent();
  if (!state) {
    actions.importRoster(people);
    actions.updateParams({
      areas: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
      numRounds: 3,
      groupSize: 4,
    });
    return null;
  }
  return null;
}

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <EventProvider>
        <MemoryRouter>
          <Seed />
          <SchedulePage />
        </MemoryRouter>
      </EventProvider>
    </ThemeProvider>,
  );
}

describe('SchedulePage', () => {
  beforeEach(() => localStorage.clear());

  it('generates a schedule and displays the round-by-area table', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /generate schedule/i }));
    await waitFor(
      () => expect(screen.getByText('Area A')).toBeInTheDocument(),
      { timeout: 3000 },
    );
    // Quality card shows the stat grid.
    expect(screen.getByText('Schedule quality')).toBeInTheDocument();
    expect(screen.getByText('REPEATS')).toBeInTheDocument();
    // Plans bar shows a chip for the newly generated plan.
    expect(screen.getByText('Plan 1')).toBeInTheDocument();
  });

  it('shows progress bar while generating', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /generate schedule/i }));
    // The LinearProgress appears synchronously via setGenerating(true), before
    // the deferred generateSchedule tick runs.
    await waitFor(
      () => expect(screen.getByRole('progressbar')).toBeInTheDocument(),
    );
    // Eventually the schedule resolves and progress bar disappears.
    await waitFor(
      () => expect(screen.getByText('Area A')).toBeInTheDocument(),
      { timeout: 3000 },
    );
    await waitFor(
      () => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(),
    );
  });

  it('adds a second plan via "+ New plan" without losing the first', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /generate schedule/i }));
    await waitFor(() => expect(screen.getByText('Plan 1')).toBeInTheDocument(), { timeout: 3000 });
    fireEvent.click(screen.getByRole('button', { name: /new plan/i }));
    await waitFor(() => expect(screen.getByText('Plan 2')).toBeInTheDocument(), { timeout: 3000 });
    // The first plan chip is still present after adding the second.
    expect(screen.getByText('Plan 1')).toBeInTheDocument();
  });

  it('toggles to per-person view', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /generate schedule/i }));
    await waitFor(
      () => expect(screen.getByText('Area A')).toBeInTheDocument(),
      { timeout: 3000 },
    );
    fireEvent.click(screen.getByRole('button', { name: /people × rounds/i }));
    // In "people × rounds" view the row header cells contain the attendee names.
    const personView = await screen.findByTestId('person-view');
    // Person names should be present as row labels.
    for (const p of people) {
      expect(within(personView).getByText(p.name)).toBeInTheDocument();
    }
    // And the round labels should now be short column headers (R1, R2, R3).
    expect(within(personView).getByText('R1')).toBeInTheDocument();
    expect(within(personView).getByText('NEVER MET')).toBeInTheDocument();
  });

  it('opens a drawer with member chips when a cell is clicked', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /generate schedule/i }));
    await waitFor(
      () => expect(screen.getByText('Area A')).toBeInTheDocument(),
      { timeout: 3000 },
    );
    const cell = screen.getByRole('button', { name: 'Round 1 Area A' });
    const expectedNames = within(cell).getAllByText(/^P\d$/).map((el) => el.textContent);
    fireEvent.click(cell);
    await waitFor(
      () => expect(screen.getByTestId('cell-drawer')).toBeInTheDocument(),
    );
    const drawer = screen.getByTestId('cell-drawer');
    for (const name of expectedNames) {
      expect(within(drawer).getByText(new RegExp(`^${name}`))).toBeInTheDocument();
    }
    expect(within(drawer).getByText(/round 1/i)).toBeInTheDocument();
  });
});
