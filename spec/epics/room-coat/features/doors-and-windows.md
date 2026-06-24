---
id: FEAT-room-coat-5
title: Doors & windows
epic: room-coat
status: ready
depends_on: [FEAT-room-coat-3]
---

## Summary
Doors and windows are openings positioned on a room wall. Doors carry hinge side and swing direction
(visualized as a swing arc) and can take a per-door paint override; windows carry a sill height.
Both are addressable as surfaces in the paint schedule. Door/window mutations are undoable.

## User stories
- As a user, I want to place doors with the correct hinge and swing so my plan is realistic.
- As a user, I want windows on walls with the right sill height, and to paint a specific door
  differently.

## Acceptance criteria
- [ ] `Door` has `id`, `wallIndex`, `widthMm` (≥ 609 mm), `heightMm` (≥ 610 mm), `offsetFromCornerMm`,
      `overridePaintId | null`, optional `hingeSide` (`"left"|"right"`, default left), `swingsInward`
      (default true).
- [ ] `Window` has `id`, `wallIndex`, `widthMm`, `heightMm`, `sillHeightMm`, `offsetFromCornerMm`.
- [ ] `addDoorToPlacement(placementId, doorInput)` (undoable) adds a door, generating an id when
      absent and defaulting hinge left / swings inward; default door is 36"×80" at 2' offset
      (914×2032 mm @ 610 mm).
- [ ] `updateDoor(placementId, doorId, patch)` (undoable) edits position, dimensions, hinge, swing,
      and paint override; `removeDoor(...)` (undoable) deletes it.
- [ ] `addWindowToPlacement(placementId, wallIndex, offsetFromCornerMm)` (undoable) adds a window with
      sensible defaults (≈ 36"×48" @ 36" sill); `updateWindow`/`removeWindow` (undoable) edit/delete.
- [ ] A placement's effective doors/windows merge catalog-room doors with placement-specific ones in
      the resolved `PlacedRoom`.
- [ ] Door surfaces resolve paint with a door override taking precedence over the coat's door paint
      (`FEAT-room-coat-8`); door swing arcs render when clearance labels are enabled
      (`FEAT-room-coat-10`).
- [ ] Window surfaces are represented in the schedule but currently carry no window-specific paint
      (treated as unset — see `spec/known-discrepancies.md`).

## Constraints / non-goals
- No collision/clearance enforcement; swing arcs are advisory visuals only.
- Window glazing/paint is not modeled beyond the surface entry.

## Affected areas
- `src/tools/room-coat/types/state.ts` (`Door`, `Window`), `lib/{room-geometry,build-surfaces,resolve-paint}.ts`,
  `components/editor/**`, `components/SurfaceInspector.tsx`, `RoomCoatProvider.tsx`.

## Dependencies
- Editor & placement (`FEAT-room-coat-3`); coats & resolution (`FEAT-room-coat-8`).

## Open questions
- [ ] None.
