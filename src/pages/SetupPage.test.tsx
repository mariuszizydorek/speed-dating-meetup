import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { beforeEach, describe, expect, it } from 'vitest';
import { SetupPage } from './SetupPage';
import { EventProvider } from '../state/EventContext';
import { theme } from '../theme';

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <EventProvider>
        <MemoryRouter>
          <SetupPage />
        </MemoryRouter>
      </EventProvider>
    </ThemeProvider>,
  );
}

function csvFile(name: string, content: string): File {
  return new File([content], name, { type: 'text/csv' });
}

describe('SetupPage', () => {
  beforeEach(() => localStorage.clear());

  it('imports a CSV roster and shows the count', async () => {
    renderPage();
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [csvFile('r.csv', 'Name,Company\nAlice,Acme\nBob,Beta\n')] },
    });
    await waitFor(() => {
      expect(screen.getByText('2 people')).toBeInTheDocument();
    });
  });

  it('shows row errors from the parser', async () => {
    renderPage();
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [csvFile('r.csv', 'Name,Company\n,Acme\nBob,Beta\n')] },
    });
    await waitFor(() => {
      expect(screen.getByText(/missing name/i)).toBeInTheDocument();
    });
  });

  it('disables Generate when roster is smaller than group size', async () => {
    renderPage();
    // With no roster, Generate should be disabled.
    expect(screen.getByRole('button', { name: /generate schedule/i })).toBeDisabled();
  });
});
