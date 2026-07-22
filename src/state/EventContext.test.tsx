import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EventProvider, useEvent } from './EventContext';

function Probe() {
  const { state, actions } = useEvent();
  return (
    <div>
      <div data-testid="version">{state?.version ?? 'none'}</div>
      <div data-testid="roster">{state?.roster.length ?? 0}</div>
      <button
        onClick={() =>
          actions.importRoster([
            { id: 'p1', name: 'Alice', company: 'Acme', email: '', rowIndex: 2 },
            { id: 'p2', name: 'Bob', company: 'Beta', email: '', rowIndex: 3 },
          ])
        }
      >
        import
      </button>
      <button onClick={() => actions.clearEvent()}>clear</button>
    </div>
  );
}

describe('EventContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with undefined state', () => {
    render(
      <EventProvider>
        <Probe />
      </EventProvider>,
    );
    expect(screen.getByTestId('version').textContent).toBe('none');
  });

  it('importRoster creates initial state with default params', () => {
    render(
      <EventProvider>
        <Probe />
      </EventProvider>,
    );
    act(() => {
      screen.getByText('import').click();
    });
    expect(screen.getByTestId('version').textContent).toBe('1');
    expect(screen.getByTestId('roster').textContent).toBe('2');
    expect(localStorage.getItem('speedDating:currentEvent')).not.toBeNull();
  });

  it('clearEvent wipes storage and state', () => {
    render(
      <EventProvider>
        <Probe />
      </EventProvider>,
    );
    act(() => screen.getByText('import').click());
    act(() => screen.getByText('clear').click());
    expect(screen.getByTestId('version').textContent).toBe('none');
    expect(localStorage.getItem('speedDating:currentEvent')).toBeNull();
  });

  it('hydrates from localStorage on mount', () => {
    localStorage.setItem(
      'speedDating:currentEvent',
      JSON.stringify({
        version: 1,
        roster: [{ id: 'x', name: 'X', company: 'Y', email: '', rowIndex: 2 }],
        params: {
          groupSize: 4,
          areas: [{ id: 'A', label: 'A' }],
          numRounds: 1,
          roundSeconds: 180,
          moveSeconds: 30,
          avoidSameCompany: true,
          breaks: [],
        },
      }),
    );
    render(
      <EventProvider>
        <Probe />
      </EventProvider>,
    );
    expect(screen.getByTestId('roster').textContent).toBe('1');
  });
});
