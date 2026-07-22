import { CssBaseline } from '@mui/material';
import { AppRouter } from './router';
import { EventProvider } from './state/EventContext';
import { AppThemeProvider } from './theme/AppThemeProvider';

const App = () => (
  <AppThemeProvider>
    <CssBaseline />
    <EventProvider>
      <AppRouter />
    </EventProvider>
  </AppThemeProvider>
);

export default App;
