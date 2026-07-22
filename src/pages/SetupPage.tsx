import { useState } from 'react';
import {
  Alert, Box, Button, Divider, IconButton, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { parseRoster, parseRosterWithMapping } from '../domain/parseRoster';
import type { RowError } from '../domain/parseRoster';
import { useEvent } from '../state/EventContext';
import { describeSuggestion, makeDemoRoster, suggestParams } from '../state/projectLibrary';
import type { Area, BreakSlot, Person } from '../domain/types';
import { defaultIcebreakerList } from '../domain/runExtras';
import { C } from '../styles/colors';

interface ColumnMapperState {
  rawRows: Record<string, unknown>[];
  detectedColumns: string[];
  nameCol: string;
  companyCol: string; // '' means "no company column"
}

interface RosterFormState {
  name: string;
  company: string;
  email: string;
}

const EMPTY_FORM: RosterFormState = { name: '', company: '', email: '' };

interface ValidationDot {
  color: string;
  text: string;
}

export function SetupPage() {
  const { state, actions } = useEvent();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<RowError[]>([]);
  const [mapper, setMapper] = useState<ColumnMapperState | null>(null);
  const [form, setForm] = useState<RosterFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  const roster = state?.roster ?? [];
  const params = state?.params;

  async function handleFile(file: File) {
    const buf = await file.arrayBuffer();
    const result = await parseRoster(buf, file.name);
    actions.importRoster(result.people);
    setErrors(result.errors);
    if (
      result.errors[0]?.reason === 'missing_name_column' &&
      result.rawRows &&
      result.detectedColumns
    ) {
      const cols = result.detectedColumns;
      setMapper({
        rawRows: result.rawRows,
        detectedColumns: cols,
        nameCol: cols[0] ?? '',
        companyCol: cols[1] ?? '',
      });
    } else {
      setMapper(null);
    }
  }

  function applyMapping(next: ColumnMapperState) {
    setMapper(next);
    if (!next.nameCol) return;
    const result = parseRosterWithMapping(
      next.rawRows,
      next.nameCol,
      next.companyCol || undefined,
    );
    actions.importRoster(result.people);
    setErrors(result.errors);
  }

  function loadDemo() {
    const demo = makeDemoRoster();
    actions.importRoster(demo);
    setErrors([]);
    setMapper(null);
    if (params) actions.updateParams(suggestParams(demo.length, params));
  }

  function removePerson(id: string) {
    // Removing an attendee invalidates the schedule — treat as fresh import.
    actions.importRoster(roster.filter((p) => p.id !== id));
    if (editingId === id) cancelEdit();
  }

  function startEdit(p: Person) {
    setForm({ name: p.name, company: p.company, email: p.email });
    setEditingId(p.id);
  }

  function cancelEdit() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function submitForm() {
    const name = form.name.trim();
    if (!name) return;
    const company = form.company.trim();
    const email = form.email.trim();
    if (editingId) {
      // Renaming or changing company/email does NOT invalidate the schedule;
      // use updateRoster so keystrokes don't wipe schedule/runState.
      actions.updateRoster(roster.map((p) => (p.id === editingId ? { ...p, name, company, email } : p)));
    } else {
      // Adding an attendee invalidates the schedule — treat as fresh import.
      const person: Person = { id: nanoid(10), name, company, email, rowIndex: -1 };
      actions.importRoster([...roster, person]);
    }
    cancelEdit();
  }

  function applySuggestion() {
    if (!params) return;
    actions.updateParams(suggestParams(roster.length, params));
  }

  // Validation
  const areaCount = params?.areas.length ?? 0;
  const groupSize = params?.groupSize ?? 0;
  const hardErrors: string[] = [];
  const softWarnings: string[] = [];
  if (!params) hardErrors.push('Import a roster to configure parameters.');
  else {
    if (roster.length < groupSize) hardErrors.push(`Need at least ${groupSize} people to form one group.`);
    if (groupSize < 2) hardErrors.push('Group size must be at least 2.');
    if (areaCount < 1) hardErrors.push('At least one area is required.');
    if (params.numRounds < 1) hardErrors.push('At least one round is required.');
    if (params.moveSeconds < 0) hardErrors.push('Move time cannot be negative.');
    if (params.moveSeconds > params.roundSeconds) {
      hardErrors.push(
        `Move time (${params.moveSeconds}s) cannot exceed round total (${params.roundSeconds}s).`,
      );
    }
    for (const b of params.breaks) {
      if (b.afterRound < 1 || b.afterRound >= params.numRounds) {
        hardErrors.push(`Break "${b.label}" must occur between rounds 1 and ${params.numRounds - 1}.`);
      }
    }
    if (
      params.moveSeconds <= params.roundSeconds &&
      params.roundSeconds - params.moveSeconds < 30
    ) {
      softWarnings.push(
        `Only ${params.roundSeconds - params.moveSeconds}s of actual conversation per round — consider a longer round.`,
      );
    }
  }
  if (params && roster.length < areaCount * groupSize) {
    softWarnings.push(
      `Only ${roster.length} people for ${areaCount * groupSize} seats — some groups will be smaller.`,
    );
  }
  if (params && roster.length > areaCount * groupSize && areaCount * groupSize > 0) {
    hardErrors.push(
      `${roster.length} people exceed ${areaCount * groupSize} seats — add areas or reduce roster before generating.`,
    );
  }

  const blocked = hardErrors.length > 0;
  const validations: ValidationDot[] = [
    ...hardErrors.map((text) => ({ color: C.red, text })),
    ...softWarnings.map((text) => ({ color: C.orange, text })),
  ];
  if (validations.length === 0 && params) {
    validations.push({
      color: C.mint,
      text: `Ready — ${areaCount * groupSize} seats / ${roster.length} people.`,
    });
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, p: 1, alignItems: 'stretch', flex: 1 }}>
      <Box sx={{ flex: '1.3 1 340px', bgcolor: C.panel, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 16, color: C.fgTitle }}>Roster</Typography>
          {roster.length > 0 && (
            <Typography sx={{ fontSize: 11, color: C.fgLabel }}>{roster.length} people</Typography>
          )}
          <Box sx={{ flex: 1 }} />
          <Button
            onClick={() => document.getElementById('setup-roster-file-input')?.click()}
            sx={{
              bgcolor: 'transparent', border: `1px solid ${C.stroke3}`, color: C.fgAssist,
              fontSize: 12, '&:hover': { color: C.fg, bgcolor: C.rail },
            }}
          >
            <i className="fa-solid fa-arrow-up-from-bracket" style={{ marginRight: 6, fontSize: 11 }} />
            Import .csv / .xlsx
          </Button>
          <input
            id="setup-roster-file-input"
            hidden
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) handleFile(f);
            }}
          />
        </Box>
        <Divider />

        <Box sx={{
          display: 'flex', flexWrap: 'wrap', gap: 0.75, px: 2, py: 1.25,
          borderBottom: `1px solid ${C.strokeQuiet}`, alignItems: 'center',
        }}>
          <TextField
            placeholder="Name" size="small" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            sx={{ flex: '1.1 1 120px', minWidth: 0 }}
          />
          <TextField
            placeholder="Company" size="small" value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            sx={{ flex: '1 1 100px', minWidth: 0 }}
          />
          <TextField
            placeholder="Email (optional)" size="small" value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            sx={{ flex: '1.3 1 140px', minWidth: 0 }}
          />
          <Button
            onClick={submitForm}
            disabled={!form.name.trim()}
            sx={{
              bgcolor: 'transparent', border: `1px solid ${C.mint}`, color: C.mint, fontSize: 12,
              '&:hover': { bgcolor: C.mintSoft },
              '&.Mui-disabled': { borderColor: C.stroke3, color: C.fgLabel },
            }}
          >
            {editingId ? 'Save' : 'Add'}
          </Button>
          {editingId && (
            <Button onClick={cancelEdit} sx={{ color: C.fgAssist, fontSize: 12, '&:hover': { color: C.fg } }}>
              Cancel
            </Button>
          )}
        </Box>

        {mapper && (
          <Alert severity="info" sx={{ m: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              No &quot;Name&quot; column detected — pick which columns to use:
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: 'wrap' }}>
              <TextField
                select
                size="small"
                label="Name column"
                value={mapper.nameCol}
                onChange={(e) => applyMapping({ ...mapper, nameCol: e.target.value })}
                slotProps={{ select: { native: true } }}
                sx={{ minWidth: 140 }}
              >
                {mapper.detectedColumns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Company column"
                value={mapper.companyCol}
                onChange={(e) => applyMapping({ ...mapper, companyCol: e.target.value })}
                slotProps={{ select: { native: true } }}
                sx={{ minWidth: 140 }}
              >
                <option value="">(none)</option>
                {mapper.detectedColumns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </TextField>
            </Stack>
          </Alert>
        )}
        {errors.length > 0 && (
          <Alert severity="warning" sx={{ m: 2 }}>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {errors.map((e) => <li key={`${e.rowIndex}-${e.reason}`}>{e.message}</li>)}
            </ul>
          </Alert>
        )}

        {roster.length === 0 ? (
          <EmptyRosterDropzone
            onImportClick={() => document.getElementById('setup-roster-file-input')?.click()}
            onDemo={loadDemo}
          />
        ) : (
          <RosterTable roster={roster} editingId={editingId} onEdit={startEdit} onDelete={removePerson} />
        )}
      </Box>

      <Box sx={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <Box sx={{ bgcolor: C.panel2, border: `1px solid ${C.stroke3}`, borderRadius: '2px', p: 2 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
            <i className="fa-solid fa-wand-magic-sparkles" style={{ color: C.mint, fontSize: 12 }} />
            <Typography sx={{ fontSize: 14, color: C.fg }}>Suggested setup</Typography>
          </Stack>
          <Typography sx={{ fontSize: 13, lineHeight: 1.35, color: C.fgAssist, mb: 1.25 }}>
            {params
              ? describeSuggestion(roster.length, params)
              : 'Import a roster to get a suggested layout of areas, rounds, and group size.'}
          </Typography>
          <Button
            onClick={applySuggestion}
            disabled={!params || roster.length === 0}
            sx={{
              bgcolor: 'transparent', border: `1px solid ${C.mint}`, color: C.mint, fontSize: 12,
              '&:hover': { bgcolor: C.mintSoft },
              '&.Mui-disabled': { borderColor: C.stroke3, color: C.fgLabel },
            }}
          >
            Apply suggestion
          </Button>
        </Box>

        <Box sx={{ bgcolor: C.panel, pb: 1.75 }}>
          <Typography sx={{ fontSize: 16, color: C.fgTitle, px: 2, py: 1.5 }}>Parameters</Typography>
          <Divider />
          {params && (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 14px', p: '14px 16px 4px' }}>
                <TextField
                  label="Group size" type="number" size="small" value={params.groupSize}
                  onChange={(e) => actions.updateParams({ groupSize: Math.max(1, Number(e.target.value)) })}
                />
                <TextField
                  label="Areas" type="number" size="small" value={areaCount}
                  onChange={(e) => {
                    const n = Math.max(1, Number(e.target.value));
                    const areas: Area[] = Array.from({ length: n }, (_, i) => {
                      const id = String.fromCharCode(65 + i);
                      const existing = params.areas[i];
                      // Preserve any user-edited label from the existing area at this index;
                      // new indices default to the id letter (A, B, C…).
                      return { id, label: existing?.label ?? id };
                    });
                    actions.updateParams({ areas, numRounds: Math.max(params.numRounds, n) });
                  }}
                />
                <TextField
                  label="Rounds" type="number" size="small" value={params.numRounds}
                  onChange={(e) => actions.updateParams({ numRounds: Math.max(1, Number(e.target.value)) })}
                />
                <TextField
                  label="Round length (sec)" type="number" size="small" value={params.roundSeconds}
                  onChange={(e) => actions.updateParams({ roundSeconds: Math.max(30, Number(e.target.value)) })}
                />
                <TextField
                  label="Move time (sec)" type="number" size="small" value={params.moveSeconds}
                  onChange={(e) => actions.updateParams({ moveSeconds: Number(e.target.value) })}
                />
                <AvoidToggle
                  checked={params.avoidSameCompany}
                  onChange={(v) => actions.updateParams({ avoidSameCompany: v })}
                />
              </Box>

              <Box sx={{ px: 2 }}>
                <AreaLabelsEditor
                  areas={params.areas}
                  onChange={(areas) => actions.updateParams({ areas })}
                />
              </Box>

              <BreakEditor
                breaks={params.breaks}
                onChange={(breaks) => actions.updateParams({ breaks })}
                maxRound={params.numRounds - 1}
              />
            </>
          )}
        </Box>

        {params && (
          <Box sx={{ bgcolor: C.panel, pb: 1.75 }}>
            <IcebreakersEditor
              numRounds={params.numRounds}
              icebreakers={params.icebreakers}
              onChange={(icebreakers) => actions.updateParams({ icebreakers })}
              onFillDefaults={() => actions.updateParams({ icebreakers: defaultIcebreakerList(params.numRounds) })}
              onClear={() => actions.updateParams({ icebreakers: [] })}
            />
          </Box>
        )}

        <Box sx={{ bgcolor: C.panel, p: 2, display: 'flex', flexDirection: 'column', gap: 0.9 }}>
          {validations.map((v, i) => (
            <Stack key={i} direction="row" spacing={1.1} sx={{ alignItems: 'baseline' }}>
              <Box sx={{
                width: 7, height: 7, borderRadius: '999px', bgcolor: v.color,
                flexShrink: 0, position: 'relative', top: '-1px',
              }} />
              <Typography sx={{ fontSize: 12, color: v.color }}>{v.text}</Typography>
            </Stack>
          ))}
        </Box>

        <Button
          fullWidth
          disabled={blocked}
          onClick={() => navigate('/schedule')}
          sx={{
            bgcolor: blocked ? C.panel3 : C.blueDeep, color: blocked ? C.fgLabel : '#fff',
            fontSize: 14, py: 1.5,
            '&:hover': { bgcolor: blocked ? C.panel3 : '#1f74bf' },
            '&.Mui-disabled': { bgcolor: C.panel3, color: C.fgLabel },
          }}
        >
          Generate schedule
          <i className="fa-solid fa-arrow-right" style={{ marginLeft: 6, fontSize: 12 }} />
        </Button>
      </Box>
    </Box>
  );
}

function EmptyRosterDropzone({ onImportClick, onDemo }: {
  onImportClick: () => void; onDemo: () => void;
}) {
  return (
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: '32px 16px' }}>
      <Box sx={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <Box
          onClick={onImportClick}
          sx={{
            border: `1px dashed ${C.stroke2}`, borderRadius: '2px', p: '40px 24px', cursor: 'pointer',
            '&:hover': { borderColor: C.mint, bgcolor: C.rail },
          }}
        >
          <i
            className="fa-solid fa-file-arrow-up"
            style={{ fontSize: 26, color: C.mint, marginBottom: 14, display: 'block' }}
          />
          <Typography sx={{ fontSize: 15, color: C.fg, mb: 0.75 }}>Import your people list</Typography>
          <Typography sx={{ fontSize: 12, color: C.fgAssist, lineHeight: 1.4, mb: 1.5 }}>
            .csv or .xlsx — one row per attendee.<br />
            Columns:{' '}
            <Box component="span" sx={{ color: C.fg }}>Name</Box>
            {' '}(required),{' '}
            <Box component="span" sx={{ color: C.fg }}>Company</Box>
            {' '}and{' '}
            <Box component="span" sx={{ color: C.fg }}>Email</Box>
            {' '}(both optional)
          </Typography>
          <Box
            component="pre"
            sx={{
              display: 'inline-block', bgcolor: C.panel2, border: `1px solid ${C.stroke3}`,
              borderRadius: '2px', p: '7px 12px', fontSize: 11, color: C.fgTitle,
              fontVariantNumeric: 'tabular-nums', textAlign: 'left', fontFamily: 'inherit',
              margin: 0, whiteSpace: 'pre-wrap',
            }}
          >
            {'Name,Company,Email\nAlice Kowalski,Helios Energy,\nMarcus Nguyen,Nordbank,marcus@nordbank.com'}
          </Box>
        </Box>
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', my: 2 }}>
          <Box sx={{ flex: 1, height: '1px', bgcolor: C.strokeQuiet }} />
          <Typography sx={{ fontSize: 11, color: C.fgLabel }}>or</Typography>
          <Box sx={{ flex: 1, height: '1px', bgcolor: C.strokeQuiet }} />
        </Stack>
        <Button
          onClick={onDemo}
          sx={{
            bgcolor: 'transparent', border: `1px solid ${C.stroke3}`, color: C.fgAssist, fontSize: 12,
            '&:hover': { color: C.fg, bgcolor: C.rail },
          }}
        >
          Try with a 40-person demo roster
        </Button>
      </Box>
    </Box>
  );
}

function RosterTable({ roster, editingId, onEdit, onDelete }: {
  roster: Person[]; editingId: string | null; onEdit: (p: Person) => void; onDelete: (id: string) => void;
}) {
  const cols = '40px 1.1fr 1fr 1.3fr 52px';
  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: cols, px: 2, py: 1, fontSize: 11, color: C.fgLabel }}>
        <span>#</span><span>Name</span><span>Company</span><span>Email</span><span />
      </Box>
      <Box sx={{ overflowY: 'auto', maxHeight: 560, flex: 1 }}>
        {roster.map((p, i) => (
          <Box
            key={p.id}
            sx={{
              display: 'grid', gridTemplateColumns: cols, px: 2, py: 0.9, fontSize: 12,
              borderTop: `1px solid ${C.strokeQuiet}`, alignItems: 'center', fontVariantNumeric: 'tabular-nums',
              bgcolor: editingId === p.id ? C.mintSoft : 'transparent', '&:hover': { bgcolor: C.rail },
            }}
          >
            <Box component="span" sx={{ color: C.fgSubtle }}>{i + 1}</Box>
            <Box component="span" sx={{ color: C.fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {p.name}
            </Box>
            <Box component="span" sx={{ color: C.fgAssist, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {p.company}
            </Box>
            <Box component="span" sx={{ color: C.blueSoft, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {p.email}
            </Box>
            <Box sx={{ display: 'flex', gap: 1.25, justifyContent: 'flex-end' }}>
              <IconButton
                size="small" aria-label={`Edit ${p.name}`} onClick={() => onEdit(p)}
                sx={{ color: C.fgLabel, p: 0.25, '&:hover': { color: C.mint } }}
              >
                <i className="fa-solid fa-pen" style={{ fontSize: 11 }} />
              </IconButton>
              <IconButton
                size="small" aria-label={`Delete ${p.name}`} onClick={() => onDelete(p.id)}
                sx={{ color: C.fgLabel, p: 0.25, '&:hover': { color: C.red } }}
              >
                <i className="fa-solid fa-xmark" style={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          </Box>
        ))}
      </Box>
    </>
  );
}

function AvoidToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: C.fgLabel, mb: '5px' }}>Avoid same company</Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Switch
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          size="small"
          slotProps={{ input: { 'aria-label': 'Avoid same-company pairings' } }}
        />
        <Typography sx={{ fontSize: 12, color: checked ? C.mint : C.fgLabel }}>
          {checked ? 'On' : 'Off'}
        </Typography>
      </Stack>
    </Box>
  );
}

function AreaLabelsEditor({ areas, onChange }: {
  areas: Area[]; onChange: (a: Area[]) => void;
}) {
  if (areas.length === 0) return null;
  return (
    <Box sx={{ pb: 1.5 }}>
      <Typography sx={{ fontSize: 12, color: C.fgLabel, mb: 1 }}>Area labels</Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
        {areas.map((a, i) => (
          <TextField
            key={a.id}
            size="small"
            value={a.label}
            slotProps={{ htmlInput: { 'aria-label': `Area ${a.id} label` } }}
            onChange={(e) => {
              const next = areas.slice();
              next[i] = { ...a, label: e.target.value };
              onChange(next);
            }}
            sx={{ width: 64 }}
          />
        ))}
      </Stack>
    </Box>
  );
}

function BreakEditor({ breaks, onChange, maxRound }: {
  breaks: BreakSlot[]; onChange: (b: BreakSlot[]) => void; maxRound: number;
}) {
  return (
    <Box sx={{ px: 2, pt: 1.25 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
        <Typography sx={{ fontSize: 12, color: C.fgLabel }}>Breaks</Typography>
        <Box sx={{ flex: 1, height: '1px', bgcolor: C.strokeQuiet }} />
        <Button
          onClick={() => onChange([...breaks, { afterRound: Math.max(1, maxRound), seconds: 600, label: `Break ${breaks.length + 1}` }])}
          disabled={maxRound < 1}
          sx={{
            bgcolor: 'transparent', border: `1px solid ${C.stroke3}`, color: C.fgAssist, fontSize: 11,
            px: 1.25, py: 0.5, '&:hover': { color: C.fg },
          }}
        >
          + Add break
        </Button>
      </Stack>
      <Stack spacing={0.75}>
        {breaks.map((b, i) => (
          <Stack
            key={i} direction="row" spacing={1}
            sx={{ alignItems: 'center', border: `1px solid ${C.stroke4}`, borderRadius: '2px', p: 1 }}
          >
            <i className="fa-solid fa-mug-hot" style={{ color: C.blueSoft, fontSize: 11 }} />
            <TextField size="small" label="After round" type="number" value={b.afterRound}
              onChange={(e) => {
                const next = [...breaks];
                next[i] = { ...next[i], afterRound: Number(e.target.value) };
                onChange(next);
              }} sx={{ width: 110 }} />
            <TextField size="small" label="Seconds" type="number" value={b.seconds}
              onChange={(e) => {
                const next = [...breaks];
                next[i] = { ...next[i], seconds: Number(e.target.value) };
                onChange(next);
              }} sx={{ width: 110 }} />
            <TextField size="small" label="Label" value={b.label}
              onChange={(e) => {
                const next = [...breaks];
                next[i] = { ...next[i], label: e.target.value };
                onChange(next);
              }} />
            <Box sx={{ flex: 1 }} />
            <IconButton
              size="small" aria-label={`Remove ${b.label}`}
              onClick={() => onChange(breaks.filter((_, j) => j !== i))}
              sx={{ color: C.fgLabel, '&:hover': { color: C.red } }}
            >
              <i className="fa-solid fa-xmark" style={{ fontSize: 12 }} />
            </IconButton>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

function IcebreakersEditor({
  numRounds, icebreakers, onChange, onFillDefaults, onClear,
}: {
  numRounds: number;
  icebreakers?: (string | null)[];
  onChange: (list: (string | null)[]) => void;
  onFillDefaults: () => void;
  onClear: () => void;
}) {
  const rows = Array.from({ length: Math.max(1, numRounds) }, (_, i) => ({
    num: String(i + 1).padStart(2, '0'),
    value: icebreakers?.[i] ?? '',
    index: i,
  }));

  function setAt(index: number, raw: string) {
    const list = (icebreakers ?? []).slice();
    while (list.length < numRounds) list.push('');
    list[index] = raw;
    onChange(list);
  }

  return (
    <Box sx={{ pt: 1.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 2, py: 1.5, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 16, color: C.fgTitle }}>Icebreakers</Typography>
        <Typography sx={{ fontSize: 11, color: C.fgLabel }}>optional — shown on the big screen each round</Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={onFillDefaults}
          sx={{
            bgcolor: 'transparent', border: `1px solid ${C.stroke3}`, color: C.fgMuted,
            px: 1.25, py: 0.5, fontSize: 11, '&:hover': { color: C.fg },
          }}
        >
          Fill defaults
        </Button>
        <Button
          onClick={onClear}
          sx={{
            bgcolor: 'transparent', border: `1px solid ${C.stroke3}`, color: C.fgMuted,
            px: 1.25, py: 0.5, fontSize: 11, '&:hover': { color: C.fg },
          }}
        >
          Clear
        </Button>
      </Stack>
      <Divider />
      <Stack spacing={0.75} sx={{ px: 2, pt: 1.5, maxHeight: 280, overflowY: 'auto' }}>
        {rows.map((row) => (
          <Stack key={row.index} direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Typography sx={{
              fontSize: 11, color: C.fgLabel, fontVariantNumeric: 'tabular-nums',
              width: 20, flex: 'none',
            }}>
              {row.num}
            </Typography>
            <TextField
              size="small"
              fullWidth
              value={row.value}
              placeholder="Leave blank for no prompt this round"
              slotProps={{ htmlInput: { 'aria-label': `Icebreaker round ${row.index + 1}` } }}
              onChange={(e) => setAt(row.index, e.target.value)}
            />
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}
