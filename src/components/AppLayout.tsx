import { AppBar, Box, Button, Toolbar, Typography } from '@mui/material';
import { Link as RouterLink, Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          backdropFilter: 'blur(8px)',
          bgcolor: 'rgba(240, 253, 250, 0.85)',
        }}
      >
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
          <Typography
            component={RouterLink}
            to="/"
            variant="h6"
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'primary.main',
              fontWeight: 700,
              fontSize: { xs: '1rem', sm: '1.25rem' },
            }}
          >
            Speed Dating Meetup
          </Typography>
          <Button component={RouterLink} to="/" color="inherit" size="small">
            Home
          </Button>
          <Button component={RouterLink} to="/about" color="inherit" size="small">
            About
          </Button>
        </Toolbar>
      </AppBar>
      <Box sx={{ flex: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
