import { CssBaseline, ThemeProvider } from '@mui/material';
import { AppRouter } from './router';
import { EventProvider } from './state/EventContext';
import { theme } from './theme';

const App = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <EventProvider>
      <AppRouter />
    </EventProvider>
  </ThemeProvider>
);

export default App;
