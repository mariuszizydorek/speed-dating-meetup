import { useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, ClickAwayListener, Collapse, Stack, Typography,
} from '@mui/material';
import { saveAs } from 'file-saver';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEvent } from '../state/EventContext';
import { isStorageAvailable } from '../state/persistence';
import {
  createEmptyProject, deleteProject, exportProjectJson, getActiveProjectId,
  importProjectJson, loadLibrary, projectFromState, saveLibrary,
  setActiveProjectId, upsertProject,
} from '../state/projectLibrary';
import type { ProjectRecord } from '../state/projectLibrary';
import { useAppTheme } from '../theme/AppThemeProvider';
import { C } from '../styles/colors';

const PREP_NAV = [
  { to: '/setup', num: '01', label: 'Setup' },
  { to: '/schedule', num: '02', label: 'Schedule' },
  { to: '/print', num: '03', label: 'Print' },
] as const;

type PrepPath = (typeof PREP_NAV)[number]['to'];

const LAST_PREP_KEY = 'sns:lastPrep';

function loadLastPrep(): PrepPath {
  try {
    const v = sessionStorage.getItem(LAST_PREP_KEY);
    if (v === '/setup' || v === '/schedule' || v === '/print') return v;
  } catch {
    /* noop */
  }
  return '/setup';
}

function saveLastPrep(path: PrepPath) {
  try {
    sessionStorage.setItem(LAST_PREP_KEY, path);
  } catch {
    /* noop */
  }
}

