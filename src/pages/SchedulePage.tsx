import { useState, useTransition } from 'react';
import {
  Alert, Box, Button, Chip, Container, Paper, Stack, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEvent } from '../state/EventContext';
import { generateSchedule } from '../domain/scheduler';

export function SchedulePage() {
  const { state, actions } = useEvent();
  const navigate = useNavigate();
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 100000));
  const [isPending, startTransition] = useTransition();

  if (!state || state.roster.length === 0 || state.params.areas.length === 0) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="info">Import a roster on the Setup page first.</Alert>
      </Container>
    );
  }

  const nameById = new Map(state.roster.map((p) => [p.id, p.name]));
  const schedule = state.schedule;

  function generate() {
    startTransition(() => {
      const s = generateSchedule(state!.roster, state!.params, { seed, timeBudgetMs: 2000, restarts: 6 });
      actions.setSchedule(s);
    });
  }

  return (
    <Container sx={{ py: 4 }} maxWidth="lg">
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">Schedule</Typography>

        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField label="Seed" size="small" type="number" value={seed}
              onChange={(e) => setSeed(Number(e.target.value))} sx={{ width: 160 }} />
            <Button variant="contained" onClick={generate} disabled={isPending}>
              {isPending ? 'Generating…' : schedule ? 'Regenerate' : 'Generate'}
            </Button>
            <Button onClick={() => setSeed(Math.floor(Math.random() * 100000))} disabled={isPending}>
              New seed
            </Button>
          </Stack>
        </Paper>

        {schedule && (
          <>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Quality</Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 1 }} flexWrap="wrap">
                <Chip label={`Repeated pairs: ${schedule.quality.repeatedPairs}`} color={schedule.quality.repeatedPairs === 0 ? 'success' : 'warning'} />
                <Chip label={`Same-company pairs: ${schedule.quality.sameCompanyPairs}`} />
                <Chip label={`Unique pairs: ${schedule.quality.uniquePairs}`} />
                <Chip label={`Total meetings: ${schedule.quality.totalPairs}`} />
              </Stack>
            </Paper>

            <Paper sx={{ p: 2, overflowX: 'auto' }}>
              <Typography variant="h6">Rounds × Areas</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell />
                    {state.params.areas.map((a) => <TableCell key={a.id}>{a.label}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {schedule.rounds.map((r, i) => (
                    <TableRow key={r.index}>
                      <TableCell>Round {i + 1}</TableCell>
                      {r.groups.map((g) => (
                        <TableCell key={g.areaId}>
                          {g.memberIds.map((id) => nameById.get(id) ?? id).join(', ')}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            <Box>
              <Button variant="contained" size="large" onClick={() => navigate('/print')}>
                Print materials
              </Button>
            </Box>
          </>
        )}
      </Stack>
    </Container>
  );
}
