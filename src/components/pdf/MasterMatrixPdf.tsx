import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Area, EventParams, Person, Round, Schedule } from '../../domain/types';

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: 'Helvetica' },
  title: { fontSize: 14, fontWeight: 700, marginBottom: 12 },
  row: { flexDirection: 'row' },
  cell: { borderWidth: 0.5, borderColor: '#999', padding: 4, flexGrow: 1, flexBasis: 0 },
  head: { backgroundColor: '#f0f0f0', fontWeight: 700 },
});

/** Landscape A4 leaves limited vertical room once title + header are drawn. */
const ROUNDS_PER_PAGE = 7;

function chunkRounds(rounds: Round[], size: number): Round[][] {
  if (rounds.length === 0) return [[]];
  const pages: Round[][] = [];
  for (let i = 0; i < rounds.length; i += size) {
    pages.push(rounds.slice(i, i + size));
  }
  return pages;
}

function HeaderRow({ areas }: { areas: Area[] }) {
  return (
    <View style={styles.row} wrap={false}>
      <View style={[styles.cell, styles.head]}><Text>Round</Text></View>
      {areas.map((a) => (
        <View key={a.id} style={[styles.cell, styles.head]}><Text>{a.label}</Text></View>
      ))}
    </View>
  );
}

function RoundRow({
  round,
  nameById,
}: {
  round: Round;
  nameById: Map<string, string>;
}) {
  return (
    <View style={styles.row} wrap={false}>
      <View style={[styles.cell, styles.head]}><Text>{round.index + 1}</Text></View>
      {round.groups.map((g) => (
        <View key={g.areaId} style={styles.cell}>
          <Text>{g.memberIds.map((id) => nameById.get(id) ?? id).join(', ')}</Text>
        </View>
      ))}
    </View>
  );
}

export function MasterMatrixPdf({
  roster, params, schedule,
}: { roster: Person[]; params: EventParams; schedule: Schedule }) {
  const nameById = new Map(roster.map((p) => [p.id, p.name]));
  const pages = chunkRounds(schedule.rounds, ROUNDS_PER_PAGE);

  return (
    <Document>
      {pages.map((rounds, pageIdx) => (
        <Page key={pageIdx} size="A4" orientation="landscape" style={styles.page}>
          <Text style={styles.title}>
            Master schedule{pages.length > 1 ? ` (${pageIdx + 1}/${pages.length})` : ''}
          </Text>
          <HeaderRow areas={params.areas} />
          {rounds.map((round) => (
            <RoundRow key={round.index} round={round} nameById={nameById} />
          ))}
        </Page>
      ))}
    </Document>
  );
}
