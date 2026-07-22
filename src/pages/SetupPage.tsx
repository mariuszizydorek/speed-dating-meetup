import { useState } from 'react';
import {
  Alert, Box, Button, Container, FormControlLabel, IconButton, Stack, Switch,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { parseRoster } from '../domain/parseRoster';
import type { RowError } from '../domain/parseRoster';
import { useEvent } from '../state/EventContext';
import type { BreakSlot, Person } from '../domain/types';

export function SetupPage() {
  const { state, actions } = useEvent();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<RowError[]>([]);

  const roster = state?.roster ?? [];
  const params = state?.params;

  async function handleFile(file: File) {
    const buf = await file.arrayBuffer();
    const result = await parseRoster(buf, file.name);
    actions.importRoster(result.people);
    setErrors(result.errors);
  }

  function removePerson(id: string) {
    // Removing an attendee invalidates the schedule — treat as fresh import.
    actions.importRoster(roster.filter((p) => p.id !== id));
  }

  function addManualPerson() {
    // Adding an attendee invalidates the schedule — treat as fresh import.
    const person: Person = { id: nanoid(10), name: 'New attendee', company: '', rowIndex: -1 };
    actions.importRoster([...roster, person]);
  }

  function editPerson(id: string, patch: Partial<Person>) {
    // Renaming or changing company does NOT invalidate the schedule;
    // use updateRoster so keystrokes don't wipe schedule/runState.
    actions.updateRoster(roster.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  // Validation
  const areaCount = params?.areas.length ?? 0;
  const groupSize = params?.groupSize ?? 0;
  const hardErrors: string[] = [];
  if (!params) hardErrors.push('Import a roster to configure parameters.');
  else {
    if (roster.length < groupSize) hardErrors.push(`Need at least ${groupSize} people to form one group.`);
    if (groupSize < 2) hardErrors.push('Group size must be at least 2.');
    if (areaCount < 1) hardErrors.push('At least one area is required.');
    if (params.numRounds < 1) hardErrors.push('At least one round is required.');
    for (const b of params.breaks) {
      if (b.afterRound < 1 || b.afterRound >= params.numRounds) {
        hardErrors.push(`Break "${b.label}" must occur between rounds 1 and ${params.numRounds - 1}.`);
      }
    }
  }
  const softWarn = params && roster.length < areaCount * groupSize
    ? `Only ${roster.length} people for ${areaCount * groupSize} seats — some groups will be smaller.`
    : undefined;

  return (
    <Container sx={{ py: 4 }} maxWidth="lg">
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">Setup</Typography>

        {hardErrors.length > 0 && (
          <Alert severity="error">
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {hardErrors.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
          </Alert>
        )}
        {softWarn && <Alert severity="warning">{softWarn}</Alert>}

        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { md: '1fr 1fr' } }}>
          <Box>
            <Typography variant="h6">Roster</Typography>
            <Box sx={{ my: 2 }}>
              <Button variant="outlined" component="label">
                Choose Excel or CSV file
                <input
                  hidden
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </Button>
              <Button startIcon={<AddIcon />} onClick={addManualPerson} sx={{ ml: 1 }}>
                Add person
              </Button>
            </Box>
            {errors.length > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {errors.map((e) => <li key={`${e.rowIndex}-${e.reason}`}>{e.message}</li>)}
                </ul>
              </Alert>
            )}
            {roster.length > 0 && (
              <>
                <Typography variant="body2" sx={{ mb: 1 }}>{roster.length} people</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Company</TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {roster.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <TextField size="small" variant="standard" value={p.name}
                            onChange={(e) => editPerson(p.id, { name: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <TextField size="small" variant="standard" value={p.company}
                            onChange={(e) => editPerson(p.id, { company: e.target.value })} />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton size="small" onClick={() => removePerson(p.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </Box>

          <Box>
            <Typography variant="h6">Parameters</Typography>
            {params && (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <TextField label="Group size" type="number" size="small" value={params.groupSize}
                  onChange={(e) => actions.updateParams({ groupSize: Math.max(1, Number(e.target.value)) })} />
                <TextField label="Number of areas" type="number" size="small" value={areaCount}
                  onChange={(e) => {
                    const n = Math.max(1, Number(e.target.value));
                    const areas = Array.from({ length: n }, (_, i) => ({
                      id: String.fromCharCode(65 + i),
                      label: String.fromCharCode(65 + i),
                    }));
                    actions.updateParams({ areas, numRounds: Math.max(params.numRounds, n) });
                  }} />
                <TextField label="Number of rounds" type="number" size="small" value={params.numRounds}
                  onChange={(e) => actions.updateParams({ numRounds: Math.max(1, Number(e.target.value)) })} />
                <TextField label="Round seconds (total)" type="number" size="small" value={params.roundSeconds}
                  onChange={(e) => actions.updateParams({ roundSeconds: Math.max(30, Number(e.target.value)) })} />
                <TextField label="Move seconds" type="number" size="small" value={params.moveSeconds}
                  onChange={(e) => actions.updateParams({ moveSeconds: Math.max(0, Number(e.target.value)) })} />
                <FormControlLabel
                  control={<Switch checked={params.avoidSameCompany}
                    onChange={(e) => actions.updateParams({ avoidSameCompany: e.target.checked })} />}
                  label="Avoid same-company pairings" />

                <BreakEditor
                  breaks={params.breaks}
                  onChange={(breaks) => actions.updateParams({ breaks })}
                  maxRound={params.numRounds - 1}
                />
              </Stack>
            )}
          </Box>
        </Box>

        <Box>
          <Button
            variant="contained"
            size="large"
            disabled={hardErrors.length > 0}
            onClick={() => navigate('/schedule')}
          >
            Generate schedule
          </Button>
        </Box>
      </Stack>
    </Container>
  );
}

function BreakEditor({ breaks, onChange, maxRound }: {
  breaks: BreakSlot[]; onChange: (b: BreakSlot[]) => void; maxRound: number;
}) {
  return (
    <Box>
      <Typography variant="subtitle2">Breaks</Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {breaks.map((b, i) => (
          <Stack key={i} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <TextField size="small" label="After round" type="number" value={b.afterRound}
              onChange={(e) => {
                const next = [...breaks];
                next[i] = { ...next[i], afterRound: Number(e.target.value) };
                onChange(next);
              }} sx={{ width: 120 }} />
            <TextField size="small" label="Seconds" type="number" value={b.seconds}
              onChange={(e) => {
                const next = [...breaks];
                next[i] = { ...next[i], seconds: Number(e.target.value) };
                onChange(next);
              }} sx={{ width: 120 }} />
            <TextField size="small" label="Label" value={b.label}
              onChange={(e) => {
                const next = [...breaks];
                next[i] = { ...next[i], label: e.target.value };
                onChange(next);
              }} />
            <IconButton size="small" onClick={() => onChange(breaks.filter((_, j) => j !== i))}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        <Button
          size="small"
          startIcon={<AddIcon />}
          disabled={maxRound < 1}
          onClick={() => onChange([...breaks, { afterRound: Math.max(1, maxRound), seconds: 600, label: 'Break' }])}
        >
          Add break
        </Button>
      </Stack>
    </Box>
  );
}
