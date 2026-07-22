import { Box, Container, Typography } from '@mui/material';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';

export function HomePage() {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        background:
          'radial-gradient(ellipse at top left, rgba(20, 184, 166, 0.18), transparent 55%), radial-gradient(ellipse at bottom right, rgba(190, 24, 93, 0.12), transparent 50%), #f0fdfa',
        py: { xs: 4, sm: 6 },
        px: { xs: 2, sm: 3 },
      }}
    >
      <Container maxWidth="sm" disableGutters>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 2, sm: 2.5 },
            textAlign: { xs: 'left', sm: 'center' },
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              color: 'primary.main',
              alignSelf: { sm: 'center' },
            }}
          >
            <FavoriteRoundedIcon fontSize="small" aria-hidden />
            <Typography
              component="span"
              variant="overline"
              sx={{ letterSpacing: '0.12em', fontWeight: 700 }}
            >
              Speed Dating Meetup
            </Typography>
          </Box>

          <Typography
            component="h1"
            variant="h3"
            sx={{
              fontSize: { xs: '2rem', sm: '2.75rem' },
              lineHeight: 1.15,
              color: 'text.primary',
            }}
          >
            Meet people. Real conversations. One night.
          </Typography>

          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ fontSize: { xs: '1rem', sm: '1.125rem' }, maxWidth: 480, mx: { sm: 'auto' } }}
          >
            A responsive web app that works on desktop and mobile browsers —
            ready for your next meetup event.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
