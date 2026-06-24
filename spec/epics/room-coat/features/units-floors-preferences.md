---
id: FEAT-room-coat-1
title: Units, floors & display preference
epic: room-coat
status: ready
depends_on: [FEAT-hub-shell-5]
---

## Summary
Room Coat scopes everything to a **Unit** (a property). A unit has one or more **floors** (stories)
and a per-unit paint library and default coat. The active unit + active floor determine what the
editor shows. A single app-wide preference controls whether dimensions/areas display in imperial or
metric; all geometry is stored in millimetres regardless.

## User stories
- As a renovator, I want to organize a property into floors and switch between them.
- As a user, I want to work in feet/inches or metric without changing the underlying data.

## Acceptance criteria
- [ ] `HomeUnit` has `id`, `name`, `paints: Paint[]`, `defaultCoat: RoomCoat`, and a `hallwayCoat`
      kept in sync with `defaultCoat` for backward compatibility.
- [ ] `UnitFloor` has `id`, `unitId`, `name`, `sortOrder`, and render-time display offsets
      (computed, not authored).
- [ ] On first run (no stored slice, or a slice with zero units) the tool ensures at least one unit
      exists with one "Main" floor and makes them active.
- [ ] `addUnit(name)` creates a unit plus a default "Main" floor and returns the new unit id.
- [ ] `updateUnit(id, patch)` updates unit fields and keeps `hallwayCoat` and `defaultCoat` mirrored
      when either is patched.
- [ ] `deleteUnit(id)` is blocked when only one unit remains; otherwise it cascades deletion of the
      unit's floors, placements, hallways, furnishings, snap points, and floor links.
- [ ] `setActiveUnitId(id)` switches the active unit, auto-selects its first floor, and clears the
      selected surface.
- [ ] `addFloor(name?)` adds a floor to the active unit (auto-naming "Main", "2nd Floor", … when
      blank) and returns its id; `setActiveFloorId(id)` switches floor (only to an existing floor).
- [ ] `RoomCoatState.unitPreference` ∈ {`imperial`, `metric`}; `setUnitPreference()` switches it and
      it affects all dimension/area display and the floor-grid cell size (1 sq ft vs 1 m²) app-wide.
- [ ] Conversion is lossless round-trip via `lib/units.ts` (mm ↔ imperial ft/in, mm ↔ metric m/cm);
      minimum room/element dimensions are enforced in mm.
- [ ] The legacy routes `/units/[id]` and `/schedule` redirect to the editor and `/surfaces`
      respectively.

## Constraints / non-goals
- `unitPreference` is global (one setting for the whole tool), not per unit.
- Floors are organizational; cross-floor connections (`FloorLink`) are metadata only (see
  `FEAT-room-coat-6` / `spec/known-discrepancies.md`).

## Affected areas
- `src/tools/room-coat/types/state.ts`, `lib/{units,floor-utils,migrate-state}.ts`,
  `RoomCoatProvider.tsx`, `components/editor/EditorFloorTabs.tsx`,
  `app/tools/room-coat/units/[id]/page.tsx`, `app/tools/room-coat/schedule/page.tsx`.

## Dependencies
- Storage (`FEAT-hub-shell-5`).

## Open questions
- [ ] None.
