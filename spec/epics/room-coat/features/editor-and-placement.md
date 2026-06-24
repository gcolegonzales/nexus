---
id: FEAT-room-coat-3
title: 3D editor & room placement
epic: room-coat
status: ready
depends_on: [FEAT-room-coat-2]
---

## Summary
The interactive three.js editor at `/tools/room-coat` where users lay out a unit's floors: placing,
moving, and resizing room placements, switching floors, orbiting the camera, and selecting surfaces
to inspect/paint. Placements (`UnitRoomPlacement`) are per-unit instances of catalog rooms with
their own origin, vertices, optional size overrides, coat, and surface overrides. Mutations that
change geometry are undoable.

## User stories
- As a user, I want to drag rooms into position on a floor and resize them to match my real space.
- As a user, I want to orbit/zoom a 3D view and click a wall to see and set its paint.

## Acceptance criteria
- [ ] The editor renders the active unit/floor's placements in a three.js scene (dynamically imported,
      SSR disabled), with orbit/pan camera controls and per-floor tabs to switch the active floor.
- [ ] `UnitRoomPlacement` has `id`, `unitId`, `floorId`, `roomId`, `originXMm`, `originZMm`,
      `verticesMm` (wall-centerline polygon), `closed`, optional `widthMm`/`lengthMm`/`heightMm`
      overrides, `coat`, `surfaceOverrides`, `wallOpenings`, optional placement `doors`/`windows`.
- [ ] A `PlacedRoom` is the resolved runtime view merging catalog room + placement (resolved
      dimensions, merged doors/windows, name from catalog).
- [ ] Rectangular placements use vertices ordered CCW from the NW corner `[NW, NE, SE, SW]`; walls are
      indexed `0=south, 1=east, 2=north, 3=west`. All geometry is in mm, floor plane XZ, height Y.
- [ ] `moveRoom(placementId, x, z)` (undoable) translates the origin and all vertices and updates
      attached snap-point world positions.
- [ ] `updatePlacedRoomDimensions(placementId, patch)` (undoable) resizes the footprint and scales
      wall-anchored snap-point offsets proportionally.
- [ ] `detachRoomFromUnit(placementId)` removes the placement and clears the selected surface if it
      belonged to it.
- [ ] Clicking a surface mesh selects it (`setSelectedSurfaceId`) and opens the surface inspector
      panel (`FEAT-room-coat-8` for paint resolution shown there).
- [ ] An undo stack (max 40 entries) lets `undoLastEditorAction()` revert the most recent undoable
      editor mutation.
- [ ] Snapping during placement/move honors the current snap mode (`FEAT-room-coat-10`): grid cells,
      room walls/corners/centers, furnishing faces, snap points, and measurement guides, with visible
      snap guide feedback.

## Constraints / non-goals
- The editor is a planning aid, not a CAD tool: no structural validation, no collision prevention.
- Editing a placement's size assumes a rectangular footprint; arbitrary polygons may not resize
  correctly (see `spec/known-discrepancies.md`).

## Affected areas
- `src/tools/room-coat/components/editor/**`, `components/scene/**`, `components/SurfaceInspector.tsx`,
  `lib/{room-shape,room-geometry,layout-snap,build-surfaces}.ts`, `RoomCoatProvider.tsx`,
  `app/tools/room-coat/page.tsx`.

## Dependencies
- Room catalog (`FEAT-room-coat-2`); view settings (`FEAT-room-coat-10`); coats (`FEAT-room-coat-8`).

## Open questions
- [ ] None.
