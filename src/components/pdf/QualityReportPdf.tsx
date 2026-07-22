import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Person, Schedule } from '../../domain/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 8 },
  summary: { marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { width: 160 },
  personRow: { flexDirection: 'row', paddingVertical: 2, borderBottomWidth: 0.5, borderColor: '#eee' },
  name: { width: 120 },
});

export function QualityReportPdf({
  roster, schedule,
}: { roster: Person[]; schedule: Schedule }) {
  const nameById = new Map(roster.map((p) => [p.id, p.name]));
  const q = schedule.quality;
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Schedule quality report</Text>
        <View style={styles.summary}>
          <View style={styles.row}><Text style={styles.label}>Total meetings</Text><Text>{q.totalPairs}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Unique pairs</Text><Text>{q.uniquePairs}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Repeated pairs</Text><Text>{q.repeatedPairs}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Same-company pairs</Text><Text>{q.sameCompanyPairs}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Seed</Text><Text>{schedule.seed}</Text></View>
        </View>
        <Text style={styles.title}>Per person</Text>
        {q.perPerson.map((row) => (
          <View key={row.id} style={styles.personRow}>
            <Text style={styles.name}>{nameById.get(row.id) ?? row.id}</Text>
            <Text>Met {row.metIds.length}; Never met {row.neverMetIds.length}; Repeats {row.repeatMeetings}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}
