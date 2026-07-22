/** Default MUI theme for unit tests (modern-light). Runtime theming uses AppThemeProvider. */
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: { main: '#0d9b6c' },
    secondary: { main: '#5f6de0' },
    background: { default: '#f2f2ec', paper: '#ffffff' },
    text: { primary: '#1a1c22', secondary: '#5a5e66' },
  },
  typography: {
    fontFamily: '"Instrument Sans", "Helvetica Neue", Arial, sans-serif',
    button: { textTransform: 'none' },
  },
  shape: { borderRadius: 8 },
});
