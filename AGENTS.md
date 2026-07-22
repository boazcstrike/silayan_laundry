# AGENTS

This repository includes guidance for automated coding agents.

## Start here

Read `GEMINI.md` for the detailed project context (overview, setup, conventions, and TODOs).

For how submissions are stored and read — the SQLite + MongoDB dual-write data layer — see
[`docs/data-layer.md`](docs/data-layer.md). Any change to persistence, analytics reads, or the
`/api/submissions` and `/api/analytics` routes should start there.

## Code Quality & SOLID Principles

Refer to `TODO.md` for comprehensive guidelines on SOLID principles, clean code improvements, and refactoring priorities. This document outlines:
- Current violations of SOLID principles
- Priority improvements with migration plan
- Specific code changes needed
- Success metrics for refactoring

## When collaborating in this repo

- Prefer small, focused changes aligned with `TODO.md` priorities
- After code changes, run:
  - `pnpm lint`
  - `pnpm build`
- Keep documentation links pointing to `AGENTS.md` as the entry point (it links to `GEMINI.md`)
- Follow SOLID principles and clean code practices outlined in `TODO.md`

## Git ritual (solo developer)

This repo has a single solo developer. Commits land on `main` — no pull requests.

- **Commit and push directly to `main`.** Do not open PRs and do not leave work
  parked on long-lived feature branches.
- **Worktrees are encouraged for parallel work.** When multiple agents/teams run
  at once, give each its own git worktree so their edits do not clash. This is
  the only sanctioned reason to work off `main`.
- **Merge back into `main` before finishing.** Any worktree/branch used for
  isolation must be merged into `main` (fast-forward preferred) and then deleted.
  The final commit of record always lives on `main`.
- Before pushing, run `pnpm lint` and `pnpm build`.
