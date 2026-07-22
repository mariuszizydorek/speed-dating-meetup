import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { Person, TagConfig } from '../../domain/types';
import { DEFAULT_TAG_CFG } from '../../domain/types';

const A4_W = 190; // usable mm
const A4_H = 277;

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const nameSizePt: Record<TagConfig['nameSize'], number> = { S: 18, M: 24, L: 32 };

export function NameTagsPdf({
  roster,
  tagCfg = DEFAULT_TAG_CFG,
}: {
  roster: Person[];
  tagCfg?: TagConfig;
}) {
  const cols = Math.max(1, Math.floor(A4_W / tagCfg.w));
  const rows = Math.max(1, Math.floor(A4_H / tagCfg.h));
  const perPage = cols * rows;
  const widthPct = `${100 / cols}%`;
  const heightPct = `${100 / rows}%`;
  const pages = chunk(roster, perPage);

  const styles = StyleSheet.create({
    page: { padding: 12, flexDirection: 'row', flexWrap: 'wrap' },
    tag: {
      width: widthPct,
      height: heightPct,
      padding: 16,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: '#999',
      justifyContent: tagCfg.companyPos === 'bottom' ? 'space-between' : 'center',
      alignItems: tagCfg.align === 'left' ? 'flex-start' : 'center',
    },
    name: {
      fontSize: nameSizePt[tagCfg.nameSize],
      fontWeight: 700,
      textAlign: tagCfg.align,
    },
    company: {
      fontSize: 12,
      marginTop: tagCfg.companyPos === 'under' ? 6 : 0,
      color: '#444',
      textAlign: tagCfg.align,
    },
  });

  return (
    <Document>
      {pages.map((tags, i) => (
        <Page key={i} size="A4" style={styles.page}>
          {tags.map((p) => (
            <View key={p.id} style={styles.tag}>
              <View>
                <Text style={styles.name}>{p.name}</Text>
                {p.company && tagCfg.companyPos === 'under' && (
                  <Text style={styles.company}>{p.company}</Text>
                )}
              </View>
              {p.company && tagCfg.companyPos === 'bottom' && (
                <Text style={styles.company}>{p.company}</Text>
              )}
            </View>
          ))}
        </Page>
      ))}
    </Document>
  );
}
