import { describe, expect, it } from 'vitest';
import { pdf } from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import { PersonalPlanPdf } from './PersonalPlanPdf';
import { NameTagsPdf } from './NameTagsPdf';
import { AreaSignsPdf } from './AreaSignsPdf';
import { MasterMatrixPdf } from './MasterMatrixPdf';
import { QualityReportPdf } from './QualityReportPdf';
import type { EventState, Schedule } from '../../domain/types';

const state: EventState = {
  version: 1,
  roster: [
    { id: 'a', name: 'Alice', company: 'Acme', rowIndex: 2 },
    { id: 'b', name: 'Bob', company: 'Beta', rowIndex: 3 },
    { id: 'c', name: 'Carol', company: 'Casa', rowIndex: 4 },
    { id: 'd', name: 'Dan', company: 'Delta', rowIndex: 5 },
  ],
  params: {
    groupSize: 4,
    areas: [{ id: 'A', label: 'A' }],
    numRounds: 1,
    roundSeconds: 180,
    moveSeconds: 30,
    avoidSameCompany: false,
    breaks: [],
  },
};

const schedule: Schedule = {
  seed: 1,
  generatedAt: '2026-07-22T00:00:00.000Z',
  rounds: [{ index: 0, groups: [{ areaId: 'A', memberIds: ['a', 'b', 'c', 'd'] }], sittingOut: [] }],
  quality: {
    totalPairs: 6, uniquePairs: 6, repeatedPairs: 0, sameCompanyPairs: 0,
    perPerson: state.roster.map((p) => ({ id: p.id, metIds: [], neverMetIds: [], repeatMeetings: 0 })),
  },
};

async function renderToBlob(node: ReactElement) {
  const blob = await pdf(node).toBlob();
  return blob;
}

describe('PDF components render to a non-empty PDF blob', () => {
  it('PersonalPlanPdf', async () => {
    const blob = await renderToBlob(<PersonalPlanPdf roster={state.roster} params={state.params} schedule={schedule} />);
    expect(blob.size).toBeGreaterThan(500);
  });
  it('NameTagsPdf', async () => {
    const blob = await renderToBlob(<NameTagsPdf roster={state.roster} />);
    expect(blob.size).toBeGreaterThan(500);
  });
  it('AreaSignsPdf', async () => {
    const blob = await renderToBlob(<AreaSignsPdf areas={state.params.areas} />);
    expect(blob.size).toBeGreaterThan(500);
  });
  it('MasterMatrixPdf', async () => {
    const blob = await renderToBlob(<MasterMatrixPdf roster={state.roster} params={state.params} schedule={schedule} />);
    expect(blob.size).toBeGreaterThan(500);
  });
  it('QualityReportPdf', async () => {
    const blob = await renderToBlob(<QualityReportPdf roster={state.roster} schedule={schedule} />);
    expect(blob.size).toBeGreaterThan(500);
  });
});
