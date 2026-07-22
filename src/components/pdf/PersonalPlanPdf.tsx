import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { EventParams, Person, Schedule } from '../../domain/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: 'Helvetica' },
  header: { fontSize: 14, marginBottom: 4, fontWeight: 700 },
  sub: { fontSize: 10, marginBottom: 12, color: '#555' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '48%',
    marginBottom: 8,
    marginHorizontal: '1%',
    padding: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#666',
  },
  cellHead: { fontSize: 11, fontWeight: 700, marginBottom: 4 },
  cellArea: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
  cellMeet: { fontSize: 9, color: '#333' },
});

export function PersonalPlanPdf({
  roster, params, schedule,
}: { roster: Person[]; params: EventParams; schedule: Schedule }) {
  const nameById = new Map(roster.map((p) => [p.id, p.name]));

  return (
    <Document>
      {roster.map((person) => {
        // For each round, find where this person is and who they're with.
        const per = schedule.rounds.map((round) => {
          const group = round.groups.find((g) => g.memberIds.includes(person.id));
          const others = group?.memberIds.filter((id) => id !== person.id) ?? [];
          return {
            roundNum: round.index + 1,
            areaLabel: params.areas.find((a) => a.id === group?.areaId)?.label ?? '—',
            others: others.map((id) => nameById.get(id) ?? id),
          };
        });

        return (
          <Page key={person.id} size="A4" style={styles.page}>
            <Text style={styles.header}>{person.name}{person.company ? ` — ${person.company}` : ''}</Text>
            <Text style={styles.sub}>Your speed-networking plan. Tear off one tag per round.</Text>
            <View style={styles.grid}>
              {per.map((slot) => (
                <View key={slot.roundNum} style={styles.cell}>
                  <Text style={styles.cellHead}>Round {slot.roundNum}</Text>
                  <Text style={styles.cellArea}>Area {slot.areaLabel}</Text>
                  <Text style={styles.cellMeet}>Meet: {slot.others.join(', ') || '—'}</Text>
                </View>
              ))}
            </View>
          </Page>
        );
      })}
    </Document>
  );
}
