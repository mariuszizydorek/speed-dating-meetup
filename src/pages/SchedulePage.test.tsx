import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
});
