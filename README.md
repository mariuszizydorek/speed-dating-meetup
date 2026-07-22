# Speed Dating Meetup / Speed Networking Scheduler

Local-only SPA for organising speed-networking events. Design handoff: `docs/superpowers/DESIGN_HANDOFF.md`.

## Architecture

- **SPA only** — no backend.
- **Runs locally** — organiser machine via `pnpm run dev` / `preview`.
- **`localStorage` only** — projects library, theme, sound, floor layout, current event.
- **Themes** — cycle Terminal / Modern light / Modern dark (header icon).

## Setup

```bash
pnpm install
pnpm cypress:install
```

## Develop

```bash
pnpm run dev
```

Open http://localhost:3000/setup. Create a project or import a roster to begin.

## Scripts

| Script | Description |
| --- | --- |
| `pnpm run dev` | Start development server |
| `pnpm run build` | Production build |
| `pnpm run preview` | Preview production build |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | E2E tests (Cypress) |
| `pnpm test:e2e:open` | Cypress interactive UI |

## Stack

- React 19 + TypeScript, Rsbuild, React Router, MUI
- `@react-pdf/renderer`, `xlsx`, `nanoid`, `jszip`, `file-saver`
- Vitest + Testing Library, Cypress
