import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';

export type AppThemeId = 'terminal' | 'modern-light' | 'modern-dark';

const THEME_KEY = 'sns:themeV1';

interface ThemeContextValue {
  themeId: AppThemeId;
  setThemeId: (id: AppThemeId) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function loadThemeId(): AppThemeId {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === 'terminal' || raw === 'modern-light' || raw === 'modern-dark') return raw;
  } catch {
    /* noop */
  }
  return 'modern-light';
}

function buildMuiTheme(id: AppThemeId): Theme {
  const isTerminal = id === 'terminal';
  const isLight = id === 'modern-light';
  const font = isTerminal
    ? '"Lato", "Helvetica Neue", Arial, sans-serif'
    : '"Instrument Sans", "Helvetica Neue", Arial, sans-serif';
  const radius = isTerminal ? 2 : 8;
  const primary = isTerminal ? '#39e9a9' : isLight ? '#0d9b6c' : '#9d8cff';
  const cta = isTerminal ? '#19609f' : isLight ? '#4a57d2' : '#6673e8';
  const bgDefault = isTerminal ? '#000000' : isLight ? '#f2f2ec' : '#141416';
  const bgPaper = isTerminal ? '#0a0c0f' : isLight ? '#ffffff' : '#1c1c1f';
  const textPrimary = isTerminal || !isLight ? (isTerminal ? '#ffffff' : '#ececee') : '#1a1c22';

  return createTheme({
    cssVariables: true,
    palette: {
      mode: isLight ? 'light' : 'dark',
      primary: { main: primary, contrastText: isTerminal ? '#000' : '#fff' },
      secondary: { main: isTerminal ? '#8ca7ec' : isLight ? '#5f6de0' : '#8e9bf0' },
      error: { main: isTerminal ? '#bd3333' : isLight ? '#cb4238' : '#e56b60' },
      warning: { main: isTerminal ? '#ff7246' : isLight ? '#de7326' : '#efa05c' },
      info: { main: cta },
      success: { main: primary },
      background: { default: bgDefault, paper: bgPaper },
      text: {
        primary: textPrimary,
        secondary: isLight ? '#5a5e66' : '#ada9a9',
        disabled: isLight ? '#83868e' : '#878787',
      },
      divider: isTerminal ? '#585858' : isLight ? '#e3e3db' : '#2b2b30',
    },
    typography: {
      fontFamily: font,
      allVariants: { letterSpacing: '-0.02em' },
      button: { textTransform: 'none', fontWeight: 400 },
    },
    shape: { borderRadius: radius },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: bgDefault, fontFamily: font },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: radius },
          contained: {
            '&.MuiButton-colorPrimary': {
              backgroundColor: cta,
              color: '#fff',
              '&:hover': { filter: 'brightness(1.1)' },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none', borderRadius: isTerminal ? 0 : radius },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small', variant: 'outlined' },
      },
    },
  });
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<AppThemeId>(() => loadThemeId());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId);
    try {
      localStorage.setItem(THEME_KEY, themeId);
    } catch {
      /* noop */
    }
  }, [themeId]);

  const muiTheme = useMemo(() => buildMuiTheme(themeId), [themeId]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeId,
      setThemeId: setThemeIdState,
      cycleTheme: () => {
        setThemeIdState((prev) =>
          prev === 'modern-light' ? 'modern-dark' : prev === 'modern-dark' ? 'terminal' : 'modern-light',
        );
      },
    }),
    [themeId],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside AppThemeProvider');
  return ctx;
}
