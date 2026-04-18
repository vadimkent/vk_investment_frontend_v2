# vk-investment-frontend-v2

workflow-version: v0.1.0

## Stack

- Framework: Next.js 15 (App Router)
- Language: TypeScript
- UI: React 19 (Server Components)
- Styling: Tailwind CSS
- Pattern: Server-Driven UI (SDUI)

## Commands

- `make run` — Start dev server
- `make build` — Build for production
- `make test` — Run tests (JSON output)
- `make lint` — Run ESLint + Prettier

## Structure

- `app/` — Next.js App Router (pages, layouts, route handlers)
- `app/api/` — Route handlers that proxy actions to middleend
- `components/registry.ts` — SDUI type → React component mapping
- `components/renderer.tsx` — Recursive component tree renderer
- `components/base/` — Base SDUI components
- `components/custom/` — Project-specific SDUI components
- `lib/middleend.ts` — Server-side middleend API client
- `lib/types/` — Generated API types
- `spec/` — Project specification (canonical, SDD source of truth)

## Specs

The app's specs live in `spec/`. These are the source of truth for SDD and must stay in sync with code changes.

`docs/superpowers/specs/` and `docs/superpowers/plans/` are **plugin artifacts** (Claude superpowers planning), not app specs. Do not treat them as authoritative — when reflecting changes back to specs, edit `spec/*.md`.
