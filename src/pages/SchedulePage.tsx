import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Container, Drawer, IconButton, LinearProgress, Paper,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { useEvent } from '../state/EventContext';
import { generateSchedule } from '../domain/scheduler';
import type { Schedule } from '../domain/types';

type ViewMode = 'round' | 'person';

interface DrawerTarget {
  round: number;
  areaId: string;
}

export function SchedulePage() {
  const { state, actions } = useEvent();
  const navigate = useNavigate();
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 100000));
  const [generating, setGenerating] = useState(false);
  const [pendingGenerate, setPendingGenerate] = useState(false);
  const [view, setView] = useState<ViewMode>('round');
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);

  // When "generating" flips to true, schedule the actual (blocking) work on the
  // next macrotask so React can paint the LinearProgress first.
  useEffect(() => {
    if (!pendingGenerate || !state) return;
    const handle = setTimeout(() => {
      const s = generateSchedule(
        state.roster,
        state.params,
        { seed, timeBudgetMs: 2000, restarts: 6 },
      );
      actions.setSchedule(s);
      setGenerating(false);
      setPendingGenerate(false);
    }, 0);
    return () => clearTimeout(handle);
  }, [pendingGenerate, state, seed, actions]);

  const nameById = useMemo(
    () => new Map((state?.roster ?? []).map((p) => [p.id, p.name])),
    [state?.roster],
  );
  const companyById = useMemo(
    () => new Map((state?.roster ?? []).map((p) => [p.id, p.company])),
    [state?.roster],
  );

  if (!state || state.roster.length === 0 || state.params.areas.length === 0) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="info">Import a roster on the Setup page first.</Alert>
      </Container>
    );
  }

  const schedule = state.schedule;

  function generate() {
    setGenerating(true);
    setPendingGenerate(true);
  }

  const drawerGroup = (() => {
    if (!schedule || !drawer) return null;
    const round = schedule.rounds.find((r) => r.index === drawer.round);
    if (!round) return null;
    const group = round.groups.find((g) => g.areaId === drawer.areaId);
    if (!group) return null;
    const area = state.params.areas.find((a) => a.id === drawer.areaId);
    return { round, group, area };
  })();

  return (
    <Container sx={{ py: 4 }} maxWidth="lg">
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" component="h1">Schedule</Typography>
          {generating && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress aria-label="Generating schedule" />
            </Box>
          )}
        </Box>

        <Paper sx={{ p: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <TextField label="Seed" size="small" type="number" value={seed}
              onChange={(e) => setSeed(Number(e.target.value))} sx={{ width: 160 }} />
            <Button variant="contained" onClick={generate} disabled={generating}>
              {generating ? 'Generating…' : schedule ? 'Regenerate' : 'Generate'}
            </Button>
            <Button onClick={() => setSeed(Math.floor(Math.random() * 100000))} disabled={generating}>
              New seed
            </Button>
          </Stack>
        </Paper>

        {schedule && (
          <>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Quality</Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
                <Chip label={`Repeated pairs: ${schedule.quality.repeatedPairs}`} color={schedule.quality.repeatedPairs === 0 ? 'success' : 'warning'} />
                <Chip label={`Same-company pairs: ${schedule.quality.sameCompanyPairs}`} />
                <Chip label={`Unique pairs: ${schedule.quality.uniquePairs}`} />
                <Chip label={`Total meetings: ${schedule.quality.totalPairs}`} />
              </Stack>
            </Paper>

            <ToggleButtonGroup
              value={view}
              exclusive
              size="small"
              onChange={(_, v: ViewMode | null) => { if (v) setView(v); }}
              aria-label="Schedule view"
            >
              <ToggleButton value="round" aria-label="By round">By round</ToggleButton>
              <ToggleButton value="person" aria-label="By person">By person</ToggleButton>
            </ToggleButtonGroup>

            {view === 'round' ? (
              <RoundView
                schedule={schedule}
                areas={state.params.areas}
                nameById={nameById}
                onCellClick={(round, areaId) => setDrawer({ round, areaId })}
              />
            ) : (
              <PersonView
                schedule={schedule}
                roster={state.roster}
                areas={state.params.areas}
                nameById={nameById}
              />
            )}

            <Box>
              <Button variant="contained" size="large" onClick={() => navigate('/print')}>
                Print materials
              </Button>
            </Box>
          </>
        )}
      </Stack>

      <Drawer anchor="right" open={drawer !== null} onClose={() => setDrawer(null)}>
        <Box sx={{ width: 320, p: 2 }} role="presentation" data-testid="cell-drawer">
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6">
              {drawerGroup
                ? `Round ${drawerGroup.round.index + 1} — Area ${drawerGroup.area?.label ?? drawerGroup.group.areaId}`
                : ''}
            </Typography>
            <IconButton aria-label="Close" onClick={() => setDrawer(null)}>
              <CloseIcon />
            </IconButton>
          </Stack>
          {drawerGroup && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {drawerGroup.group.memberIds.map((id) => {
                const name = nameById.get(id) ?? id;
                const company = companyById.get(id) ?? '';
                const label = company ? `${name} (${company})` : name;
                return <Chip key={id} label={label} />;
              })}
            </Stack>
          )}
          <Box sx={{ mt: 3 }}>
            <Button onClick={() => setDrawer(null)}>Close</Button>
          </Box>
        </Box>
      </Drawer>
    </Container>
  );
}

