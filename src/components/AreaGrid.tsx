import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import type { EventParams, Person, Round, RunPhase } from '../domain/types';

interface Props {
  roster: Person[];
  params: EventParams;
  round: Round;
  phase: RunPhase;
  nextRound?: Round;                  // when set, arrows show each person's next area
  highlightPersonId?: string;         // "where's Bob?"
}

export function AreaGrid({ roster, params, round, phase, nextRound, highlightPersonId }: Props) {
  const personById = new Map(roster.map((p) => [p.id, p]));
  const nextAreaByPerson = new Map<string, string>();
  if (nextRound) {
    for (const g of nextRound.groups) {
      const label = params.areas.find((a) => a.id === g.areaId)?.label ?? '';
      for (const id of g.memberIds) nextAreaByPerson.set(id, label);
    }
  }

  return (
    <Box sx={{
      display: 'grid',
      gap: 2,
      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(5, 1fr)' },
    }}>
      {round.groups.map((g) => {
        const areaLabel = params.areas.find((a) => a.id === g.areaId)?.label ?? g.areaId;
        return (
          <Paper key={g.areaId}
            sx={{
              p: 2,
              minHeight: 160,
              borderWidth: 2,
              borderStyle: 'solid',
              borderColor:
                phase === 'move' ? 'warning.main'
                : phase === 'break' ? 'grey.300'
                : 'primary.light',
              opacity: phase === 'break' ? 0.4 : 1,
              transition: 'border-color 200ms',
            }}>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: 700 }}>{areaLabel}</Typography>
            <Stack spacing={0.5}>
              {g.memberIds.map((id) => {
                const person = personById.get(id);
                if (!person) return null;
                const nextArea = nextAreaByPerson.get(id);
                const highlight = highlightPersonId === id;
                return (
                  <Chip
                    key={id}
                    color={highlight ? 'primary' : 'default'}
                    label={
                      <Box>
                        <Typography component="span" sx={{ fontWeight: 600 }}>{person.name}</Typography>
                        {person.company && (
                          <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                            {person.company}
                          </Typography>
                        )}
                        {phase === 'move' && nextArea && (
                          <Typography component="span" variant="caption" sx={{ ml: 1, color: 'warning.dark', fontWeight: 700 }}>
                            → {nextArea}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                );
              })}
            </Stack>
          </Paper>
        );
      })}
    </Box>
  );
}
