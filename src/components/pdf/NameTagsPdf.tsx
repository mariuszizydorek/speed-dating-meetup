import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Person } from '../../domain/types';

const styles = StyleSheet.create({
  page: { padding: 12, flexDirection: 'row', flexWrap: 'wrap' },
  tag: {
    width: '50%',
    height: '50%',
    padding: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { fontSize: 28, fontWeight: 700, textAlign: 'center' },
  company: { fontSize: 14, marginTop: 8, color: '#444', textAlign: 'center' },
});

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export function NameTagsPdf({ roster }: { roster: Person[] }) {
  const pages = chunk(roster, 4);
  return (
    <Document>
      {pages.map((tags, i) => (
        <Page key={i} size="A4" style={styles.page}>
          {tags.map((p) => (
            <View key={p.id} style={styles.tag}>
              <Text style={styles.name}>{p.name}</Text>
              {p.company && <Text style={styles.company}>{p.company}</Text>}
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
