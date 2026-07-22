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

  it('supports editing area labels', async () => {
    renderPage();
    // Import a roster first so params UI renders.
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [csvFile('r.csv', 'Name,Company\nAlice,Acme\nBob,Beta\nCarol,Gamma\nDan,Delta\n')],
      },
    });
    await waitFor(() => expect(screen.getByText('4 people')).toBeInTheDocument());

    // Set areas to 3.
    const areasField = screen.getByLabelText(/number of areas/i) as HTMLInputElement;
    fireEvent.change(areasField, { target: { value: '3' } });

    // The label editors expose an aria-label per area.
    const aInput = await screen.findByLabelText('Area A label') as HTMLInputElement;
    const bInput = screen.getByLabelText('Area B label') as HTMLInputElement;
    const cInput = screen.getByLabelText('Area C label') as HTMLInputElement;
    expect(aInput.value).toBe('A');
    expect(bInput.value).toBe('B');
    expect(cInput.value).toBe('C');

    // Rename area B to "Kitchen".
    fireEvent.change(bInput, { target: { value: 'Kitchen' } });

    await waitFor(() => {
      expect((screen.getByLabelText('Area B label') as HTMLInputElement).value).toBe('Kitchen');
    });
  });

  it('offers a column mapper when no Name column is detected', async () => {
    renderPage();
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [csvFile('r.csv', 'First,Firm\nAlice,Acme\nBob,Beta\n')] },
    });

    // Alert with the mapper appears.
    await screen.findByText(/no "name" column detected/i);

    // The Name select lists both detected columns.
    const nameSelect = screen.getByLabelText(/name column/i) as HTMLSelectElement;
    const nameOptions = Array.from(nameSelect.options).map((o) => o.value);
    expect(nameOptions).toEqual(['First', 'Firm']);

    // Pick "First" as Name (already the initial pick, but re-select to confirm).
    fireEvent.change(nameSelect, { target: { value: 'First' } });

    // Pick "Firm" as Company.
    const companySelect = screen.getByLabelText(/company column/i) as HTMLSelectElement;
    fireEvent.change(companySelect, { target: { value: 'Firm' } });

    // Roster populates: 2 people; Alice + Acme visible in the table.
    await waitFor(() => {
      expect(screen.getByText('2 people')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Acme')).toBeInTheDocument();
    });
  });

  it('blocks Generate when moveSeconds > roundSeconds', async () => {
    renderPage();
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [csvFile('r.csv', 'Name,Company\nAlice,Acme\nBob,Beta\nCarol,Gamma\nDan,Delta\n')],
      },
    });
    await waitFor(() => expect(screen.getByText('4 people')).toBeInTheDocument());

    // Set roundSeconds to 60 first (default is 180), then move to 120 → invalid.
    const roundField = screen.getByLabelText(/round seconds/i) as HTMLInputElement;
    fireEvent.change(roundField, { target: { value: '60' } });
    const moveField = screen.getByLabelText(/move seconds/i) as HTMLInputElement;
    fireEvent.change(moveField, { target: { value: '120' } });

    await waitFor(() => {
      expect(screen.getByText(/move time \(120s\) cannot exceed round total \(60s\)/i))
        .toBeInTheDocument();
      expect(screen.getByRole('button', { name: /generate schedule/i })).toBeDisabled();
    });
  });
});