interface RoundViewProps {
  schedule: Schedule;
  areas: { id: string; label: string }[];
  nameById: Map<string, string>;
  onCellClick(round: number, areaId: string): void;
}

function RoundView({ schedule, areas, nameById, onCellClick }: RoundViewProps) {
  return (
    <Paper sx={{ p: 2, overflowX: 'auto' }}>
      <Typography variant="h6">Rounds × Areas</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell />
            {areas.map((a) => <TableCell key={a.id}>{a.label}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {schedule.rounds.map((r, i) => (
            <TableRow key={r.index}>
              <TableCell>Round {i + 1}</TableCell>
              {r.groups.map((g) => (
                <TableCell
                  key={g.areaId}
                  onClick={() => onCellClick(r.index, g.areaId)}
                  sx={{ cursor: 'pointer' }}
                >
                  {g.memberIds.map((id) => nameById.get(id) ?? id).join(', ')}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}

interface PersonViewProps {
  schedule: Schedule;
  roster: { id: string; name: string }[];
  areas: { id: string; label: string }[];
  nameById: Map<string, string>;
}

function PersonView({ schedule, roster, areas, nameById }: PersonViewProps) {
  const areaLabelById = new Map(areas.map((a) => [a.id, a.label]));

  // For each round, for each person: which group are they in.
  const perRoundLookup = schedule.rounds.map((round) => {
    const map = new Map<string, { areaId: string; memberIds: string[] }>();
    for (const g of round.groups) {
      for (const id of g.memberIds) {
        map.set(id, { areaId: g.areaId, memberIds: g.memberIds });
      }
    }
    return map;
  });

  const neverMetCountById = new Map(
    schedule.quality.perPerson.map((p) => [p.id, p.neverMetIds.length]),
  );

  return (
    <Paper sx={{ p: 2, overflowX: 'auto' }}>
      <Typography variant="h6">People × Rounds</Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Person</TableCell>
            {schedule.rounds.map((r, i) => (
              <TableCell key={r.index}>R{i + 1}</TableCell>
            ))}
            <TableCell>Never met</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {roster.map((person) => (
            <TableRow key={person.id}>
              <TableCell>{person.name}</TableCell>
              {schedule.rounds.map((r, i) => {
                const entry = perRoundLookup[i]!.get(person.id);
                if (!entry) {
                  return <TableCell key={r.index}>—</TableCell>;
                }
                const others = entry.memberIds
                  .filter((id) => id !== person.id)
                  .map((id) => nameById.get(id) ?? id)
                  .join(', ');
                const label = areaLabelById.get(entry.areaId) ?? entry.areaId;
                return (
                  <TableCell key={r.index}>
                    <Tooltip title={others || 'Alone'}>
                      <span>{label}</span>
                    </Tooltip>
                  </TableCell>
                );
              })}
              <TableCell>{neverMetCountById.get(person.id) ?? 0}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
}
