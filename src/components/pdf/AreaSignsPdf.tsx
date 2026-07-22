import { Document, Page, StyleSheet, Text } from '@react-pdf/renderer';
import type { Area } from '../../domain/types';

const styles = StyleSheet.create({
  page: { padding: 24, justifyContent: 'center', alignItems: 'center' },
  letter: { fontSize: 400, fontWeight: 700 },
});

export function AreaSignsPdf({ areas }: { areas: Area[] }) {
  return (
    <Document>
      {areas.map((a) => (
        <Page key={a.id} size="A4" style={styles.page}>
          <Text style={styles.letter}>{a.label}</Text>
        </Page>
      ))}
    </Document>
  );
}
