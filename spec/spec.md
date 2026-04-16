# vk-investment-frontend-v2 — Spec

## Overview

**Problem**: The legacy investment web frontend is coupled directly to the backend, which prevents the introduction of a presentation-layer middleend and ties UI evolution to backend release cycles.

**Solution**: A new public web frontend that consumes a Server-Driven UI component tree from the investment middleend. The frontend renders trees server-side, hydrates for interactivity, and routes user actions back to the middleend, which owns all presentation logic.

**Project type**: frontend-web

**Target users**: Investment platform end users accessing the product through a browser.

## Goals

- Replace the legacy frontend as the public web entry point.
- Render all screens from SDUI component trees returned by the middleend.
- Isolate the browser from the backend — all traffic flows through the Next.js server to the middleend.
- Ship a component registry aligned with the SDUI base set, extensible with project-specific components as the middleend contract evolves.

## Non-Goals

- Business logic in the frontend.
- Direct integration with the legacy backend.
- Visual parity with the legacy frontend — the new design is driven by the middleend contract.
- Client-side state beyond ephemeral UI concerns (form inputs, toggles, validation).

## Spec Index

| Spec                                                | Description                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------- |
| [SDUI Components](sdui.md)                          | Custom components and screens (summary, links out)                   |
| [SDUI Shell](sdui-shell.md)                         | Shell fetching, content_slot, platform detection                     |
| [SDUI Actions](sdui-actions.md)                     | Action types, form submission, /api/action proxy, 401 handling       |
| [SDUI Shared Props](sdui-shared-props.md)           | Container / self props, alignment and spacing tokens                 |
| [SDUI Base Components](sdui-base-components.md)     | All base components (screen, row, column, text, table, ...)          |
| [SDUI Custom Components](sdui-custom-components.md) | Project-specific components (charts, ...) — some entries **[draft]** |
| [Security](security.md)                             | Auth handling at the web edge                                        |
| [Error Handling](errors.md)                         | Error categories and behavior                                        |
| [Acceptance Criteria](acceptance.md)                | Testable criteria for completion                                     |
