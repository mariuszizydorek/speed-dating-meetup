import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { describe, expect, it } from 'vitest';
import { HomePage } from './HomePage';
import { theme } from '../theme';

describe('HomePage', () => {
  it('renders the brand and headline', () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </ThemeProvider>,
    );

    expect(screen.getByText('Speed Dating Meetup')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /Meet people\. Real conversations\. One night\./i,
      }),
    ).toBeInTheDocument();
  });
});
