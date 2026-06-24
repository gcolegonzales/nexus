---
id: FEAT-room-coat-8
title: Coats, surface paint resolution & floor finishes
epic: room-coat
status: ready
depends_on: [FEAT-room-coat-7, FEAT-room-coat-3]
---

## Summary
The paint model: every paintable **surface** resolves to a paint through a precedence chain — a
per-surface override, then a door override, then the space's **coat**, then the unit **default
coat**, else "unset". Coats also carry a floor-finish selection (type + variant), which is a
separate system from wall paints. This resolution drives both the 3D rendering and the surface
schedule.

## User stories
- As a user, I want to set a default coat for the whole unit and override per room or per surface.
- As a user, I want floors finished with a material (hardwood, tile, …) distinct from wall paint.

## Acceptance criteria
- [ ] `RoomCoat` = `{ wallPaintId, baseboardPaintId, ceilingPaintId, doorPaintId,
      floorFinishType, floorFinishVariantId }`, all nullable; default is all-null.
- [ ] `SurfaceCategory` ∈ {`wall`, `baseboard`, `ceiling`, `door`, `window`, `floor`}; a
      `SurfaceDescriptor` has a stable `id`, `category`, human `label`, and references to its space and
      (where relevant) `doorId`/`windowId`.
- [ ] Surface ids follow the documented scheme, e.g. room wall
      `"{placementId}:wall:{wallIndex}:{segIndex}"`, baseboard `"{placementId}:baseboard:…"`, ceiling
      `"{placementId}:ceiling"`, floor `"{placementId}:floor"`, door `"{placementId}:door:{doorId}"`;
      hallway segment wall `"{hallwayId}:seg:{segIndex}:wall:{side}"`, corner ceiling
      `"{hallwayId}:corner:{cornerIndex}:ceiling"`.
- [ ] Resolution precedence for a non-floor surface: (1) surface override in
      `space.surfaceOverrides[id]` if it is a paint id; (2) for door surfaces, the door's
      `overridePaintId`; (3) the space coat's paint for that category; (4) the unit default coat's
      paint for that category; (5) unset (a neutral placeholder color).
- [ ] `floor` surfaces never resolve to a wall paint; floor appearance comes from the coat's
      `floorFinishType` + `floorFinishVariantId`. Floor-finish overrides are encoded distinctly from
      paint ids (e.g. `"floor:{type}:{variant}"`) and are distinguishable from paint overrides.
- [ ] `setRoomCoat(placementId, coat)` / `setHallwayCoat(hallwayId, coat)` update a space's coat;
      changing the baseboard paint clears that space's per-wall baseboard surface overrides (baseboards
      are uniform per space by design).
- [ ] `setSurfaceOverride(spaceId, surfaceId, paintId, kind)` and
      `clearSurfaceOverride(spaceId, surfaceId, kind)` set/remove a per-surface paint; cleared surfaces
      fall back through the chain.
- [ ] `floorFinishType` ∈ {concrete, hardwood, engineered-wood, laminate, tile, carpet, vinyl, stone},
      each with selectable variants; the resolved result reports a source of `override`, `coat`,
      `unit-default`, or `unset`.

## Constraints / non-goals
- Windows have no paint assignment today (resolve to unset).
- Baseboard per-wall overrides are intentionally dropped when the space baseboard paint changes.

## Affected areas
- `src/tools/room-coat/lib/{resolve-paint,floor-finishes,floor-finish-override,build-surfaces,surface-display-labels,paint-schedule}.ts`,
  `types/state.ts` (`RoomCoat`, `SurfaceDescriptor`, `SurfaceCategory`),
  `components/{SurfaceInspector,FloorFinishPicker}.tsx`, `RoomCoatProvider.tsx`.

## Dependencies
- Paint library (`FEAT-room-coat-7`); editor surfaces (`FEAT-room-coat-3`).

## Open questions
- [ ] None.
