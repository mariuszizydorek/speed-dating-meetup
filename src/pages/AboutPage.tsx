import { Box, Container, Typography } from '@mui/material';

export function AboutPage() {
  return (
    <Box component="main" sx={{ minHeight: '100dvh', py: { xs: 4, sm: 6 }, px: { xs: 2, sm: 3 } }}>
      <Container maxWidth="sm" disableGutters>
        <Typography component="h1" variant="h4" gutterBottom>
          About
        </Typography>
        <Typography color="text.secondary">
          Speed Dating Meetup helps organizers run short, structured meetups on
          any device — phone, tablet, or desktop.
        </Typography>
      </Container>
    </Box>
  );
}
