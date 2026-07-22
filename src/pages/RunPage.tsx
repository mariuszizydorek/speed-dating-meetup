import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Chip, Container, Paper, Stack, TextField, Typography,
} from '@mui/material';
import { useEvent } from '../state/EventContext';
import { AreaGrid } from '../components/AreaGrid';
import type { BreakSlot, RunPhase } from '../domain/types';

function phaseDurationMs(
  phase: RunPhase,
  roundIndex: number,
  roundSeconds: number,
  moveSeconds: number,
  breaks: BreakSlot[],
): number {
  if (phase === 'conversation') return Math.max(0, (roundSeconds - moveSeconds) * 1000);
  if (phase === 'move') return moveSeconds * 1000;
  if (phase === 'break') {
    const slot = breaks.find((b) => b.afterRound === roundIndex + 1);
    return (slot?.seconds ?? 0) * 1000;
  }
  return 0;
}

function nextPhase(
  current: RunPhase,
  roundIndex: number,
  totalRounds: number,
  breaks: BreakSlot[],
): { phase: RunPhase; roundIndex: number } {
  if (current === 'conversation') return { phase: 'move', roundIndex };
  if (current === 'move') {
    if (breaks.some((b) => b.afterRound === roundIndex + 1) && roundIndex + 1 < totalRounds) {
      return { phase: 'break', roundIndex };
    }
    if (roundIndex + 1 >= totalRounds) return { phase: 'finished', roundIndex };
    return { phase: 'conversation', roundIndex: roundIndex + 1 };
  }
  if (current === 'break') {
    if (roundIndex + 1 >= totalRounds) return { phase: 'finished', roundIndex };
    return { phase: 'conversation', roundIndex: roundIndex + 1 };
  }
  return { phase: current, roundIndex };
}

export function RunPage() {
  const { state, actions } = useEvent();
  const [now, setNow] = useState(Date.now());
  const [find, setFind] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const run = state?.runState;

  useEffect(() => {
    if (!state || !state.schedule || !run || run.phase === 'idle'
        || run.phase === 'paused' || run.phase === 'finished') return;
    const dur = phaseDurationMs(run.phase, run.currentRoundIndex,
      state.params.roundSeconds, state.params.moveSeconds, state.params.breaks);
    if (now - run.phaseStartedAt >= dur) {
      const next = nextPhase(run.phase, run.currentRoundIndex,
        state.schedule.rounds.length, state.params.breaks);
      actions.setPhase({ phase: next.phase, roundIndex: next.roundIndex, startedAt: Date.now() });
    }
  }, [now, run, state, actions]);

  const currentRound = useMemo(() => {
    if (!state?.schedule) return undefined;
    const idx = run?.currentRoundIndex ?? 0;
    return state.schedule.rounds[idx];
  }, [state, run]);

  const nextRoundData = useMemo(() => {
    if (!state?.schedule) return undefined;
    const idx = (run?.currentRoundIndex ?? 0) + 1;
    return state.schedule.rounds[idx];
  }, [state, run]);

  if (!state?.schedule) {
    return <Container sx={{ py: 4 }}><Alert severity="info">Generate a schedule first.</Alert></Container>;
  }
  if (!currentRound) {
    return <Container sx={{ py: 4 }}><Alert severity="info">No round available.</Alert></Container>;
  }

  const phase = run?.phase ?? 'idle';
  // While paused, treat the pre-pause phase as the "effective" phase for
  // duration + timer display; the actual `phase` remains 'paused' so the
  // auto-advance effect above stays quiet.
  const effectivePhase: RunPhase =
    phase === 'paused' ? run?.pausedFromPhase ?? 'conversation' : phase;
  const dur = phaseDurationMs(effectivePhase, run?.currentRoundIndex ?? 0,
    state.params.roundSeconds, state.params.moveSeconds, state.params.breaks);
  const elapsed = run ? now - run.phaseStartedAt : 0;
  const remaining = phase === 'paused'
    ? Math.max(0, run?.pausedRemainingMs ?? 0)
    : Math.max(0, dur - elapsed);
  const mm = Math.floor(remaining / 60000).toString().padStart(2, '0');
  const ss = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');

  const highlight = find.trim()
    ? state.roster.find((p) => p.name.toLowerCase().includes(find.trim().toLowerCase()))?.id
    : undefined;

  return (
    <Container sx={{ py: 3 }} maxWidth="xl">
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="h5">Round {(run?.currentRoundIndex ?? 0) + 1} of {state.schedule.rounds.length}</Typography>
          <Chip label={phase.toUpperCase()} color={phase === 'move' ? 'warning' : phase === 'break' ? 'default' : 'primary'} />
          <Typography variant="h3" sx={{ fontVariantNumeric: 'tabular-nums', ml: 'auto' }}>{mm}:{ss}</Typography>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
          {phase === 'idle' && (
            <Button variant="contained" onClick={actions.startRun}>Start</Button>
          )}
          {phase !== 'idle' && phase !== 'paused' && phase !== 'finished' && (
            <>
              <Button onClick={() => actions.pauseRun(remaining)}>Pause</Button>
              <Button onClick={() => {
                const next = nextPhase(phase, run!.currentRoundIndex, state.schedule!.rounds.length, state.params.breaks);
                actions.setPhase({ phase: next.phase, roundIndex: next.roundIndex, startedAt: Date.now() });
              }}>Skip phase</Button>
              <Button color="error" onClick={actions.endRun}>End event</Button>
            </>
          )}
          {phase === 'paused' && (
            <>
              <Button
                variant="contained"
                onClick={() => {
                  // Set phaseStartedAt so that the timer will read
                  // `pausedRemainingMs` remaining immediately after resume.
                  const rem = run?.pausedRemainingMs ?? 0;
                  actions.resumeRun(Date.now() - (dur - rem));
                }}
              >
                Resume
              </Button>
              <Button color="error" onClick={actions.endRun}>End event</Button>
            </>
          )}
          <TextField size="small" placeholder="Find a name…" value={find}
            onChange={(e) => setFind(e.target.value)} sx={{ ml: 'auto', minWidth: 200 }} />
        </Stack>
      </Paper>

      {effectivePhase === 'break' ? (
        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'grey.100' }}>
          <Typography variant="h2">
            {state.params.breaks.find((b) => b.afterRound === (run?.currentRoundIndex ?? 0) + 1)?.label ?? 'Break'}
          </Typography>
          <Typography variant="h1" sx={{ mt: 2, fontVariantNumeric: 'tabular-nums' }}>{mm}:{ss}</Typography>
        </Paper>
      ) : phase === 'finished' ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Typography variant="h3">Event complete 🎉</Typography>
        </Paper>
      ) : (
        <AreaGrid
          roster={state.roster}
          params={state.params}
          round={currentRound}
          phase={effectivePhase}
          nextRound={effectivePhase === 'move' ? nextRoundData : undefined}
          highlightPersonId={highlight}
        />
      )}
    </Container>
  );
}
