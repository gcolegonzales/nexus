---
id: FEAT-room-coat-10
title: View settings & editor overlays
epic: room-coat
status: ready
depends_on: [FEAT-room-coat-3]
---

## Summary
The editor's visual controls: a set of toggles for overlays (ceilings, labels, grid, furnishings,
snap points, clearance labels) and a snap-mode selector, plus measurement/area readouts and a
fullscreen toggle. These settings persist on the unit state and shape how the 3D scene renders and
how placement snapping behaves.

## User stories
- As a user, I want to show/hide ceilings, labels, and the grid to declutter the view.
- As a user, I want to control how aggressively placement snaps, and to measure distances/areas.

## Acceptance criteria
- [ ] `RoomCoatViewSettings` = `{ showCeilings, showWallLabels, showRoomLabels, showFloorGrid,
      showFurnishings, showSnapPoints, showClearanceLabels, snapMode }` with defaults: ceilings,
      wall labels, room labels, furnishings, snap points, clearance labels = on; floor grid = off;
      `snapMode = "all"`.
- [ ] Each toggle has a setter (`setShowCeilings`, `setShowWallLabels`, `setShowRoomLabels`,
      `setShowFloorGrid`, `setShowFurnishings`, `setShowSnapPoints`, `setShowClearanceLabels`) that
      updates the setting and immediately affects rendering.
- [ ] `snapMode` ∈ {`all`, `grid-walls`, `grid`, `off`}; `setSnapMode()` changes which snap sources are
      active during placement/move (all sources / grid + walls / grid only / none).
- [ ] The floor grid renders cells sized to the display preference (1 sq ft imperial, 1 m² metric).
- [ ] Wall labels show wall direction/segment info; room labels show room names and stay upright
      relative to the camera; floor labels name floors.
- [ ] Clearance labels render door swing arcs / clearance visualizations when enabled.
- [ ] A measurement readout shows distances between snapped points and floor area for a room
      footprint, formatted in the active display preference; the readout can be minimized.
- [ ] The editor offers a fullscreen toggle for the canvas.
- [ ] All view settings persist in the saved Room Coat state and survive reload.

## Constraints / non-goals
- View settings are global to the tool (stored on `RoomCoatState.viewSettings`), not per unit/floor.
- Labels and clearance arcs are advisory visuals; they do not alter geometry or validation.

## Affected areas
- `src/tools/room-coat/types/state.ts` (`RoomCoatViewSettings`),
  `components/editor/{EditorSettingsPopover,EditorFloorTabs,EditorMeasurementReadout}.tsx`,
  `components/scene/**`, `lib/{layout-snap,units}.ts`, `RoomCoatProvider.tsx`.

## Dependencies
- Editor & placement (`FEAT-room-coat-3`).

## Open questions
- [ ] None.
