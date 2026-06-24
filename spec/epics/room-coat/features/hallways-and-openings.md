---
id: FEAT-room-coat-4
title: Hallways & wall openings
epic: room-coat
status: ready
depends_on: [FEAT-room-coat-3]
---

## Summary
Hallways connect rooms as fixed-width corridors drawn along a centerline polyline. Wall openings are
gaps cut into room walls (or hallway sides) for doorways, open-plan connections, and hallway
junctions. Together they let a unit's spaces flow into one another. Hallway/opening mutations are
undoable.

## User stories
- As a user, I want to draw a hallway between rooms and have it render as a corridor I can paint.
- As a user, I want to open a wall so two spaces connect (open plan or a hallway entrance).

## Acceptance criteria
- [ ] `Hallway` has `id`, `unitId`, `floorId`, `name`, `widthMm` (default 914 mm), `heightMm`,
      `waypointsMm` (≥ 2 centerline points), `coat`, `surfaceOverrides`, and
      `wallOpenings: HallwayWallOpening[]`.
- [ ] `HallwayWallOpening` has `id`, `segIndex`, `side` (`0|1`), `startMm`, `endMm`, optional
      `connectingHallwayId`.
- [ ] `addHallway(unitId, waypoints, widthMm?)` creates a hallway (≥ 2 waypoints, default width
      914 mm) initialized with the unit default coat and returns its id.
- [ ] `connectHallway(unitId, roomA, wallA, roomB, wallB)` creates a hallway between two room walls,
      deriving waypoints from the wall centers.
- [ ] `createHallwayWithOpenings(...)` (undoable) creates a hallway plus its wall openings and, when
      endpoints meet an existing hallway, extends that hallway instead of overlapping.
- [ ] `updateHallwayWaypoints(id, waypoints)` updates the path (≥ 2 waypoints); `deleteHallway(id)`
      (undoable) removes the hallway and any openings referencing it and clears a selected surface
      belonging to it.
- [ ] `WallOpening` (room) has `id`, `wallIndex`, `startMm`, `endMm`, optional `hallwayId`;
      `addWallOpening(placementId, wallIndex, startMm, endMm)` (undoable) creates one, requiring a span
      ≥ 100 mm; spans below the minimum are ignored.
- [ ] `removeWallOpening(placementId, openingId)` (undoable) removes an opening.
- [ ] A hallway renders as a corridor of its width around its centerline, with paintable per-segment
      walls, baseboards, ceilings, and floor (surfaces per `FEAT-room-coat-8`).

## Constraints / non-goals
- No validation of self-intersecting or degenerate waypoints; hallway width is symmetric about the
  centerline (see `spec/known-discrepancies.md`).
- Openings are rectangular spans along a wall; arbitrary shapes are out of scope.

## Affected areas
- `src/tools/room-coat/types/state.ts` (`Hallway`, `WallOpening`, `HallwayWallOpening`),
  `lib/{hallway-draft,hallway-entrance-snaps,room-shape}.ts`, `components/editor/**`,
  `RoomCoatProvider.tsx`.

## Dependencies
- Editor & placement (`FEAT-room-coat-3`).

## Open questions
- [ ] None.
