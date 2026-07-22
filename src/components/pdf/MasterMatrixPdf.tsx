import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { EventParams, Person, Schedule } from '../../domain/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: 'Helvetica' },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 12 },
  row: { flexDirection: 'row' },
  cell: { borderWidth: 0.5, borderColor: '#999', padding: 4, flexGrow: 1, flexBasis: 0 },
  head: { backgroundColor: '#f0f0f0', fontWeight: 700 },
});

export function MasterMatrixPdf({
  roster, params, schedule,
}: { roster: Person[]; params: EventParams; schedule: Schedule }) {
  const nameById = new Map(roster.map((p) => [p.id, p.name]));
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>Master schedule</Text>
        <View style={styles.row}>
          <View style={[styles.cell, styles.head]}><Text>Round</Text></View>
          {params.areas.map((a) => (
            <View key={a.id} style={[styles.cell, styles.head]}><Text>{a.label}</Text></View>
          ))}
        </View>
        {schedule.rounds.map((round) => (
          <View key={round.index} style={styles.row}>
            <View style={[styles.cell, styles.head]}><Text>{round.index + 1}</Text></View>
            {round.groups.map((g) => (
              <View key={g.areaId} style={styles.cell}>
                <Text>{g.memberIds.map((id) => nameById.get(id) ?? id).join(', ')}</Text>
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
