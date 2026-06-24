---
id: FEAT-room-coat-6
title: Furnishings & snap points
epic: room-coat
status: ready
depends_on: [FEAT-room-coat-3]
---

## Summary
Furnishings are placeable objects (sofas, beds, tables, …) from a preset library, positioned on a
floor and optionally anchored to a room. Snap points are explicit anchors — on the floor or on a
wall — that furnishings (and hallway entrances) snap to, optionally consumed on use. Floor links are
lightweight metadata noting connections between floors (stairs/elevator).

## User stories
- As a user, I want to drop furniture into rooms to sanity-check layout and clearances.
- As a user, I want reusable snap anchors so objects land in consistent spots.

## Acceptance criteria
- [ ] `Furnishing` has `id`, `unitId`, `floorId`, optional `roomPlacementId`, `label`, optional
      `presetId`, `widthMm`/`depthMm`/`heightMm` (≥ 150 mm), `centerXMm`/`centerZMm`,
      `rotationDeg ∈ {0,90,180,270}`, optional `color`, optional `snapPointId`.
- [ ] `addFurnishing(input)` creates a furnishing (min 150 mm dims) and returns its id, drawing
      defaults from a preset when `presetId` is given.
- [ ] `updateFurnishing` (undoable) edits position/dims/rotation/color/snap link; `deleteFurnishing`
      (undoable) removes it.
- [ ] `SnapPoint` has `id`, `unitId`, `floorId`, `kind` (`"floor"|"wall"`), optional
      `roomPlacementId`/`wallIndex`/`wallOffsetMm`/`hallwayWidthMm`/`label`, world `xMm`/`zMm`,
      optional `rotationDeg`, and `consumeOnPlace` (default true for floor snaps, false for wall).
- [ ] `addSnapPoint(input)` creates a snap point and returns its id; wall snaps store `wallOffsetMm`
      and derive world coordinates from the wall segment.
- [ ] `updateSnapPoint` (undoable) edits position/label; for wall snaps it recomputes world coords
      from `wallOffsetMm` and moves any linked furnishings to match.
- [ ] `removeSnapPoint` deletes the snap point and orphans (does not delete) any furnishings linked to
      it (their `snapPointId` becomes null).
- [ ] When a furnishing snaps to a `consumeOnPlace` snap point, that snap point is consumed.
- [ ] `FloorLink` (`id`, `unitId`, `fromFloorId`, `toFloorId`, `label?`) records a between-floor
      connection as metadata; CRUD exists but it has no geometric effect.

## Constraints / non-goals
- Furnishings are advisory; no collision detection between furnishings, walls, or door swings.
- Floor links are metadata only (no rendered stairs/geometry) — see `spec/known-discrepancies.md`.

## Affected areas
- `src/tools/room-coat/types/state.ts` (`Furnishing`, `SnapPoint`, `FloorLink`),
  `lib/{furnishing-presets,furnishing-snap-points,snap-point-utils,layout-snap}.ts`,
  `components/editor/**`, `RoomCoatProvider.tsx`.

## Dependencies
- Editor & placement (`FEAT-room-coat-3`).

## Open questions
- [ ] None.
