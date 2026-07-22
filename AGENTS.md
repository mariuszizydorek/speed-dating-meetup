# AGENTS.md

You are an expert in JavaScript, Rsbuild, and web application development. You write maintainable, performant, and accessible code.

## Architecture constraints

- This is a **SPA** that runs **locally on the user's machine only**.
- Persist with **`localStorage` only**. Keys: `speedDating:currentEvent`, `sns:projectsV1`, `sns:activeProjectId`, `sns:themeV1`, `sns:soundV1`, `sns:floorV1`.
- Keep `src/domain/` framework-free (no React, no I/O).
- Workflow: Setup → Schedule → Print → Run.
- UI themes: `terminal` | `modern-light` | `modern-dark` via `AppThemeProvider` (`data-theme` on `<html>`).

## Design source of truth

- UI / tokens / extra features: `docs/superpowers/DESIGN_HANDOFF.md`
- Domain / scheduler: `docs/superpowers/specs/2026-07-22-speed-networking-scheduler-design.md`
- Implementation plan: `docs/superpowers/plans/2026-07-22-speed-networking-scheduler.md`

## Commands

- `pnpm run dev` — Start the dev server
- `pnpm run build` — Build the app for production
- `pnpm run preview` — Preview the production build locally
- `pnpm test` — Unit tests (Vitest)
- `pnpm test:e2e` — E2E tests (Cypress; app must be serving)

## Docs

- Rsbuild: https://rsbuild.rs/llms.txt
- Rspack: https://rspack.rs/llms.txt
