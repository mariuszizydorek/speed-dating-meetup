import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Container, Stack, TextField, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEvent } from '../state/EventContext';
import { AreaGrid } from '../components/AreaGrid';
import { C } from '../styles/colors';
import {
  icebreakerForRound, loadFloorLayout, loadSoundEnabled, playCue, saveFloorLayout, saveSoundEnabled,
} from '../domain/runExtras';
import type { FloorLayout } from '../domain/runExtras';
import type {
  Area, BreakSlot, Person, Round, RunPhase,
} from '../domain/types';

const GAP_DURATION_MS = 300_000;

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
  if (phase === 'gap') return GAP_DURATION_MS;
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
  if (current === 'gap') return { phase: 'finished', roundIndex };
  return { phase: current, roundIndex };
}

function fmt(ms: number): string {
  const clamped = Math.max(0, ms);
  const mm = Math.floor(clamped / 60000).toString().padStart(2, '0');
  const ss = Math.floor((clamped % 60000) / 1000).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

const PHASE_META: Record<RunPhase, { label: string; color: string }> = {
  idle: { label: 'READY', color: C.fgMuted },
  conversation: { label: 'CONVERSATION', color: C.acc },
  move: { label: 'MOVE — FIND YOUR NEXT AREA', color: C.orange },
  break: { label: 'BREAK', color: C.info },
  paused: { label: 'PAUSED', color: C.fgMuted },
  finished: { label: 'FINISHED', color: C.acc },
  gap: { label: 'MEET THE GAP', color: C.acc },
};

export function RunPage() {
  const { state, actions } = useEvent();
  const navigate = useNavigate();
  const [now, setNow] = useState(Date.now());
  const [find, setFind] = useState('');
  const [showNextRound, setShowNextRound] = useState(false);
  const [editFloor, setEditFloor] = useState(false);
  const [demoSpeed, setDemoSpeed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => loadSoundEnabled());
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 760,
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onResize() {
      setIsNarrow(window.innerWidth < 760);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const run = state?.runState;
  const speedMultiplier = demoSpeed ? 10 : 1;

  const transitionTo = useCallback((phaseVal: RunPhase, roundIndex: number) => {
    if (phaseVal === 'conversation') playCue('start', soundEnabled);
    else if (phaseVal === 'move' || phaseVal === 'break') playCue('move', soundEnabled);
    actions.setPhase({ phase: phaseVal, roundIndex, startedAt: Date.now() });
  }, [actions, soundEnabled]);

  useEffect(() => {
    if (!state || !state.schedule || !run || run.phase === 'idle'
        || run.phase === 'paused' || run.phase === 'finished') return;
    const dur = phaseDurationMs(run.phase, run.currentRoundIndex,
      state.params.roundSeconds, state.params.moveSeconds, state.params.breaks);
    const elapsedRaw = now - run.phaseStartedAt;
    const elapsed = demoSpeed ? elapsedRaw * 10 : elapsedRaw;
    if (elapsed >= dur) {
      const next = nextPhase(run.phase, run.currentRoundIndex,
        state.schedule.rounds.length, state.params.breaks);
      transitionTo(next.phase, next.roundIndex);
    }
  }, [now, run, state, demoSpeed, transitionTo]);

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
  const currentRoundIndex = run?.currentRoundIndex ?? 0;
  const totalRounds = state.schedule.rounds.length;

  const dur = phaseDurationMs(effectivePhase, currentRoundIndex,
    state.params.roundSeconds, state.params.moveSeconds, state.params.breaks);
  const previewDur = Math.max(0, (state.params.roundSeconds - state.params.moveSeconds) * 1000);
  const elapsedRaw = run ? now - run.phaseStartedAt : 0;
  const elapsed = demoSpeed ? elapsedRaw * 10 : elapsedRaw;
  const remaining = phase === 'paused'
    ? Math.max(0, run?.pausedRemainingMs ?? 0)
    : (phase === 'idle' || phase === 'finished')
      ? previewDur
      : Math.max(0, dur - elapsed);

  const warn = phase !== 'paused' && (
    (effectivePhase === 'conversation' && remaining <= 15000)
    || (effectivePhase === 'move' && remaining <= 10000)
  );
  const timerColor = warn ? C.orange : effectivePhase === 'break' ? C.info : C.fg;

  const progressPct = dur > 0
    && (effectivePhase === 'conversation' || effectivePhase === 'move'
      || effectivePhase === 'break' || effectivePhase === 'gap')
    ? Math.min(100, Math.max(0, 100 * (1 - remaining / dur)))
    : 0;
  const progressColor = effectivePhase === 'move' ? C.orange : effectivePhase === 'break' ? C.info : C.acc;

  const canShowGhost = !!nextRoundData;
  const ghostActive = showNextRound && canShowGhost;

  const highlightQuery = find.trim();

  const ibIdx = Math.min(
    effectivePhase === 'move' || effectivePhase === 'break' ? currentRoundIndex + 1 : currentRoundIndex,
    Math.max(0, totalRounds - 1),
  );
  const icebreakerLabel = effectivePhase === 'move' ? 'NEXT ICEBREAKER' : `ICEBREAKER · ROUND ${ibIdx + 1}`;
  const icebreakerText = icebreakerForRound(ibIdx, state.params.icebreakers);
  const showIcebreaker =
    (effectivePhase === 'idle' || effectivePhase === 'conversation' || effectivePhase === 'move')
    && icebreakerText.trim() !== '';

  const talkSeconds = Math.max(0, state.params.roundSeconds - state.params.moveSeconds);
  const talkMin = Math.floor(talkSeconds / 60);
  const talkSec = (talkSeconds % 60).toString().padStart(2, '0');
  const hint = editFloor
    ? 'Drag any area card to where its table stands in the room.'
    : phase === 'idle'
      ? `Press Start — ${talkMin}:${talkSec} talk / ${state.params.moveSeconds}s move per round.`
      : '';

  const primaryLabel = phase === 'idle' ? 'Start event'
    : phase === 'finished' ? 'Restart'
    : phase === 'paused' ? 'Resume'
    : 'Pause';

  function handlePrimary() {
    if (phase === 'idle' || phase === 'finished') {
      playCue('start', soundEnabled);
      actions.startRun();
    } else if (phase === 'paused') {
      const rem = run?.pausedRemainingMs ?? 0;
      actions.resumeRun(Date.now() - (dur - rem) / speedMultiplier);
    } else {
      actions.pauseRun(remaining);
    }
  }

  function handleSkipPhase() {
    if (!run || phase === 'idle' || phase === 'finished') return;
    const next = nextPhase(phase, run.currentRoundIndex, totalRounds, state.params.breaks);
    transitionTo(next.phase, next.roundIndex);
  }

  function handleNextRound() {
    if (!run) return;
    const nextIdx = currentRoundIndex + 1;
    if (nextIdx >= totalRounds) {
      actions.endRun();
    } else {
      transitionTo('conversation', nextIdx);
    }
  }

  function handleExtendBreak() {
    if (!run) return;
    // Extend break by a displayed minute: shift phaseStartedAt back so the
    // elapsed timer effectively reads 60s less, accounting for demo speed.
    actions.setPhase({
      phase: 'break',
      roundIndex: currentRoundIndex,
      startedAt: run.phaseStartedAt + 60_000 / speedMultiplier,
    });
  }

  function handleStartGap() {
    if (!run) return;
    playCue('start', soundEnabled);
    actions.setPhase({ phase: 'gap', roundIndex: currentRoundIndex, startedAt: Date.now() });
  }

  function handleResetRun() {
    if (!run) return;
    actions.setPhase({ phase: 'idle', roundIndex: 0, startedAt: Date.now() });
  }

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    saveSoundEnabled(next);
    if (next) playCue('start', true);
  }

  const disableRoundControls = phase === 'idle' || phase === 'finished';

  const totalPairs = state.schedule.quality.totalPairs;
  const uniquePairs = state.schedule.quality.uniquePairs;
  const perPerson = state.schedule.quality.perPerson;
  const avgNew = perPerson.length
    ? perPerson.reduce((sum, p) => sum + p.metIds.length, 0) / perPerson.length
    : 0;
  const finishedSummary = `${totalRounds} rounds · ${totalPairs} meetings · `
    + `${uniquePairs} unique pairs · avg ${avgNew.toFixed(1)} new people met per person.`;

  const phaseMeta = PHASE_META[phase];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, bgcolor: C.black }}>
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 20px',
        p: '10px 16px', bgcolor: C.panel, borderBottom: `1px solid ${C.stroke2}`,
      }}>
        <Box>
          <Typography sx={{ fontSize: 11, color: C.fgLabel, mb: '3px' }}>ROUND</Typography>
          <Typography
            data-testid="round-indicator"
            sx={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: C.fg }}
          >
            {currentRoundIndex + 1} / {totalRounds}
          </Typography>
        </Box>
        <Box sx={{
          border: `1px solid ${phaseMeta.color}`, color: phaseMeta.color, px: 1.5, py: 0.7,
          borderRadius: C.radius, fontSize: 12, letterSpacing: '.06em',
        }}>
          {phaseMeta.label}
        </Box>
        <Box sx={{ flex: 1, textAlign: 'center', minWidth: 180 }}>
          <Typography sx={{
            fontSize: 'clamp(44px,8vw,120px)', fontWeight: 200, fontVariantNumeric: 'tabular-nums',
            lineHeight: 1, color: timerColor, animation: warn ? 'snsPulse 1s infinite' : 'none',
          }}>
            {fmt(remaining)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <Button onClick={handlePrimary} sx={{
            bgcolor: C.cta, color: '#fff', px: 2, py: 1, fontSize: 13, borderRadius: C.radius,
            '&:hover': { bgcolor: C.cta, filter: 'brightness(1.15)' },
          }}>
            {primaryLabel}
          </Button>
          <Button onClick={handleSkipPhase} disabled={disableRoundControls} sx={{
            border: `1px solid ${C.stroke4}`, color: C.fgAssist, px: 1.5, py: 0.9, fontSize: 12,
            borderRadius: C.radius, '&:hover': { color: C.fg }, '&.Mui-disabled': { color: C.fgLabel, borderColor: C.stroke1 },
          }}>
            Skip phase
          </Button>
          <Button onClick={handleNextRound} disabled={disableRoundControls} sx={{
            border: `1px solid ${C.stroke4}`, color: C.fgAssist, px: 1.5, py: 0.9, fontSize: 12,
            borderRadius: C.radius, '&:hover': { color: C.fg }, '&.Mui-disabled': { color: C.fgLabel, borderColor: C.stroke1 },
          }}>
            Next round
          </Button>
          <Button onClick={actions.endRun} disabled={disableRoundControls} sx={{
            border: `1px solid ${C.stroke4}`, color: C.fgAssist, px: 1.5, py: 0.9, fontSize: 12,
            borderRadius: C.radius, '&:hover': { color: C.red, borderColor: C.red },
            '&.Mui-disabled': { color: C.fgLabel, borderColor: C.stroke1 },
          }}>
            End
          </Button>
        </Stack>
      </Box>

      <Box sx={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, p: '8px 16px',
        bgcolor: C.panel, borderBottom: `1px solid ${C.stroke1}`,
      }}>
        <TextField
          size="small"
          placeholder="Where's who? Type a name"
          value={find}
          onChange={(e) => setFind(e.target.value)}
          sx={{ minWidth: 200 }}
        />
        <TogglePill
          label="Next-round ghost"
          active={ghostActive}
          disabled={!canShowGhost}
          onClick={() => setShowNextRound((v) => !v)}
        />
        <TogglePill
          label={editFloor ? 'Done editing floor' : 'Edit floor layout'}
          active={editFloor}
          onClick={() => setEditFloor((v) => !v)}
        />
        <TogglePill
          label="×10 demo speed"
          active={demoSpeed}
          onClick={() => setDemoSpeed((v) => !v)}
        />
        <TogglePill
          label="Sound"
          active={soundEnabled}
          onClick={toggleSound}
        />
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 11, color: C.fgLabel }}>{hint}</Typography>
      </Box>

      <Box sx={{ height: 3, bgcolor: C.stroke1, position: 'relative', overflow: 'hidden' }}>
        <Box sx={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progressPct}%`,
          bgcolor: progressColor, transition: 'width .3s linear',
        }} />
      </Box>

      {showIcebreaker && (
        <Box sx={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 1.5,
          p: '11px 16px', bgcolor: C.suggestBg, borderBottom: `1px solid ${C.stroke2}`, flexWrap: 'wrap',
        }}>
          <Typography sx={{ fontSize: 11, letterSpacing: '.08em', color: C.info, whiteSpace: 'nowrap' }}>
            {icebreakerLabel}
          </Typography>
          <Typography sx={{ fontSize: 16, color: C.fg }}>{icebreakerText}</Typography>
        </Box>
      )}

      <Box sx={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {phase === 'gap' ? (
          <GapGrid roster={state.roster} perPerson={perPerson} />
        ) : isNarrow ? (
          <Box sx={{ p: 1 }}>
            <AreaGrid
              roster={state.roster}
              params={state.params}
              round={currentRound}
              phase={effectivePhase === 'paused' ? 'conversation' : effectivePhase}
              nextRound={effectivePhase === 'move' ? nextRoundData : undefined}
              ghostRound={ghostActive ? nextRoundData : undefined}
              searchQuery={highlightQuery}
            />
          </Box>
        ) : (
          <FloorPlan
            areas={state.params.areas}
            roster={state.roster}
            round={currentRound}
            phase={effectivePhase}
            nextRound={effectivePhase === 'move' ? nextRoundData : undefined}
            ghostRound={ghostActive ? nextRoundData : undefined}
            searchQuery={highlightQuery}
            editFloor={editFloor}
          />
        )}

        {effectivePhase === 'break' && (
          <Box sx={{
            position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,.45)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20,
          }}>
            <Box sx={{
              bgcolor: C.panel, border: `1px solid ${C.stroke2}`, borderRadius: C.radiusLg,
              p: '36px 48px', textAlign: 'center', maxWidth: '90%',
            }}>
              <Typography sx={{ fontSize: 12, letterSpacing: '.1em', color: C.info, mb: 1.25 }}>BREAK</Typography>
              <Typography sx={{ fontSize: 26, color: C.fg, mb: 1.75 }}>
                {state.params.breaks.find((b) => b.afterRound === currentRoundIndex + 1)?.label ?? 'Break'}
              </Typography>
              <Typography sx={{
                fontSize: 'clamp(56px,12vw,140px)', fontWeight: 200, fontVariantNumeric: 'tabular-nums',
                color: C.info, lineHeight: 1, mb: 2.75,
              }}>
                {fmt(remaining)}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button onClick={handleSkipPhase} sx={{
                  bgcolor: C.cta, color: '#fff', px: 2.25, py: 1.1, fontSize: 13, borderRadius: C.radius,
                  '&:hover': { filter: 'brightness(1.15)' },
                }}>
                  Skip break
                </Button>
                <Button onClick={handleExtendBreak} sx={{
                  border: `1px solid ${C.stroke4}`, color: C.fgAssist, px: 2, py: 1.05, fontSize: 13,
                  borderRadius: C.radius, '&:hover': { color: C.fg },
                }}>
                  +1 minute
                </Button>
              </Stack>
            </Box>
          </Box>
        )}

        {phase === 'finished' && (
          <Box sx={{
            position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20,
          }}>
            <Box sx={{
              bgcolor: C.panel, border: `1px solid ${C.stroke2}`, borderRadius: C.radiusLg,
              p: '36px 48px', textAlign: 'center', maxWidth: '90%',
            }}>
              <Typography sx={{ fontSize: 12, letterSpacing: '.1em', color: C.acc, mb: 1.25 }}>
                EVENT COMPLETE
              </Typography>
              <Typography sx={{ fontSize: 30, color: C.fg, mb: 1.5 }}>That's a wrap</Typography>
              <Typography sx={{ fontSize: 14, color: C.fgMuted, lineHeight: 1.5, mb: 2.75 }}>
                {finishedSummary}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                <Button onClick={() => navigate('/print')} sx={{
                  bgcolor: C.cta, color: '#fff', px: 2.25, py: 1.1, fontSize: 13, borderRadius: C.radius,
                  '&:hover': { filter: 'brightness(1.15)' },
                }}>
                  View quality report
                </Button>
                <Button onClick={handleStartGap} sx={{
                  border: `1px solid ${C.acc}`, color: C.acc, px: 2, py: 1.05, fontSize: 13,
                  borderRadius: C.radius, '&:hover': { bgcolor: C.mintSoft },
                }}>
                  Meet-the-gap round · 5:00
                </Button>
                <Button onClick={handleResetRun} sx={{
                  border: `1px solid ${C.stroke4}`, color: C.fgAssist, px: 2, py: 1.05, fontSize: 13,
                  borderRadius: C.radius, '&:hover': { color: C.fg },
                }}>
                  Reset run
                </Button>
              </Stack>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

function TogglePill({ label, active, disabled, onClick }: {
  label: string; active: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      sx={{
        border: `1px solid ${active ? C.acc : C.stroke4}`, color: active ? C.acc : C.fgAssist,
        px: 1.5, py: 0.9, fontSize: 12, borderRadius: C.radius, textTransform: 'none',
        '&:hover': { bgcolor: C.rail }, '&.Mui-disabled': { color: C.fgLabel, borderColor: C.stroke1 },
      }}
    >
      {label}
    </Button>
  );
}

interface FloorPlanProps {
  areas: Area[];
  roster: Person[];
  round: Round;
  phase: RunPhase;
  nextRound?: Round;
  ghostRound?: Round;
  searchQuery?: string;
  editFloor: boolean;
}

const FLOOR_COLS = 5;

function defaultFloorPos(index: number): { x: number; y: number } {
  return { x: (index % FLOOR_COLS) * 20.2 + 0.6, y: Math.floor(index / FLOOR_COLS) * 51 + 2 };
}

function FloorPlan({
  areas, roster, round, phase, nextRound, ghostRound, searchQuery, editFloor,
}: FloorPlanProps) {
  const [layout, setLayout] = useState<FloorLayout>(() => loadFloorLayout());
  const containerRef = useRef<HTMLDivElement>(null);

  const personById = useMemo(() => new Map(roster.map((p) => [p.id, p])), [roster]);
  const nextAreaByPerson = useMemo(() => {
    const m = new Map<string, string>();
    if (nextRound) {
      for (const g of nextRound.groups) {
        const label = areas.find((a) => a.id === g.areaId)?.label ?? '';
        for (const id of g.memberIds) m.set(id, label);
      }
    }
    return m;
  }, [nextRound, areas]);
  const ghostNamesByArea = useMemo(() => {
    const m = new Map<string, string[]>();
    if (ghostRound) {
      for (const g of ghostRound.groups) {
        m.set(g.areaId, g.memberIds.map((id) => personById.get(id)?.name.split(' ')[0] ?? id));
      }
    }
    return m;
  }, [ghostRound, personById]);

  const query = searchQuery?.trim().toLowerCase();

  function handlePointerDown(areaId: string, index: number) {
    return (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!editFloor || !containerRef.current) return;
      e.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const start = layout[areaId] ?? defaultFloorPos(index);
      const sx = e.clientX;
      const sy = e.clientY;
      function onMove(ev: PointerEvent) {
        const nx = Math.max(0, Math.min(81, start.x + ((ev.clientX - sx) / rect.width) * 100));
        const ny = Math.max(0, Math.min(53, start.y + ((ev.clientY - sy) / rect.height) * 100));
        setLayout((prev) => ({ ...prev, [areaId]: { x: Math.round(nx * 2) / 2, y: Math.round(ny * 2) / 2 } }));
      }
      function onUp() {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        setLayout((prev) => {
          saveFloorLayout(prev);
          return prev;
        });
      }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };
  }

  return (
    <Box ref={containerRef} sx={{ position: 'relative', m: 1, minHeight: 460, height: '100%' }}>
      {round.groups.map((g, index) => {
        const area = areas.find((a) => a.id === g.areaId);
        const pos = layout[g.areaId] ?? defaultFloorPos(index);
        const members = g.memberIds.map((id) => personById.get(id)).filter((p): p is Person => !!p);
        const isMatch = !!query && members.some((p) => p.name.toLowerCase().includes(query));
        const ghostNames = ghostNamesByArea.get(g.areaId);
        return (
          <Box
            key={g.areaId}
            onPointerDown={handlePointerDown(g.areaId, index)}
            sx={{
              position: 'absolute', left: `${pos.x}%`, top: `${pos.y}%`, width: '18.8%', height: '46%',
              bgcolor: C.panel, border: `1px solid ${isMatch ? C.acc : phase === 'move' ? C.orange : C.stroke2}`,
              borderRadius: C.radiusLg, p: '10px 12px', boxSizing: 'border-box',
              cursor: editFloor ? 'grab' : 'default', overflow: 'hidden', userSelect: 'none', touchAction: 'none',
              opacity: phase === 'break' ? 0.4 : 1,
              animation: phase === 'move' && !isMatch ? 'snsGlow 1.6s infinite' : 'none',
              transition: 'border-color .18s, opacity .18s',
            }}
          >
            <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1, mb: 1 }}>
              <Typography sx={{ fontSize: 22, fontWeight: 700, color: isMatch ? C.acc : C.fg }}>
                {area?.label ?? g.areaId}
              </Typography>
              <Typography sx={{ fontSize: 11, color: C.fgLabel }}>{members.length} seats</Typography>
            </Stack>
            {members.map((m) => {
              const matched = !!query && m.name.toLowerCase().includes(query);
              const nextArea = nextAreaByPerson.get(m.id);
              const arrow = phase === 'move' ? (nextArea ? `→ ${nextArea}` : '✓') : '';
              return (
                <Box key={m.id} sx={{
                  display: 'flex', alignItems: 'baseline', gap: 0.75, py: 0.4, borderTop: `1px solid ${C.stroke1}`,
                }}>
                  <Typography sx={{
                    fontSize: 13, color: matched ? C.acc : C.fg, whiteSpace: 'nowrap', overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {m.name}
                  </Typography>
                  <Typography sx={{
                    fontSize: 11, color: C.fgLabel, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {m.company}
                  </Typography>
                  {arrow && (
                    <Typography sx={{ fontSize: 12, color: C.acc, fontVariantNumeric: 'tabular-nums' }}>
                      {arrow}
                    </Typography>
                  )}
                </Box>
              );
            })}
            {ghostNames && ghostNames.length > 0 && (
              <Typography sx={{ fontSize: 11, color: C.fgLabel, mt: 0.75, opacity: 0.75 }}>
                next: {ghostNames.join(', ')}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

interface GapGridProps {
  roster: Person[];
  perPerson: { id: string; neverMetIds: string[] }[];
}

function GapGrid({ roster, perPerson }: GapGridProps) {
  const neverMetById = new Map(perPerson.map((p) => [p.id, p.neverMetIds]));
  const nameById = new Map(roster.map((p) => [p.id, p.name]));
  return (
    <Box sx={{
      flex: 1, overflowY: 'auto', p: 2, display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 1, alignContent: 'start',
    }}>
      {roster.map((person) => {
        const never = neverMetById.get(person.id) ?? [];
        const targets = never.slice(0, 3).map((id) => nameById.get(id) ?? id).join(', ')
          || 'met everyone — float freely!';
        return (
          <Box key={person.id} sx={{
            bgcolor: C.panel, border: `1px solid ${C.stroke2}`, borderRadius: C.radiusLg, p: '10px 14px',
          }}>
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: C.fg }}>{person.name}</Typography>
            <Typography sx={{ fontSize: 12, color: C.fgMuted, mt: 0.4, lineHeight: 1.4 }}>
              find: <Box component="span" sx={{ color: C.acc }}>{targets}</Box>
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
