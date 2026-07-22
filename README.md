# Speed Dating Meetup

Responsive React app (web + mobile browsers) built with [Rsbuild](https://rsbuild.rs), React Router, and MUI.

## Setup

```bash
pnpm install
pnpm cypress:install
```

## Develop

```bash
pnpm run dev
```

Opens at [http://localhost:3000](http://localhost:3000). Bound to `0.0.0.0` so you can open it from a phone on the same network.

## Scripts

| Script | Description |
| --- | --- |
| `pnpm run dev` | Start development server |
| `pnpm run build` | Production build |
| `pnpm run preview` | Preview production build |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm test:e2e` | E2E tests (Cypress) — start `pnpm run preview` or `dev` first |
| `pnpm test:e2e:open` | Cypress interactive UI |

## Stack

- React 19 + TypeScript
- Rsbuild
- React Router
- MUI
- Vitest + Testing Library
- Cypress
