import { Box, Paper, Stack, Typography } from '@mui/material';
import { C } from '../styles/colors';
import type { EventParams, Person, Round, RunPhase } from '../domain/types';

interface Props {
  roster: Person[];
  params: EventParams;
  round: Round;
  phase: RunPhase;
  /** When set, arrows show each person's next area (used during `move`). */
  nextRound?: Round;
  /** Highlight a single person by id — "where's Bob?" */
  highlightPersonId?: string;
  /** Highlight every member whose name matches this query (case-insensitive). */
  searchQuery?: string;
  /** Pulse non-highlighted cards while people are moving. Defaults to `phase === 'move'`. */
  pulseOnMove?: boolean;
  /** When set, a faint "next: ..." line previews the next round's members per area. */
  ghostRound?: Round;
}

export function AreaGrid({
  roster, params, round, phase, nextRound, highlightPersonId, searchQuery, pulseOnMove, ghostRound,
}: Props) {
  const personById = new Map(roster.map((p) => [p.id, p]));
  const nextAreaByPerson = new Map<string, string>();
  if (nextRound) {
    for (const g of nextRound.groups) {
      const label = params.areas.find((a) => a.id === g.areaId)?.label ?? '';
      for (const id of g.memberIds) nextAreaByPerson.set(id, label);
    }
  }
  const ghostNamesByArea = new Map<string, string[]>();
  if (ghostRound) {
    for (const g of ghostRound.groups) {
      ghostNamesByArea.set(g.areaId, g.memberIds.map((id) => personById.get(id)?.name.split(' ')[0] ?? id));
    }
  }
  const query = searchQuery?.trim().toLowerCase();
  const shouldPulse = pulseOnMove ?? phase === 'move';

  return (
    <Box sx={{
      display: 'grid',
      gap: 2,
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
    }}>
      {round.groups.map((g) => {
        const areaLabel = params.areas.find((a) => a.id === g.areaId)?.label ?? g.areaId;
        const areaHasMatch = g.memberIds.some((id) => {
          const person = personById.get(id);
          return !!query && !!person && person.name.toLowerCase().includes(query);
        });
        return (
          <Paper
            key={g.areaId}
            sx={{
              p: 2,
              minHeight: 160,
              bgcolor: C.panel,
              borderWidth: 1,
              borderStyle: 'solid',
              borderColor:
                areaHasMatch ? C.acc
                : phase === 'move' ? C.orange
                : phase === 'break' ? C.stroke1
                : C.stroke2,
              borderRadius: C.radius,
              opacity: phase === 'break' ? 0.4 : 1,
              animation: shouldPulse && !areaHasMatch ? 'snsGlow 1.6s infinite' : 'none',
              transition: 'border-color 200ms',
            }}
          >
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 700, color: areaHasMatch ? C.acc : C.fg }}>
              {areaLabel}
            </Typography>
            <Stack spacing={0.5}>
              {g.memberIds.map((id) => {
                const person = personById.get(id);
                if (!person) return null;
                const nextArea = nextAreaByPerson.get(id);
                const isMatch = highlightPersonId === id
                  || (!!query && person.name.toLowerCase().includes(query));
                return (
                  <Box
                    key={id}
                    sx={{
                      display: 'flex', alignItems: 'baseline', gap: 0.75, py: 0.4,
                      borderTop: `1px solid ${C.stroke1}`,
                      '&:first-of-type': { borderTop: 'none' },
                    }}
                  >
                    <Typography component="span" sx={{ fontWeight: 600, color: isMatch ? C.acc : C.fg }}>
                      {person.name}
                    </Typography>
                    {person.company && (
                      <Typography component="span" variant="caption" sx={{ color: C.fgLabel }}>
                        {person.company}
                      </Typography>
                    )}
                    {phase === 'move' && nextArea && (
                      <Typography component="span" variant="caption" sx={{ ml: 'auto', color: C.orange, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                        → {nextArea}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
            {(() => {
              const ghostNames = ghostNamesByArea.get(g.areaId);
              return ghostNames && ghostNames.length > 0 ? (
                <Typography sx={{ fontSize: 11, color: C.fgLabel, mt: 0.75, opacity: 0.75 }}>
                  next: {ghostNames.join(', ')}
                </Typography>
              ) : null;
            })()}
          </Paper>
        );
      })}
    </Box>
  );
}
