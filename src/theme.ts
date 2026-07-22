import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: {
      main: '#0f766e',
      dark: '#0d5f59',
      light: '#14b8a6',
    },
    secondary: {
      main: '#be185d',
    },
    background: {
      default: '#f0fdfa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"DM Sans", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    h1: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
  },
  shape: {
    borderRadius: 12,
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});
