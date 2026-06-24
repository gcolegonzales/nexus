---
id: FEAT-room-coat-7
title: Paint library
epic: room-coat
status: ready
depends_on: [FEAT-room-coat-1]
---

## Summary
Each unit owns a paint library — the palette available to that unit's coats and surface overrides. A
paint records a brand code, optional brand/name, a hex color, and finish attributes (sheen, surface
texture). The `/paints` page manages the active unit's library, with a starter palette and safe
deletion that strips references.

## User stories
- As a user, I want to build a palette of the actual paints I'm using, with brand codes and hex.
- As a user, I want to delete an unused paint without corrupting my plan.

## Acceptance criteria
- [ ] `Paint` has `id`, `code` (required, trimmed, non-empty), optional `brand`, optional `name`,
      `hex` (required), optional `sheen` (`flat|eggshell|satin|semi-gloss`), optional `surfaceTexture`
      (`smooth|orange-peel|knockdown`).
- [ ] `/paints` shows the active unit's paints with a swatch (hex), brand, code, name, sheen, texture,
      and per-row actions; it offers adding a paint and loading a starter palette.
- [ ] `upsertPaint(paint)` adds or updates a paint in the active unit's library, trimming and
      requiring a non-empty `code`.
- [ ] `deletePaint(paintId)` removes the paint and strips all references to it: the unit default coat,
      every placement coat and surface override, every hallway coat and surface override, and any door
      paint overrides (those fields become null/cleared).
- [ ] Paints are per-unit; switching the active unit shows that unit's library.
- [ ] A paint in use is still deletable; deletion cleanly unsets the surfaces that referenced it
      (which then fall back through the resolution chain in `FEAT-room-coat-8`).

## Constraints / non-goals
- No global/shared palette across units; each unit's library is independent.
- Floor finishes are a separate system from paints (see `FEAT-room-coat-8`).

## Affected areas
- `src/tools/room-coat/types/state.ts` (`Paint`), `lib/{seed-paints,resolve-paint}.ts`,
  `components/PaintLibrary.tsx`, `app/tools/room-coat/paints/page.tsx`, `RoomCoatProvider.tsx`.

## Dependencies
- Units (`FEAT-room-coat-1`).

## Open questions
- [ ] None.