export function AppLayout() {
  const { state, actions } = useEvent();
  const { themeId, cycleTheme } = useAppTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [storageWarningOpen, setStorageWarningOpen] = useState(!isStorageAvailable());
  const [lastPrep, setLastPrep] = useState<PrepPath>(loadLastPrep);

  const [library, setLibrary] = useState<ProjectRecord[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | undefined>(undefined);
  const [libOpen, setLibOpen] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const seededRef = useRef(false);

  const inRun = location.pathname.startsWith('/run');
  const spacePrepare = !inRun;

  // Remember the last Prepare tab so "Prepare" can restore it after Run.
  useEffect(() => {
    const match = PREP_NAV.find((item) => location.pathname.startsWith(item.to));
    if (!match) return;
    setLastPrep(match.to);
    saveLastPrep(match.to);
  }, [location.pathname]);

  // Hydrate the projects library on first mount. No auto-seeded demo project.
  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    let lib = loadLibrary();
    let activeId = getActiveProjectId();

    if (lib.length === 0) {
      if (state?.roster.length) {
        const project = projectFromState(state, 'My event');
        lib = upsertProject(lib, project);
        activeId = project.id;
        saveLibrary(lib);
        setActiveProjectId(activeId);
      }
    } else if (!activeId) {
      activeId = lib[0].id;
      setActiveProjectId(activeId);
      if (!state) actions.loadEvent(lib[0].state);
    } else {
      const active = lib.find((p) => p.id === activeId);
      if (active && !state) actions.loadEvent(active.state);
    }

    setLibrary(lib);
    setActiveProjectIdState(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the active project's saved snapshot in sync with the live event state.
  useEffect(() => {
    if (!state || !activeProjectId) return;
    setLibrary((prev) => {
      const existing = prev.find((p) => p.id === activeProjectId);
      const project = projectFromState(state, existing?.name ?? 'My event', activeProjectId);
      const next = upsertProject(prev, project);
      saveLibrary(next);
      return next;
    });
  }, [state, activeProjectId]);

  const activeProject = library.find((p) => p.id === activeProjectId);
  const activeProjectName = activeProject?.name ?? 'No project';

  function loadProject(project: ProjectRecord) {
    setActiveProjectIdState(project.id);
    setActiveProjectId(project.id);
    actions.loadEvent(project.state);
    setLibOpen(false);
    navigate('/setup');
  }

  function handleDeleteProject(id: string) {
    setLibrary((prev) => {
      const next = deleteProject(prev, id);
      saveLibrary(next);
      return next;
    });
    if (id === activeProjectId) {
      setActiveProjectIdState(undefined);
      setActiveProjectId(undefined);
    }
  }

  function handleNewProject() {
    const project = createEmptyProject();
    setLibrary((prev) => {
      const next = upsertProject(prev, project);
      saveLibrary(next);
      return next;
    });
    setActiveProjectIdState(project.id);
    setActiveProjectId(project.id);
    actions.loadEvent(project.state);
    setLibOpen(false);
    navigate('/setup');
  }

  function handleExport() {
    if (!state) return;
    const base = activeProject ?? projectFromState(state, 'My event', activeProjectId);
    const json = exportProjectJson({ ...base, state });
    const blob = new Blob([json], { type: 'application/json' });
    const safeName = (base.name.trim() || 'event').toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
    saveAs(blob, `${safeName}.json`);
    setLibOpen(false);
  }

  async function handleImportFile(file: File) {
    const text = await file.text();
    const project = importProjectJson(text);
    if (!project) {
      window.alert('Could not read that file — expected a Speed Networking Scheduler .json export.');
      return;
    }
    setLibrary((prev) => {
      const next = upsertProject(prev, project);
      saveLibrary(next);
      return next;
    });
    setActiveProjectIdState(project.id);
    setActiveProjectId(project.id);
    actions.loadEvent(project.state);
    setLibOpen(false);
    navigate('/setup');
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: C.black }}>
      <Box
        component="header"
        sx={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 16px',
          padding: '10px 16px', bgcolor: C.panel, borderBottom: `1px solid ${C.stroke1}`,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', mr: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: C.fg }}>
            SPEED NETWORKING
          </Typography>
          <Typography sx={{ fontSize: 11, color: C.fgLabel }}>Scheduler</Typography>
        </Stack>

        <Box
          sx={{
            display: 'flex', border: `1px solid ${C.stroke3}`, borderRadius: C.radius,
            overflow: 'hidden',
          }}
        >
          {([
            {
              label: 'Prepare',
              icon: 'fa-solid fa-sliders',
              active: spacePrepare,
              onClick: () => navigate(lastPrep),
              activeBg: C.panel2,
              activeFg: C.fg,
            },
            {
              label: 'Run event',
              icon: 'fa-solid fa-tower-broadcast',
              active: inRun,
              onClick: () => navigate('/run'),
              activeBg: C.cta,
              activeFg: '#fff',
            },
          ] as const).map((sp, i) => (
            <Box
              key={sp.label}
              onClick={sp.onClick}
              sx={{
                display: 'flex', gap: '7px', alignItems: 'center',
                px: 1.75, py: 1, fontSize: 13, cursor: 'pointer',
                color: sp.active ? sp.activeFg : C.fgLabel,
                bgcolor: sp.active ? sp.activeBg : 'transparent',
                borderLeft: i === 0 ? 'none' : `1px solid ${C.stroke3}`,
                '&:hover': { filter: 'brightness(1.08)' },
              }}
            >
              <i className={sp.icon} style={{ fontSize: 11 }} />
              <Box component="span">{sp.label}</Box>
            </Box>
          ))}
        </Box>

        {spacePrepare && (
          <Box sx={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
            {PREP_NAV.map((item) => {
              const isActive = location.pathname.startsWith(item.to);
              return (
                <Box
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  sx={{
                    textDecoration: 'none', display: 'flex', gap: '7px', alignItems: 'baseline',
                    padding: '7px 12px 6px', fontSize: 13, cursor: 'pointer',
                    borderBottom: '2px solid',
                    borderBottomColor: isActive ? C.acc : 'transparent',
                    color: isActive ? C.fg : C.fgAssist,
                    '&:hover': { bgcolor: C.rail },
                  }}
                >
                  <Box component="span" sx={{ fontSize: 11, color: C.fgLabel, fontVariantNumeric: 'tabular-nums' }}>
                    {item.num}
                  </Box>
                  <Box component="span">{item.label}</Box>
                </Box>
              );
            })}
          </Box>
        )}

        <Box sx={{ flex: 1 }} />

        <ClickAwayListener onClickAway={() => setLibOpen(false)}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <Box
              onClick={cycleTheme}
              title={`Theme: ${themeId} (click to cycle)`}
              sx={{
                cursor: 'pointer', px: 1.4, py: 0.9, border: `1px solid ${C.stroke3}`,
                borderRadius: C.radius, color: C.fgMuted, fontSize: 12, lineHeight: 1,
                '&:hover': { bgcolor: C.rail },
              }}
            >
              <i className={themeId === 'modern-light' ? 'fa-solid fa-moon' : themeId === 'modern-dark' ? 'fa-solid fa-terminal' : 'fa-solid fa-sun'} />
            </Box>
            <Button
              onClick={() => setLibOpen((v) => !v)}
              sx={{
                bgcolor: 'transparent', border: '1px solid', borderColor: libOpen ? C.acc : C.stroke3,
                color: libOpen ? C.acc : C.fgAssist, px: 1.5, py: 0.75, fontSize: 12,
                maxWidth: 220, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                borderRadius: C.radius,
                '&:hover': { bgcolor: C.rail, color: C.fg },
              }}
            >
              <i className="fa-solid fa-folder-open" style={{ marginRight: 6, fontSize: 11 }} />
              {activeProjectName}
              <i className="fa-solid fa-chevron-down" style={{ marginLeft: 5, fontSize: 9 }} />
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void handleImportFile(f);
              }}
            />

            <Collapse in={libOpen} sx={{ position: 'absolute', top: 40, right: 0, zIndex: 60, width: 320, maxWidth: '86vw' }}>
              <Box sx={{ bgcolor: C.panel, border: `1px solid ${C.stroke2}`, borderRadius: '2px' }}>
                <Box sx={{ px: 1.75, py: 1.4, fontSize: 13, color: C.fgTitle, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Projects
                  <Typography component="span" sx={{ fontSize: 11, color: C.fgLabel }}>{library.length}</Typography>
                </Box>
                <Box sx={{ height: '1px', bgcolor: C.stroke2 }} />
                <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
                  {library.map((p) => (
                    <Box
                      key={p.id}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1, px: 1.75, py: 1.1,
                        borderBottom: `1px solid ${C.strokeQuiet}`, '&:hover': { bgcolor: C.rail },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{
                          fontSize: 12, color: p.id === activeProjectId ? C.mint : C.fg,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {p.name}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: C.fgLabel, fontVariantNumeric: 'tabular-nums' }}>
                          {p.state.roster.length} people · {(p.state.plans?.length ?? (p.state.schedule ? 1 : 0))} plans · {new Date(p.savedAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Box
                        component="span"
                        onClick={() => loadProject(p)}
                        sx={{
                          fontSize: 11, color: C.mint, cursor: 'pointer', border: `1px solid ${C.mint}`,
                          borderRadius: '2px', px: 1.1, py: 0.4, '&:hover': { bgcolor: C.mintSoft },
                        }}
                      >
                        Load
                      </Box>
                      <Box
                        component="span"
                        onClick={() => handleDeleteProject(p.id)}
                        sx={{ color: C.fgLabel, cursor: 'pointer', px: 0.5, '&:hover': { color: C.red } }}
                      >
                        <i className="fa-solid fa-xmark" />
                      </Box>
                    </Box>
                  ))}
                  {library.length === 0 && (
                    <Box sx={{ p: 1.75, fontSize: 12, color: C.fgLabel }}>
                      No projects yet — create one or import a .json file.
                    </Box>
                  )}
                </Box>
                <Box sx={{ height: '1px', bgcolor: C.stroke2 }} />
                <Box sx={{ display: 'flex', gap: 0.75, p: 1.25, flexWrap: 'wrap' }}>
                  <Button
                    onClick={handleNewProject}
                    sx={{
                      flex: 1, bgcolor: 'transparent', border: `1px solid ${C.mint}`, color: C.mint,
                      px: 1.25, py: 0.75, fontSize: 11, '&:hover': { bgcolor: C.mintSoft },
                    }}
                  >
                    <i className="fa-solid fa-plus" style={{ marginRight: 5 }} />New project
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={!state}
                    sx={{
                      flex: 1, bgcolor: 'transparent', border: `1px solid ${C.stroke3}`, color: C.fg,
                      px: 1.25, py: 0.75, fontSize: 11, '&:hover': { bgcolor: C.rail },
                    }}
                  >
                    <i className="fa-solid fa-file-export" style={{ marginRight: 5 }} />Export .json
                  </Button>
                  <Button
                    onClick={() => importInputRef.current?.click()}
                    sx={{
                      flex: 1, bgcolor: 'transparent', border: `1px solid ${C.stroke3}`, color: C.fg,
                      px: 1.25, py: 0.75, fontSize: 11, '&:hover': { bgcolor: C.rail },
                    }}
                  >
                    <i className="fa-solid fa-file-import" style={{ marginRight: 5 }} />Import
                  </Button>
                </Box>
              </Box>
            </Collapse>
          </Box>
        </ClickAwayListener>
      </Box>

      <Collapse in={storageWarningOpen}>
        <Alert severity="warning" onClose={() => setStorageWarningOpen(false)} sx={{ borderRadius: 0 }}>
          Browser storage is unavailable — the app will work, but progress will not be saved across reloads.
        </Alert>
      </Collapse>

      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </Box>
    </Box>
  );
}
