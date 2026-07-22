import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Drawer, IconButton, LinearProgress, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';
import { useEvent } from '../state/EventContext';
import { generateSchedule } from '../domain/scheduler';
import type { Schedule } from '../domain/types';
import { C } from '../styles/colors';

type ViewMode = 'round' | 'person';
type PendingAction = 'set' | 'add';

interface DrawerTarget {
  round: number;
  areaId: string;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function SchedulePage() {
  const { state, actions } = useEvent();
  const navigate = useNavigate();
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 100000));
  const [generating, setGenerating] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [view, setView] = useState<ViewMode>('round');
  const [personSlider, setPersonSlider] = useState(0);
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);

  // When "generating" flips to true, schedule the actual (blocking) work on the
  // next macrotask so React can paint the LinearProgress first.
  useEffect(() => {
    if (!pendingAction || !state) return;
    const handle = setTimeout(() => {
      const s = generateSchedule(
        state.roster,
        state.params,
        { seed, timeBudgetMs: 2000, restarts: 6 },
      );
      if (pendingAction === 'set') actions.setSchedule(s);
      else actions.addPlan(s);
      setGenerating(false);
      setPendingAction(null);
    }, 0);
    return () => clearTimeout(handle);
  }, [pendingAction, state, seed, actions]);

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
      <Box sx={{ p: 4 }}>
        <Alert severity="info">Import a roster on the Setup page first.</Alert>
      </Box>
    );
  }

  const plans = state.plans ?? (state.schedule ? [state.schedule] : []);
  const activeIdx = state.planIdx ?? Math.max(0, plans.length - 1);
  const schedule = state.schedule;

  function generate() {
    setSeed(Math.floor(Math.random() * 100000));
    setGenerating(true);
    setPendingAction(plans.length > 0 ? 'add' : 'set');
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1, flex: 1, minWidth: 0 }}>
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center',
        bgcolor: C.panel, px: 2, py: 1.25,
      }}>
        <Typography sx={{ fontSize: 11, color: C.fgLabel, mr: 0.5 }}>PLANS</Typography>
        {plans.map((pl, i) => {
          const active = i === activeIdx;
          return (
            <Box
              key={i}
              onClick={() => actions.selectPlan(i)}
              sx={{
                cursor: 'pointer', px: 1.5, py: 0.9, border: '1px solid',
                borderColor: active ? C.acc : C.stroke3, borderRadius: '2px',
                display: 'flex', gap: 1.25, alignItems: 'baseline',
                '&:hover': { bgcolor: C.rail },
              }}
            >
              <Typography sx={{ fontSize: 13, color: active ? C.fg : C.fgMuted }}>
                Plan {i + 1}
              </Typography>
              <Typography sx={{
                fontSize: 11, fontVariantNumeric: 'tabular-nums',
                color: pl.quality.repeatedPairs === 0 ? C.mint : C.orange,
              }}>
                {pl.quality.repeatedPairs} rpt · {pl.quality.sameCompanyPairs} same-co
              </Typography>
            </Box>
          );
        })}
        <Button
          onClick={generate}
          disabled={generating}
          sx={{
            bgcolor: 'transparent', border: `1px solid ${C.stroke3}`, color: C.fgMuted,
            px: 1.5, py: 0.9, fontSize: 12, borderRadius: '2px',
            '&:hover': { color: C.fg, bgcolor: C.rail },
            '&.Mui-disabled': { opacity: 0.6, color: C.fgLabel },
          }}
        >
          {generating ? 'Generating…' : plans.length === 0 ? 'Generate schedule' : '+ New plan'}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 11, color: C.fgLabel, fontVariantNumeric: 'tabular-nums' }}>
          {schedule ? `seed ${schedule.seed} · optimised in-browser` : ''}
        </Typography>
      </Box>

      {generating && <LinearProgress aria-label="Generating schedule" />}

      {schedule && (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <QualityCard schedule={schedule} avoidSameCompany={state.params.avoidSameCompany} rosterSize={state.roster.length} />
            <NeverMetExplorer
              schedule={schedule}
              roster={state.roster}
              personSlider={personSlider}
              onPersonSlider={setPersonSlider}
            />
          </Box>

          <Box sx={{ bgcolor: C.panel, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25, px: 2, py: 1.5 }}>
              <Typography sx={{ fontSize: 16, color: C.fgTitle }}>
                {view === 'round' ? 'Rounds × Areas' : 'People × Rounds'}
              </Typography>
              <Box sx={{ display: 'flex', border: `1px solid ${C.stroke3}`, borderRadius: '2px', overflow: 'hidden' }}>
                <Button
                  onClick={() => setView('round')}
                  sx={{
                    px: 1.5, py: 0.75, fontSize: 12, borderRadius: 0,
                    color: view === 'round' ? C.fg : C.fgMuted,
                    bgcolor: view === 'round' ? C.panel2 : 'transparent',
                    '&:hover': { bgcolor: view === 'round' ? C.panel2 : C.rail },
                  }}
                >
                  Rounds × Areas
                </Button>
                <Button
                  onClick={() => setView('person')}
                  sx={{
                    px: 1.5, py: 0.75, fontSize: 12, borderRadius: 0,
                    borderLeft: `1px solid ${C.stroke3}`,
                    color: view === 'person' ? C.fg : C.fgMuted,
                    bgcolor: view === 'person' ? C.panel2 : 'transparent',
                    '&:hover': { bgcolor: view === 'person' ? C.panel2 : C.rail },
                  }}
                >
                  People × Rounds
                </Button>
              </Box>
              <Box sx={{ flex: 1 }} />
              <Button
                onClick={() => navigate('/print')}
                sx={{
                  bgcolor: C.blueDeep, color: '#fff', px: 2, py: 1.1, fontSize: 13,
                  '&:hover': { filter: 'brightness(1.15)', bgcolor: C.blueDeep },
                }}
              >
                Print materials <i className="fa-solid fa-arrow-right" style={{ marginLeft: 5, fontSize: 11 }} />
              </Button>
            </Box>

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
                groupSize={state.params.groupSize}
              />
            )}
          </Box>
        </>
      )}

      <Drawer anchor="right" open={drawer !== null} onClose={() => setDrawer(null)}>
        <Box sx={{ width: 320, p: 2, bgcolor: C.panel, height: '100%' }} role="presentation" data-testid="cell-drawer">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontSize: 16, color: C.fgTitle }}>
              {drawerGroup
                ? `Round ${drawerGroup.round.index + 1} — Area ${drawerGroup.area?.label ?? drawerGroup.group.areaId}`
                : ''}
            </Typography>
            <IconButton aria-label="Close" onClick={() => setDrawer(null)} sx={{ color: C.fgMuted }}>
              <CloseIcon />
            </IconButton>
          </Box>
          {drawerGroup && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {drawerGroup.group.memberIds.map((id) => {
                const name = nameById.get(id) ?? id;
                const company = companyById.get(id) ?? '';
                return (
                  <Box
                    key={id}
                    sx={{
                      display: 'inline-block', whiteSpace: 'nowrap', border: `1px solid ${C.stroke3}`,
                      borderRadius: '2px', px: 1, py: 0.5, fontSize: 12, color: C.fgMuted,
                    }}
                  >
                    {name}{company ? <Box component="span" sx={{ color: C.fgLabel }}> · {company}</Box> : null}
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}

interface QualityCardProps {
  schedule: Schedule;
  avoidSameCompany: boolean;
  rosterSize: number;
}

function QualityCard({ schedule, avoidSameCompany, rosterSize }: QualityCardProps) {
  const q = schedule.quality;
  const avgNew = mean(q.perPerson.map((p) => p.metIds.length));
  const stats: { k: string; v: string; color: string; sub: string }[] = [
    { k: 'MEETINGS', v: String(q.totalPairs), color: C.fg, sub: 'total meetings' },
    { k: 'UNIQUE PAIRS', v: String(q.uniquePairs), color: C.fg, sub: `of ${q.totalPairs} meetings` },
    {
      k: 'REPEATS', v: String(q.repeatedPairs), color: q.repeatedPairs === 0 ? C.mint : C.red,
      sub: q.repeatedPairs === 0 ? 'perfect' : 'to review',
    },
    {
      k: 'SAME COMPANY', v: String(q.sameCompanyPairs), color: q.sameCompanyPairs === 0 ? C.mint : C.fgMuted,
      sub: avoidSameCompany ? 'minimised' : 'not avoided',
    },
    { k: 'AVG NEW PEOPLE', v: avgNew.toFixed(1), color: C.mint, sub: `of ${Math.max(0, rosterSize - 1)} possible` },
  ];

  return (
    <Box sx={{ flex: '1.1 1 300px', bgcolor: C.panel, minWidth: 0 }}>
      <Typography sx={{ px: 2, py: 1.5, fontSize: 16, color: C.fgTitle }}>Schedule quality</Typography>
      <Box sx={{ height: '1px', bgcolor: C.stroke2 }} />
      <Box sx={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        borderBottom: `1px solid ${C.strokeQuiet}`,
      }}>
        {stats.map((st, i) => (
          <Box key={i} sx={{ px: 2, py: 1.75, borderLeft: `1px solid ${C.strokeQuiet}`, ml: '-1px' }}>
            <Typography sx={{ fontSize: 11, color: C.fgLabel, mb: 0.9 }}>{st.k}</Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 700, color: st.color, fontVariantNumeric: 'tabular-nums' }}>
              {st.v}
            </Typography>
            <Typography sx={{ fontSize: 11, color: C.fgSubtle, mt: 0.6 }}>{st.sub}</Typography>
          </Box>
        ))}
      </Box>
      <Typography sx={{ px: 2, py: 1.5, fontSize: 12, color: C.fgMuted, lineHeight: 1.35 }}>
        Seed {schedule.seed}. Every person&apos;s plan is below — slide through the roster to see exactly who
        each person will not get to meet, worst cases first.
      </Typography>
    </Box>
  );
}

interface NeverMetExplorerProps {
  schedule: Schedule;
  roster: { id: string; name: string; company: string }[];
  personSlider: number;
  onPersonSlider(v: number): void;
}

function NeverMetExplorer({ schedule, roster, personSlider, onPersonSlider }: NeverMetExplorerProps) {
  const neverMetById = new Map(schedule.quality.perPerson.map((p) => [p.id, p]));
  const sorted = useMemo(
    () => roster.slice().sort((a, b) => {
      const an = neverMetById.get(a.id)?.neverMetIds.length ?? 0;
      const bn = neverMetById.get(b.id)?.neverMetIds.length ?? 0;
      return bn - an;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roster, schedule],
  );
  const idx = Math.min(personSlider, Math.max(0, sorted.length - 1));
  const sel = sorted[idx];
  const selQuality = sel ? neverMetById.get(sel.id) : undefined;
  const companyById = new Map(roster.map((p) => [p.id, p.company]));

  return (
    <Box sx={{ flex: '1 1 300px', bgcolor: C.panel, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, px: 2, py: 1.5 }}>
        <Typography sx={{ fontSize: 16, color: C.fgTitle }}>Never-met explorer</Typography>
        <Typography sx={{ fontSize: 11, color: C.fgLabel }}>sorted worst-first</Typography>
      </Box>
      <Box sx={{ height: '1px', bgcolor: C.stroke2 }} />
      <Box sx={{ px: 2, py: 1.75 }}>
        <input
          type="range"
          min={0}
          max={Math.max(0, sorted.length - 1)}
          value={idx}
          onChange={(e) => onPersonSlider(Number(e.target.value))}
          aria-label="Never-met explorer person slider"
          style={{ width: '100%', accentColor: C.mint }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.fgLabel, mt: 0.25 }}>
          <span>most unmet</span><span>fewest unmet</span>
        </Box>
      </Box>
      <Box sx={{ mx: 2, mb: 1.75, bgcolor: C.panel2, border: `1px solid ${C.stroke3}`, borderRadius: '2px', p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.25, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 16, color: C.fg }}>{sel?.name ?? '–'}</Typography>
          <Typography sx={{ fontSize: 12, color: C.fgMuted }}>{sel?.company ?? ''}</Typography>
          <Box sx={{ flex: 1 }} />
          <Typography sx={{ fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
            <Box component="span" sx={{ color: C.mint }}>{selQuality?.metIds.length ?? 0} met</Box>
            <Box component="span" sx={{ color: C.fgLabel }}> · </Box>
            <Box component="span" sx={{ color: C.orange }}>{selQuality?.neverMetIds.length ?? 0} never</Box>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, mt: 1.25 }}>
          {(selQuality?.neverMetIds ?? []).map((id) => {
            const p = roster.find((r) => r.id === id);
            return (
              <Box
                key={id}
                sx={{
                  display: 'inline-block', whiteSpace: 'nowrap', border: `1px solid ${C.stroke3}`,
                  borderRadius: '2px', px: 1, py: 0.4, fontSize: 11, color: C.fgMuted,
                }}
              >
                {p?.name ?? id} <Box component="span" sx={{ color: C.fgLabel }}>· {companyById.get(id) ?? '–'}</Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

interface RoundViewProps {
  schedule: Schedule;
  areas: { id: string; label: string }[];
  nameById: Map<string, string>;
  onCellClick(round: number, areaId: string): void;
}

function RoundView({ schedule, areas, nameById, onCellClick }: RoundViewProps) {
  const cols = `52px repeat(${areas.length}, minmax(108px, 1fr))`;
  const minWidth = Math.max(400, 52 + areas.length * 112);
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ minWidth }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: cols, borderBottom: `1px solid ${C.acc}` }}>
          <Typography sx={{ px: 1.25, py: 1, fontSize: 11, color: C.fgLabel }}>RND</Typography>
          {areas.map((a) => (
            <Typography key={a.id} sx={{ px: 1.25, py: 1, fontSize: 12, color: C.fgTitle }}>
              Area {a.label}
            </Typography>
          ))}
        </Box>
        {schedule.rounds.map((r, i) => (
          <Box
            key={r.index}
            sx={{
              display: 'grid', gridTemplateColumns: cols, borderBottom: `1px solid ${C.strokeQuiet}`,
              '&:hover': { bgcolor: C.rail },
            }}
          >
            <Typography sx={{
              px: 1.25, py: 1.1, fontSize: 12, color: C.fgSubtle, fontVariantNumeric: 'tabular-nums',
            }}>
              {pad2(i + 1)}
            </Typography>
            {areas.map((a) => {
              const g = r.groups.find((grp) => grp.areaId === a.id);
              return (
                <Box
                  key={a.id}
                  onClick={() => g && onCellClick(r.index, a.id)}
                  role={g ? 'button' : undefined}
                  tabIndex={g ? 0 : undefined}
                  aria-label={g ? `Round ${i + 1} Area ${a.label}` : undefined}
                  sx={{
                    px: 1.25, py: 1, borderLeft: `1px solid ${C.strokeQuiet}`,
                    cursor: g ? 'pointer' : 'default',
                  }}
                >
                  {(g?.memberIds ?? []).map((id) => (
                    <Typography
                      key={id}
                      sx={{
                        fontSize: 11, color: C.fg, lineHeight: 1.45, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}
                    >
                      {nameById.get(id) ?? id}
                    </Typography>
                  ))}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

interface PersonViewProps {
  schedule: Schedule;
  roster: { id: string; name: string; company: string }[];
  areas: { id: string; label: string }[];
  groupSize: number;
}

function PersonView({ schedule, roster, areas, groupSize }: PersonViewProps) {
  const N = roster.length;
  const R = schedule.rounds.length;
  const areaLabelById = new Map(areas.map((a) => [a.id, a.label]));

  const areaByRoundById = useMemo(() => {
    const map = new Map<string, (string | undefined)[]>();
    for (const person of roster) map.set(person.id, new Array<string | undefined>(R).fill(undefined));
    schedule.rounds.forEach((round, r) => {
      for (const g of round.groups) {
        for (const id of g.memberIds) {
          map.get(id)![r] = g.areaId;
        }
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, roster]);

  const neverMetCountById = new Map(
    schedule.quality.perPerson.map((p) => [p.id, p.neverMetIds.length]),
  );
  const minNever = Math.max(0, N - 1 - R * (groupSize - 1));
  const cols = `170px repeat(${R}, 44px) 90px`;

  return (
    <Box sx={{ overflowX: 'auto' }} data-testid="person-view">
      <Box sx={{ minWidth: 760 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: cols, borderBottom: `1px solid ${C.acc}` }}>
          <Typography sx={{ px: 1.5, py: 1, fontSize: 11, color: C.fgLabel }}>PERSON</Typography>
          {schedule.rounds.map((r, i) => (
            <Typography key={r.index} sx={{
              px: 0.75, py: 1, fontSize: 11, color: C.fgTitle, textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}>
              R{i + 1}
            </Typography>
          ))}
          <Typography sx={{ px: 1.25, py: 1, fontSize: 11, color: C.fgLabel, textAlign: 'right' }}>
            NEVER MET
          </Typography>
        </Box>
        {roster.map((person) => {
          const cells = areaByRoundById.get(person.id) ?? [];
          const never = neverMetCountById.get(person.id) ?? 0;
          const neverColor = never <= minNever ? C.mint : never > minNever + 3 ? C.orange : C.fgMuted;
          return (
            <Box
              key={person.id}
              sx={{
                display: 'grid', gridTemplateColumns: cols, borderBottom: `1px solid ${C.strokeQuiet}`,
                alignItems: 'center', '&:hover': { bgcolor: C.rail },
              }}
            >
              <Box sx={{
                px: 1.5, py: 0.9, display: 'flex', gap: 0.6, alignItems: 'baseline', whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                <Typography component="span" sx={{ fontSize: 12, color: C.fg }}>{person.name}</Typography>
                <Typography component="span" sx={{ color: C.fgLabel, fontSize: 11 }}>{person.company}</Typography>
              </Box>
              {cells.map((areaId, i) => (
                <Typography key={i} sx={{
                  textAlign: 'center', fontSize: 12, color: C.fgMuted, fontVariantNumeric: 'tabular-nums',
                }}>
                  {areaId ? (areaLabelById.get(areaId) ?? areaId) : '–'}
                </Typography>
              ))}
              <Typography sx={{
                px: 1.25, py: 0.9, textAlign: 'right', fontSize: 12, color: neverColor,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {never}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
