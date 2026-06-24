---
id: FEAT-room-coat-9
title: Surface schedule & CSV export
epic: room-coat
status: ready
depends_on: [FEAT-room-coat-8]
---

## Summary
The `/surfaces` page resolves every paintable surface in the active unit into a table — space,
surface, category, and the resolved paint with its source — and exports it as CSV for purchasing or
handing to a contractor. It is the read-only, schedule-of-record view of all the paint decisions
made in the editor.

## User stories
- As a renovator, I want one table of every surface and its paint so I can buy the right quantities.
- As a user, I want to export that table as CSV to share or print.

## Acceptance criteria
- [ ] `/surfaces` builds the schedule for the active unit by enumerating, for every placement and
      hallway, each surface from `build-surfaces` and resolving its paint via `FEAT-room-coat-8`.
- [ ] Each row shows: space name, space type (room/hallway), surface label, category, resolved paint
      brand, code, name, and the resolution source (`override` / `coat` / `unit-default` / `unset`).
- [ ] Unset surfaces are clearly indicated (e.g. "Not set") rather than blank/ambiguous.
- [ ] An export action downloads the schedule as CSV with a header row and the same columns as the
      table; the CSV reflects the current resolved state.
- [ ] The schedule updates to reflect coat/override/paint changes made in the editor (no stale cache).
- [ ] `/schedule` redirects to `/surfaces` (legacy alias).

## Constraints / non-goals
- Quantity/coverage math (e.g. surface area → gallons) is a presentation nicety, not a guaranteed
  output of this feature; the authoritative output is the per-surface paint mapping. (If surface-area
  estimates are shown, they are advisory.)
- The schedule is read-only; paint changes happen in the editor/inspector.

## Affected areas
- `src/tools/room-coat/lib/{paint-schedule,build-surfaces,resolve-paint,surface-display-labels}.ts`,
  `components/SurfacePaintTable.tsx`, `app/tools/room-coat/surfaces/page.tsx`,
  `app/tools/room-coat/schedule/page.tsx`.

## Dependencies
- Coats & resolution (`FEAT-room-coat-8`).

## Open questions
- [ ] None.
