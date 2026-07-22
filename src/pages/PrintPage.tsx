import { useState } from 'react';
import type { ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import { Alert, Box, Button, Snackbar, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { pdf } from '@react-pdf/renderer';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { useEvent } from '../state/EventContext';
import { getActiveProjectId, loadLibrary } from '../state/projectLibrary';
import { PersonalPlanPdf } from '../components/pdf/PersonalPlanPdf';
import { NameTagsPdf } from '../components/pdf/NameTagsPdf';
import { AreaSignsPdf } from '../components/pdf/AreaSignsPdf';
import { MasterMatrixPdf } from '../components/pdf/MasterMatrixPdf';
import { QualityReportPdf } from '../components/pdf/QualityReportPdf';
import { buildFollowUpEmail, buildInviteEmail, toEml } from '../domain/emails';
import type { EmailMode } from '../domain/emails';
import { DEFAULT_TAG_CFG } from '../domain/types';
import type { TagConfig } from '../domain/types';
import { C } from '../styles/colors';

function activeProjectName(): string {
  const id = getActiveProjectId();
  const found = loadLibrary().find((p) => p.id === id);
  return found?.name ?? 'this event';
}

export function PrintPage() {
  const { state, actions } = useEvent();
  const navigate = useNavigate();
  const [error, setError] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<string | undefined>(undefined);
  const [emailMode, setEmailMode] = useState<EmailMode>('invite');
  const [emailIdx, setEmailIdx] = useState(0);

  if (!state?.schedule) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="info">Generate a schedule first.</Alert>
      </Box>
    );
  }

  const { roster, params, schedule } = state;
  const tagCfg: TagConfig = params.tagCfg ?? DEFAULT_TAG_CFG;
  const projectName = activeProjectName();

  const tagCols = Math.max(1, Math.floor(190 / tagCfg.w));
  const tagRows = Math.max(1, Math.floor(277 / tagCfg.h));
  const tagPerPage = tagCols * tagRows;
  const tagPages = roster.length ? Math.ceil(roster.length / tagPerPage) : 0;

  const tiles = [
    {
      key: 'plans',
      title: 'Personal plans',
      description: 'One A4 per person — a tear-off mini-tag for every round: area + who to meet.',
      pagesLabel: `PDF · ${roster.length} pages`,
      thumb: <PersonalPlanThumb />,
      node: () => <PersonalPlanPdf roster={roster} params={params} schedule={schedule} />,
      filename: 'personal-plans.pdf',
    },
    {
      key: 'tags',
      title: 'Name tags',
      description: 'Big name, smaller company. Size and per-page layout are set in "Name tag layout" below.',
      pagesLabel: `PDF · ${tagPages} page${tagPages === 1 ? '' : 's'}`,
      thumb: <NameTagsThumb />,
      node: () => <NameTagsPdf roster={roster} tagCfg={params.tagCfg} />,
      filename: 'name-tags.pdf',
    },
    {
      key: 'signs',
      title: 'Area signs',
      description: 'One A4 per area in use. Very large centred letter.',
      pagesLabel: `PDF · ${params.areas.length} page${params.areas.length === 1 ? '' : 's'}`,
      thumb: <AreaSignThumb letter={params.areas[0]?.label ?? 'A'} />,
      node: () => <AreaSignsPdf areas={params.areas} />,
      filename: 'area-signs.pdf',
    },
    {
      key: 'matrix',
      title: 'Master matrix',
      description: "A4 landscape, 1 page. Round × Area grid — the organiser's cheat sheet.",
      pagesLabel: 'PDF · 1 page',
      thumb: <MasterMatrixThumb />,
      node: () => <MasterMatrixPdf roster={roster} params={params} schedule={schedule} />,
      filename: 'master-matrix.pdf',
    },
    {
      key: 'quality',
      title: 'Quality report',
      description: 'Summary numbers plus per-person never-met lists.',
      pagesLabel: 'PDF · summary + per-person',
      thumb: <QualityReportThumb />,
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

  function updateTagCfg(patch: Partial<TagConfig>) {
    actions.updateParams({ tagCfg: { ...tagCfg, ...patch } });
  }

  const idx = roster.length ? Math.min(emailIdx, roster.length - 1) : 0;
  const person = roster[idx];
  const draft = person
    ? emailMode === 'invite'
      ? buildInviteEmail(person, roster, params, schedule, projectName)
      : buildFollowUpEmail(person, roster, schedule, projectName)
    : undefined;

  async function copyEmailText() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft.plainText);
      setToast('Copied to clipboard.');
    } catch {
      setError('Could not access the clipboard.');
    }
  }

  function downloadEml() {
    if (!draft || !person) return;
    const blob = new Blob([toEml(draft)], { type: 'message/rfc822' });
    const safeName = person.name.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-') || 'attendee';
    saveAs(blob, `${safeName}.eml`);
  }

  function generateAllEmails() {
    const drafts = roster.map((p) =>
      emailMode === 'invite'
        ? buildInviteEmail(p, roster, params, schedule, projectName)
        : buildFollowUpEmail(p, roster, schedule, projectName));
    const text = drafts.map((d) => d.plainText).join('\n\n' + '—'.repeat(40) + '\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    saveAs(blob, `${emailMode === 'invite' ? 'invitations' : 'follow-ups'}.txt`);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1, flex: 1 }}>
      <Box sx={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25, bgcolor: C.panel, px: 2, py: 1.5,
      }}>
        <Typography sx={{ fontSize: 16, color: C.fgTitle }}>Print materials</Typography>
        <Typography sx={{ fontSize: 11, color: C.fgLabel }}>
          {`Plan ${(state.planIdx ?? 0) + 1} · ${roster.length} people · ${params.areas.length} areas · `}
          live previews — PDF/zip export ships with the build
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          onClick={downloadAll}
          sx={{ bgcolor: C.blueDeep, color: '#fff', px: 2, py: 1.1, fontSize: 13, '&:hover': { filter: 'brightness(1.15)', bgcolor: C.blueDeep } }}
        >
          <i className="fa-solid fa-file-zipper" style={{ marginRight: 7, fontSize: 12 }} />
          Download all (.zip)
        </Button>
        <Button
          onClick={() => navigate('/run')}
          sx={{
            bgcolor: 'transparent', border: `1px solid ${C.mint}`, color: C.mint, px: 2, py: 1,
            fontSize: 13, '&:hover': { bgcolor: C.mintSoft },
          }}
        >
          Start event <i className="fa-solid fa-arrow-right" style={{ marginLeft: 5, fontSize: 11 }} />
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        {tiles.map((t) => (
          <Box key={t.key} sx={{ bgcolor: C.panel, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: C.rail }}>
              {t.thumb}
            </Box>
            <Box sx={{ p: '12px 14px', flex: 1 }}>
              <Typography sx={{ fontSize: 14, color: C.fg, mb: 0.6 }}>{t.title}</Typography>
              <Typography sx={{ fontSize: 12, color: C.fgMuted, lineHeight: 1.35 }}>{t.description}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75, px: '14px', pb: '14px' }}>
              <Button
                onClick={() => downloadOne(t.title, t.filename, t.node())}
                sx={{
                  flex: 1, bgcolor: 'transparent', border: `1px solid ${C.stroke3}`, color: C.fg,
                  px: 1.5, py: 0.9, fontSize: 12, '&:hover': { bgcolor: C.rail },
                }}
              >
                <i className="fa-solid fa-file-pdf" style={{ marginRight: 6, color: C.blueSoft }} />
                {t.pagesLabel}
              </Button>
            </Box>
          </Box>
        ))}
      </Box>

      <Box sx={{ bgcolor: C.panel, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25, px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 16, color: C.fgTitle }}>Name tag layout</Typography>
          <Typography sx={{ fontSize: 11, color: C.fgLabel, fontVariantNumeric: 'tabular-nums' }}>
            {`${tagCfg.w}×${tagCfg.h} mm · ${tagCols} × ${tagRows} = ${tagPerPage} per page · ${tagPages} page${tagPages === 1 ? '' : 's'} for ${roster.length} people`}
          </Typography>
        </Box>
        <Box sx={{ height: '1px', bgcolor: C.stroke2 }} />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3.5, p: 2, alignItems: 'flex-start' }}>
          <Box sx={{ flex: '1 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.75, maxWidth: 380 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <NumberField
                label="Tag width (mm)" value={tagCfg.w} min={40} max={105} step={5}
                onChange={(v) => updateTagCfg({ w: v })}
              />
              <NumberField
                label="Tag height (mm)" value={tagCfg.h} min={25} max={105} step={5}
                onChange={(v) => updateTagCfg({ h: v })}
              />
            </Box>
            <ChipRow
              label="Name alignment"
              options={[{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }]}
              value={tagCfg.align}
              onChange={(v) => updateTagCfg({ align: v as TagConfig['align'] })}
            />
            <ChipRow
              label="Company position"
              options={[{ value: 'under', label: 'Under name' }, { value: 'bottom', label: 'Tag bottom' }]}
              value={tagCfg.companyPos}
              onChange={(v) => updateTagCfg({ companyPos: v as TagConfig['companyPos'] })}
            />
            <ChipRow
              label="Name size"
              options={[{ value: 'S', label: 'Small' }, { value: 'M', label: 'Medium' }, { value: 'L', label: 'Large' }]}
              value={tagCfg.nameSize}
              onChange={(v) => updateTagCfg({ nameSize: v as TagConfig['nameSize'] })}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Box>
              <Typography sx={{ fontSize: 11, color: C.fgLabel, mb: 0.9 }}>TAG PREVIEW</Typography>
              <TagPreview tagCfg={tagCfg} person={roster[0]} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 11, color: C.fgLabel, mb: 0.9 }}>PAGE · A4</Typography>
              <Box sx={{
                width: 150, height: 212, bgcolor: '#ffffff', border: '1px solid #E6E6DE', borderRadius: '1px',
                p: '7px', boxSizing: 'border-box', display: 'grid',
                gridTemplateColumns: `repeat(${tagCols}, 1fr)`, gridAutoRows: '1fr', gap: '3px',
              }}>
                {Array.from({ length: tagPerPage }).map((_, i) => (
                  <Box key={i} sx={{ border: '1px dashed #b9b4a8' }} />
                ))}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ bgcolor: C.panel, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25, px: 2, py: 1.5 }}>
          <Typography sx={{ fontSize: 16, color: C.fgTitle }}>Attendee emails</Typography>
          <Typography sx={{ fontSize: 11, color: C.fgLabel }}>personalised per attendee</Typography>
          <Box sx={{ display: 'flex', border: `1px solid ${C.stroke3}`, borderRadius: '2px', overflow: 'hidden' }}>
            <Button
              onClick={() => setEmailMode('invite')}
              sx={{
                px: 1.5, py: 0.75, fontSize: 12, borderRadius: 0,
                color: emailMode === 'invite' ? C.fg : C.fgMuted,
                bgcolor: emailMode === 'invite' ? C.panel2 : 'transparent',
                '&:hover': { bgcolor: emailMode === 'invite' ? C.panel2 : C.rail },
              }}
            >
              Invitation
            </Button>
            <Button
              onClick={() => setEmailMode('followup')}
              sx={{
                px: 1.5, py: 0.75, fontSize: 12, borderRadius: 0, borderLeft: `1px solid ${C.stroke3}`,
                color: emailMode === 'followup' ? C.fg : C.fgMuted,
                bgcolor: emailMode === 'followup' ? C.panel2 : 'transparent',
                '&:hover': { bgcolor: emailMode === 'followup' ? C.panel2 : C.rail },
              }}
            >
              Follow-up
            </Button>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Button
              aria-label="Previous attendee"
              onClick={() => setEmailIdx((i) => (roster.length ? (i - 1 + roster.length) % roster.length : 0))}
              disabled={roster.length === 0}
              sx={{ minWidth: 0, border: `1px solid ${C.stroke3}`, color: C.fgMuted, px: 1.25, py: 0.75, '&:hover': { color: C.fg } }}
            >
              <i className="fa-solid fa-chevron-left" />
            </Button>
            <Typography sx={{ fontSize: 12, color: C.fgMuted, fontVariantNumeric: 'tabular-nums', minWidth: 64, textAlign: 'center' }}>
              {roster.length ? `${idx + 1} / ${roster.length}` : '0 / 0'}
            </Typography>
            <Button
              aria-label="Next attendee"
              onClick={() => setEmailIdx((i) => (roster.length ? (i + 1) % roster.length : 0))}
              disabled={roster.length === 0}
              sx={{ minWidth: 0, border: `1px solid ${C.stroke3}`, color: C.fgMuted, px: 1.25, py: 0.75, '&:hover': { color: C.fg } }}
            >
              <i className="fa-solid fa-chevron-right" />
            </Button>
          </Box>
          <Button
            onClick={copyEmailText}
            disabled={!draft}
            sx={{ bgcolor: 'transparent', border: `1px solid ${C.stroke3}`, color: C.fg, px: 1.5, py: 0.9, fontSize: 12, '&:hover': { bgcolor: C.rail } }}
          >
            <i className="fa-regular fa-copy" style={{ marginRight: 6, fontSize: 11 }} />
            Copy text
          </Button>
          <Button
            onClick={downloadEml}
            disabled={!draft}
            sx={{ bgcolor: 'transparent', border: `1px solid ${C.stroke3}`, color: C.fg, px: 1.5, py: 0.9, fontSize: 12, '&:hover': { bgcolor: C.rail } }}
          >
            <i className="fa-solid fa-download" style={{ marginRight: 6, fontSize: 11 }} />
            Download .eml
          </Button>
          <Button
            onClick={generateAllEmails}
            disabled={roster.length === 0}
            sx={{ bgcolor: C.blueDeep, color: '#fff', px: 1.75, py: 0.9, fontSize: 12, '&:hover': { filter: 'brightness(1.15)', bgcolor: C.blueDeep } }}
          >
            <i className="fa-solid fa-file-arrow-down" style={{ marginRight: 6, fontSize: 11 }} />
            Generate all
          </Button>
        </Box>
        <Box sx={{ height: '1px', bgcolor: C.stroke2 }} />
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', bgcolor: C.rail }}>
          <EmailPreview draft={draft} person={person} />
        </Box>
      </Box>

      <Snackbar open={!!error} autoHideDuration={5000} onClose={() => setError(undefined)} message={error} />
      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast(undefined)} message={toast} />
    </Box>
  );
}

