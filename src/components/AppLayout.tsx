import { AppBar, Box, Button, Stack, Toolbar, Typography } from '@mui/material';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEvent } from '../state/EventContext';

const NAV = [
  { to: '/setup', label: 'Setup' },
  { to: '/schedule', label: 'Schedule' },
  { to: '/print', label: 'Print' },
  { to: '/run', label: 'Run' },
] as const;

export function AppLayout() {
  const { actions } = useEvent();
  const location = useLocation();

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" elevation={0} color="transparent"
        sx={{ borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(8px)',
              bgcolor: 'rgba(240, 253, 250, 0.85)' }}>
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700, mr: 2 }}>
            Speed Networking
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexGrow: 1 }}>
            {NAV.map((item) => (
              <Button key={item.to} component={NavLink} to={item.to} size="small"
                sx={{
                  color: location.pathname.startsWith(item.to) ? 'primary.main' : 'text.primary',
                  fontWeight: location.pathname.startsWith(item.to) ? 700 : 500,
                }}>
                {item.label}
              </Button>
            ))}
          </Stack>
          <Button size="small" color="inherit"
            onClick={() => {
              if (confirm('Start a new event? This will clear the current roster, schedule, and run state.')) {
                actions.clearEvent();
              }
            }}>
            New event
          </Button>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flex: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
