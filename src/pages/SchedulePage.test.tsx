import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { beforeEach, describe, expect, it } from 'vitest';
import { SchedulePage } from './SchedulePage';
import { EventProvider, useEvent } from '../state/EventContext';
import { theme } from '../theme';
import type { Person } from '../domain/types';

const people: Person[] = Array.from({ length: 8 }, (_, i) => ({
  id: `p${i}`, name: `P${i}`, company: `C${i % 2}`, rowIndex: i + 2,
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
    fireEvent.click(await screen.findByRole('button', { name: /generate/i }));
    await waitFor(
      () => expect(screen.getByText(/round 1/i)).toBeInTheDocument(),
      { timeout: 3000 },
    );
    // Quality card shows some numeric summary.
    expect(screen.getByText(/repeated pairs/i)).toBeInTheDocument();
  });

  it('shows progress bar while generating', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /generate/i }));
    // The LinearProgress appears synchronously via setGenerating(true), before
    // the deferred generateSchedule tick runs.
    await waitFor(
      () => expect(screen.getByRole('progressbar')).toBeInTheDocument(),
    );
    // Eventually the schedule resolves and progress bar disappears.
    await waitFor(
      () => expect(screen.getByText(/round 1/i)).toBeInTheDocument(),
      { timeout: 3000 },
    );
    await waitFor(
      () => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument(),
    );
  });

  it('toggles to per-person view', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /generate/i }));
    await waitFor(
      () => expect(screen.getByText(/round 1/i)).toBeInTheDocument(),
      { timeout: 3000 },
    );
    fireEvent.click(screen.getByRole('button', { name: /by person/i }));
    // In "by person" view the row header cells contain the attendee names.
    await waitFor(
      () => expect(screen.getByText(/people × rounds/i)).toBeInTheDocument(),
    );
    // Person names should be present as row labels.
    for (const p of people) {
      expect(screen.getByText(p.name)).toBeInTheDocument();
    }
    // And the round labels should now be short column headers (R1, R2, R3).
    expect(screen.getByText('R1')).toBeInTheDocument();
    expect(screen.getByText('Never met')).toBeInTheDocument();
  });

  it('opens a drawer with member chips when a cell is clicked', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /generate/i }));
    await waitFor(
      () => expect(screen.getByText(/round 1/i)).toBeInTheDocument(),
      { timeout: 3000 },
    );
    // Find first row of the round-by-area table (Round 1) and click its first
    // area cell.
    const row1 = screen.getByText(/round 1/i).closest('tr')!;
    const cells = within(row1).getAllByRole('cell');
    // cells[0] is the "Round 1" label; cells[1] is the first area group cell.
    const namesInCell = cells[1]!.textContent ?? '';
    const expectedNames = namesInCell.split(',').map((s) => s.trim()).filter(Boolean);
    fireEvent.click(cells[1]!);
    // Drawer appears with the same names.
    await waitFor(
      () => expect(screen.getByTestId('cell-drawer')).toBeInTheDocument(),
    );
    const drawer = screen.getByTestId('cell-drawer');
    for (const name of expectedNames) {
      expect(within(drawer).getByText(new RegExp(name))).toBeInTheDocument();
    }
    // Drawer header names the round + area.
    expect(within(drawer).getByText(/round 1/i)).toBeInTheDocument();
  });
});