function NumberField({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: C.fgLabel, mb: '5px' }}>{label}</Typography>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (Number.isNaN(v)) return;
          onChange(Math.max(min, Math.min(max, v)));
        }}
        style={{
          width: '100%', boxSizing: 'border-box', background: 'transparent', border: `1px solid ${C.stroke4}`,
          color: C.fg, padding: '8px 10px', fontSize: 14, borderRadius: 2, fontVariantNumeric: 'tabular-nums',
          fontFamily: 'inherit',
        }}
      />
    </Box>
  );
}

function ChipRow<T extends string>({ label, options, value, onChange }: {
  label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <Box>
      <Typography sx={{ fontSize: 12, color: C.fgLabel, mb: 0.75 }}>{label}</Typography>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <Box
              key={o.value}
              onClick={() => onChange(o.value)}
              sx={{
                cursor: 'pointer', px: 1.5, py: 0.75, border: '1px solid',
                borderColor: active ? C.mint : C.stroke3, borderRadius: '2px', fontSize: 12,
                color: active ? C.fg : C.fgLabel, '&:hover': { bgcolor: C.rail },
              }}
            >
              {o.label}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function TagPreview({ tagCfg, person }: { tagCfg: TagConfig; person?: { name: string; company: string } }) {
  const name = person?.name ?? 'Alice Kowalski';
  const company = person?.company || 'Helios Energy';
  const nameFs = tagCfg.nameSize === 'S' ? 15 : tagCfg.nameSize === 'L' ? 25 : 20;
  const align = tagCfg.align;
  const width = 240;
  const height = Math.max(60, Math.round((width * tagCfg.h) / tagCfg.w));

  return (
    <Box sx={{
      width, height, bgcolor: '#ffffff', border: '1px solid #E6E6DE', borderRadius: '1px',
      p: '14px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {tagCfg.companyPos === 'under' ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '5px', width: '100%' }}>
          <Typography sx={{ fontWeight: 700, color: '#1a1c22', fontSize: nameFs, textAlign: align, width: '100%', lineHeight: 1.1 }}>
            {name}
          </Typography>
          <Typography sx={{ color: '#6b675e', fontSize: 12, textAlign: align, width: '100%' }}>{company}</Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', width: '100%' }}>
            <Typography sx={{ fontWeight: 700, color: '#1a1c22', fontSize: nameFs, textAlign: align, width: '100%', lineHeight: 1.1 }}>
              {name}
            </Typography>
          </Box>
          <Typography sx={{ color: '#6b675e', fontSize: 12, textAlign: align, width: '100%' }}>{company}</Typography>
        </>
      )}
    </Box>
  );
}

function EmailPreview({ draft, person }: {
  draft: ReturnType<typeof buildInviteEmail> | undefined;
  person: { name: string; email: string } | undefined;
}) {
  if (!draft || !person) {
    return <Typography sx={{ fontSize: 12, color: C.fgLabel }}>No attendees to preview.</Typography>;
  }
  const to = `${person.name} <${person.email || 'no email on file'}>`;
  return (
    <Box sx={{
      width: '100%', maxWidth: 620, bgcolor: '#ffffff', border: '1px solid #E6E6DE', borderRadius: '1px',
      color: '#1a1c22', fontSize: 13, lineHeight: 1.5,
    }}>
      <Box sx={{ p: '12px 20px', borderBottom: '1px solid #E6E6DE' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Box component="span" sx={{ color: '#8A8D94', width: 58, flexShrink: 0 }}>To</Box>
          <Box component="span">{to}</Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
          <Box component="span" sx={{ color: '#8A8D94', width: 58, flexShrink: 0 }}>Subject</Box>
          <Box component="span" sx={{ fontWeight: 700 }}>{draft.subject}</Box>
        </Box>
      </Box>
      <Box sx={{ p: '18px 20px 22px' }}>
        <Box sx={{ mb: 1.5 }}>{draft.greeting}</Box>
        <Box sx={{ mb: 1.75, color: '#4a4e57' }}>{draft.intro}</Box>
        <Box sx={{ border: '1px solid #E6E6DE', borderRadius: '1px', mb: 1.75 }}>
          <Box sx={{
            display: 'grid', gridTemplateColumns: draft.colHeaders[0] === 'Round' ? '64px 64px 1fr' : '1fr 1fr 1.2fr',
            p: '7px 12px', bgcolor: '#F1F1EA', fontSize: 11, color: '#8A8D94', letterSpacing: '.04em',
          }}>
            {draft.colHeaders.map((h) => <span key={h}>{h.toUpperCase()}</span>)}
          </Box>
          {draft.rows.map((r, i) => (
            <Box key={i} sx={{
              display: 'grid', gridTemplateColumns: draft.colHeaders[0] === 'Round' ? '64px 64px 1fr' : '1fr 1fr 1.2fr',
              p: '7px 12px', borderTop: '1px solid #F1F1EA', fontSize: 12, fontVariantNumeric: 'tabular-nums',
            }}>
              <Box component="span" sx={{ color: '#8A8D94' }}>{r.col1}</Box>
              <Box component="span" sx={{ fontWeight: 700 }}>{r.col2}</Box>
              <Box component="span" sx={{ color: '#4a4e57' }}>{r.col3}</Box>
            </Box>
          ))}
        </Box>
        <Box sx={{ color: '#4a4e57', mb: 1.5 }}>{draft.outro}</Box>
        <Box>See you there,<br />The organising team</Box>
      </Box>
    </Box>
  );
}

function PersonalPlanThumb() {
  return (
    <Box sx={{
      width: 104, height: 140, bgcolor: '#f4f3ef', borderRadius: '1px', p: '8px', boxSizing: 'border-box',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: '1fr', gap: '3px',
    }}>
      {Array.from({ length: 10 }).map((_, i) => <Box key={i} sx={{ border: '1px dashed #999' }} />)}
    </Box>
  );
}

function NameTagsThumb() {
  return (
    <Box sx={{
      width: 104, height: 140, bgcolor: '#f4f3ef', p: '8px', boxSizing: 'border-box',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '4px',
    }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Box key={i} sx={{
          border: '1px solid #ccc', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '2px',
        }}>
          <Box sx={{ width: '70%', height: '5px', bgcolor: '#333' }} />
          <Box sx={{ width: '45%', height: '3px', bgcolor: '#999' }} />
        </Box>
      ))}
    </Box>
  );
}

function AreaSignThumb({ letter }: { letter: string }) {
  return (
    <Box sx={{ width: 104, height: 140, bgcolor: '#f4f3ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Typography sx={{ fontSize: 64, fontWeight: 900, color: '#1a1a1a' }}>{letter}</Typography>
    </Box>
  );
}

function MasterMatrixThumb() {
  return (
    <Box sx={{
      width: 140, height: 104, bgcolor: '#f4f3ef', p: '8px', boxSizing: 'border-box',
      display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridAutoRows: '1fr', gap: '2px',
    }}>
      {Array.from({ length: 24 }).map((_, i) => (
        <Box key={i} sx={{ bgcolor: i % 2 === 0 ? '#ddd' : '#ccc' }} />
      ))}
    </Box>
  );
}

function QualityReportThumb() {
  return (
    <Box sx={{
      width: 104, height: 140, bgcolor: '#f4f3ef', p: '10px', boxSizing: 'border-box',
      display: 'flex', flexDirection: 'column', gap: '4px',
    }}>
      <Box sx={{ width: '60%', height: '6px', bgcolor: '#333' }} />
      <Box sx={{ width: '40%', height: '4px', bgcolor: '#2aa87c', mb: '4px' }} />
      <Box sx={{ width: '90%', height: '3px', bgcolor: '#bbb' }} />
      <Box sx={{ width: '85%', height: '3px', bgcolor: '#bbb' }} />
      <Box sx={{ width: '88%', height: '3px', bgcolor: '#bbb' }} />
      <Box sx={{ width: '70%', height: '3px', bgcolor: '#bbb' }} />
      <Box sx={{ width: '50%', height: '4px', bgcolor: '#333', mt: '5px' }} />
      <Box sx={{ width: '90%', height: '3px', bgcolor: '#bbb' }} />
      <Box sx={{ width: '80%', height: '3px', bgcolor: '#bbb' }} />
    </Box>
  );
}
