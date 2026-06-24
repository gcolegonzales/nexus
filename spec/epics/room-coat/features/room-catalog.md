---
id: FEAT-room-coat-2
title: Room catalog
epic: room-coat
status: ready
depends_on: [FEAT-room-coat-1]
---

## Summary
A catalog of reusable **room** definitions (name + base dimensions + doors) that can be placed into
any unit. The catalog is global (shared across units); placing a room creates a per-unit
**placement** (`FEAT-room-coat-3`). The `/rooms` page manages the catalog and shows where each room
is used.

## User stories
- As a user, I want a library of room types I can drop into a unit's floor plan.
- As a user, I want to see which units already use a given room.

## Acceptance criteria
- [ ] `Room` has `id`, `name`, `widthMm`, `lengthMm`, `heightMm` (each ≥ 300 mm), and `doors: Door[]`.
- [ ] `/rooms` lists catalog rooms with name, dimensions (in the active display preference), door
      count, and the units where the room is placed; an "Add room" action opens a creation modal.
- [ ] `addRoom(input)` validates a non-empty name and ≥ 300 mm dimensions, creates the catalog room,
      and (when requested) also creates a placement on the active unit/floor, returning
      `{ roomId, placementId | null }`. Default new-room size is 12'×14'×8' (3657×4267×2438 mm).
- [ ] `updateRoom(id, patch)` updates the catalog name (trimmed, non-empty) and/or dimensions
      (≥ 300 mm); changes apply to the catalog definition.
- [ ] `deleteRoom(id)` removes the catalog room **and** all of its placements across units.
- [ ] `attachRoomToUnit(roomId, unitId?)` creates a placement of an existing catalog room on the
      target unit's active floor, skipping if already attached.
- [ ] `/rooms/[id]` is reserved for future per-room catalog editing (not a blocking behavior).

## Constraints / non-goals
- Per-placement size overrides live on the placement, not the catalog (`FEAT-room-coat-3`).
- Rooms are rectangular by catalog definition; non-rectangular footprints are a placement-level
  concern and are not fully supported (see `spec/known-discrepancies.md`).

## Affected areas
- `src/tools/room-coat/types/state.ts` (`Room`, `Door`), `lib/units.ts`,
  `components/AddRoomModal.tsx`, `app/tools/room-coat/rooms/**`, `RoomCoatProvider.tsx`.

## Dependencies
- Units & floors (`FEAT-room-coat-1`); placement (`FEAT-room-coat-3`).

## Open questions
- [ ] None.
