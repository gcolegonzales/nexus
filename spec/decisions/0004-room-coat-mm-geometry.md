# 0004. Room Coat stores geometry in millimetres, displays per preference

- Status: accepted
- Date: 2026-06-23

## Context
Room Coat serves both imperial and metric users and needs a single, unambiguous internal geometry
representation that avoids accumulating rounding errors as users edit in different units.

## Decision
All Room Coat geometry (room/door/window/hallway dimensions, vertices, offsets, snap points,
furnishings) is stored in integer-friendly **millimetres**. A single app-wide `unitPreference`
(`imperial` | `metric`) controls display and input conversion via `lib/units.ts`; the floor grid
cell is 1 sq ft (imperial) or 1 m² (metric). Minimum sizes are enforced in mm (e.g. rooms ≥ 300 mm,
doors ≥ 609 mm wide, furnishings ≥ 150 mm).

## Consequences
- Switching display units never mutates stored data; conversions are display-only and round-trip.
- All geometry math (snapping, areas, surface ids) operates in mm consistently.
- The XZ floor plane / Y height convention and CCW-from-NW vertex ordering are part of this contract;
  rectangular footprints are assumed by the dimension-editing path.
