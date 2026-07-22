import { useState } from 'react';
import type { ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import {
  Alert, Box, Button, Card, CardActions, CardContent, Container, Snackbar, Stack, Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { useEvent } from '../state/EventContext';
import { PersonalPlanPdf } from '../components/pdf/PersonalPlanPdf';
import { NameTagsPdf } from '../components/pdf/NameTagsPdf';
import { AreaSignsPdf } from '../components/pdf/AreaSignsPdf';
import { MasterMatrixPdf } from '../components/pdf/MasterMatrixPdf';
import { QualityReportPdf } from '../components/pdf/QualityReportPdf';

export function PrintPage() {
  const { state } = useEvent();
  const navigate = useNavigate();
  const [error, setError] = useState<string | undefined>(undefined);

  if (!state?.schedule) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="info">Generate a schedule first.</Alert>
      </Container>
    );
  }

  const { roster, params, schedule } = state;

  const tiles = [
    {
      key: 'plans',
      title: 'Personal plans',
      description: 'Perforated A4 per person, 10 mini-tags each.',
      node: () => <PersonalPlanPdf roster={roster} params={params} schedule={schedule} />,
      filename: 'personal-plans.pdf',
    },
    {
      key: 'tags',
      title: 'Name tags',
      description: 'Four wearable tags per A4 sheet.',
      node: () => <NameTagsPdf roster={roster} />,
      filename: 'name-tags.pdf',
    },
    {
      key: 'signs',
      title: 'Area signs',
      description: 'One A4 per area with a big letter.',
      node: () => <AreaSignsPdf areas={params.areas} />,
      filename: 'area-signs.pdf',
    },
    {
      key: 'matrix',
      title: 'Master matrix',
      description: "Organiser's cheat-sheet, landscape A4.",
      node: () => <MasterMatrixPdf roster={roster} params={params} schedule={schedule} />,
      filename: 'master-matrix.pdf',
    },
    {
      key: 'quality',
      title: 'Quality report',
      description: 'Repeat counts and per-person never-met list.',
      node: () => <QualityReportPdf roster={roster} schedule={schedule} />,
      filename: 'quality-report.pdf',
    },
  ];

  async function downloadOne(title: string, filename: string, node: ReactElement<DocumentProps>) {
    try {
      const blob = await pdf(node).toBlob();
      saveAs(blob, filename);
    } catch (e) {
      setError(`Could not generate ${title}: ${(e as Error).message}`);
    }
  }

  async function downloadAll() {
    try {
      const zip = new JSZip();
      for (const t of tiles) {
        const blob = await pdf(t.node()).toBlob();
        zip.file(t.filename, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, 'speed-networking-materials.zip');
    } catch (e) {
      setError(`Could not build zip: ${(e as Error).message}`);
    }
  }

  return (
    <Container sx={{ py: 4 }} maxWidth="lg">
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">Print materials</Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' } }}>
          {tiles.map((t) => (
            <Card key={t.key}>
              <CardContent>
                <Typography variant="h6">{t.title}</Typography>
                <Typography variant="body2" color="text.secondary">{t.description}</Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => downloadOne(t.title, t.filename, t.node())}>
                  Download PDF
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={downloadAll}>Download all as ZIP</Button>
          <Button variant="contained" onClick={() => navigate('/run')}>Start event</Button>
        </Stack>
      </Stack>
      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(undefined)}
        message={error} />
    </Container>
  );
}
