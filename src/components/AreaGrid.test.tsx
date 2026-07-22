import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material';
import { describe, expect, it } from 'vitest';
import { AreaGrid } from './AreaGrid';
import { theme } from '../theme';
import type { EventParams, Person, Round } from '../domain/types';

const roster: Person[] = [
  { id: 'a', name: 'Alice', company: 'Acme', rowIndex: 2 },
  { id: 'b', name: 'Bob', company: 'Beta', rowIndex: 3 },
];
const params: EventParams = {
  groupSize: 2, areas: [{ id: 'A', label: 'A' }, { id: 'B', label: 'B' }],
  numRounds: 1, roundSeconds: 180, moveSeconds: 30, avoidSameCompany: false, breaks: [],
};
const round: Round = {
  index: 0,
  groups: [{ areaId: 'A', memberIds: ['a', 'b'] }, { areaId: 'B', memberIds: [] }],
  sittingOut: [],
};

describe('AreaGrid', () => {
  it('renders one card per area with member names', () => {
    render(
      <ThemeProvider theme={theme}>
        <AreaGrid roster={roster} params={params} round={round} phase="conversation" />
      </ThemeProvider>,
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });
});
