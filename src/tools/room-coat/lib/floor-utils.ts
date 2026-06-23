import { createId } from "@/shared/ids/createId";
import type {
  Furnishing,
  Hallway,
  PlacedRoom,
  SnapPoint,
  UnitFloor,
  UnitRoomPlacement,
} from "@/tools/room-coat/types/state";
import { unitBounds } from "@/tools/room-coat/lib/unit-layout";

/** Minimum gap between adjacent floor grid edges (world mm). */
export const FLOOR_ISLAND_GUTTER_MM = 4000;

/** Half-extent of an empty floor's local working grid (mm). */
export const EMPTY_FLOOR_HALF_EXTENT_MM = 4000;

/** Padding around floor content inside the square grid island (mm). */
export const FLOOR_GRID_PAD_MM = 2000;

export interface AxisBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface FloorDisplayOffset {
  displayOffsetXMm: number;
  displayOffsetZMm: number;
}

export type FloorDisplayLayout = Record<string, FloorDisplayOffset>;

export function createDefaultFloor(unitId: string, name = "Main"): UnitFloor {
  return {
    id: createId(),
    unitId,
    name,
    sortOrder: 0,
    displayOffsetXMm: 0,
    displayOffsetZMm: 0,
  };
}

export function getFloorsForUnit(unitId: string, floors: UnitFloor[]): UnitFloor[] {
  return floors
    .filter((floor) => floor.unitId === unitId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getActiveFloor(
  floors: UnitFloor[],
  unitId: string,
  activeFloorId: string | null,
): UnitFloor | null {
  const unitFloors = getFloorsForUnit(unitId, floors);
  if (unitFloors.length === 0) return null;
  if (activeFloorId) {
    const match = unitFloors.find((floor) => floor.id === activeFloorId);
    if (match) return match;
  }
  return unitFloors[0];
}

export function emptyFloorLocalBounds(): AxisBounds {
  return {
    minX: -EMPTY_FLOOR_HALF_EXTENT_MM,
    maxX: EMPTY_FLOOR_HALF_EXTENT_MM,
    minZ: -EMPTY_FLOOR_HALF_EXTENT_MM,
    maxZ: EMPTY_FLOOR_HALF_EXTENT_MM,
  };
}

function expandBounds(bounds: AxisBounds, xMm: number, zMm: number, padMm: number): AxisBounds {
  return {
    minX: Math.min(bounds.minX, xMm - padMm),
    maxX: Math.max(bounds.maxX, xMm + padMm),
    minZ: Math.min(bounds.minZ, zMm - padMm),
    maxZ: Math.max(bounds.maxZ, zMm + padMm),
  };
}

/** Content bounds in floor-local coordinates (rooms + hallways). */
export function floorLocalContentBounds(
  floorId: string,
  rooms: PlacedRoom[],
  hallways: Hallway[],
): AxisBounds {
  const floorRooms = placedRoomsOnFloor(rooms, floorId);
  const floorHallways = hallwaysOnFloor(hallways, floorId);

  if (floorRooms.length === 0 && floorHallways.length === 0) {
    return emptyFloorLocalBounds();
  }

  let bounds: AxisBounds | null =
    floorRooms.length > 0 ? unitBounds(floorRooms) : null;

  for (const hallway of floorHallways) {
    const halfWidth = hallway.widthMm / 2;
    for (const point of hallway.waypointsMm) {
      if (!bounds) {
        bounds = {
          minX: point.xMm - halfWidth,
          maxX: point.xMm + halfWidth,
          minZ: point.zMm - halfWidth,
          maxZ: point.zMm + halfWidth,
        };
        continue;
      }
      bounds = expandBounds(bounds, point.xMm, point.zMm, halfWidth);
    }
  }

  return bounds ?? emptyFloorLocalBounds();
}

/** Square grid island bounds in floor-local coordinates (used for layout + rendering). */
export function floorGridBounds(content: AxisBounds): AxisBounds {
  const centerX = (content.minX + content.maxX) / 2;
  const centerZ = (content.minZ + content.maxZ) / 2;
  const halfExtent = Math.max(
    (content.maxX - content.minX) / 2 + FLOOR_GRID_PAD_MM,
    (content.maxZ - content.minZ) / 2 + FLOOR_GRID_PAD_MM,
    EMPTY_FLOOR_HALF_EXTENT_MM,
  );
  return {
    minX: centerX - halfExtent,
    maxX: centerX + halfExtent,
    minZ: centerZ - halfExtent,
    maxZ: centerZ + halfExtent,
  };
}

export function floorLocalGridBounds(
  floorId: string,
  rooms: PlacedRoom[],
  hallways: Hallway[],
): AxisBounds {
  return floorGridBounds(floorLocalContentBounds(floorId, rooms, hallways));
}

/**
 * Lay out floor islands left-to-right with a uniform gutter between grid edges.
 * Each floor keeps its own local grid; display offsets shift the island in world space.
 */
export function computeFloorDisplayLayout(
  unitId: string,
  floors: UnitFloor[],
  rooms: PlacedRoom[],
  hallways: Hallway[],
): FloorDisplayLayout {
  const sorted = getFloorsForUnit(unitId, floors);
  const layout: FloorDisplayLayout = {};

  if (sorted.length === 0) return layout;

  const gridByFloor = new Map(
    sorted.map((floor) => [
      floor.id,
      floorLocalGridBounds(floor.id, rooms, hallways),
    ]),
  );

  const firstGrid = gridByFloor.get(sorted[0].id)!;
  const anchorCenterZ = (firstGrid.minZ + firstGrid.maxZ) / 2;
  let worldGridMaxX = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    const floor = sorted[index];
    const grid = gridByFloor.get(floor.id)!;
    const gridCenterZ = (grid.minZ + grid.maxZ) / 2;

    if (index === 0) {
      layout[floor.id] = { displayOffsetXMm: 0, displayOffsetZMm: 0 };
      worldGridMaxX = grid.maxX;
      continue;
    }

    const displayOffsetXMm = worldGridMaxX + FLOOR_ISLAND_GUTTER_MM - grid.minX;
    const displayOffsetZMm = anchorCenterZ - gridCenterZ;
    layout[floor.id] = { displayOffsetXMm, displayOffsetZMm };
    worldGridMaxX = displayOffsetXMm + grid.maxX;
  }

  return layout;
}

export function floorDisplayOffsetFor(
  floorId: string,
  layout: FloorDisplayLayout,
): FloorDisplayOffset {
  return layout[floorId] ?? { displayOffsetXMm: 0, displayOffsetZMm: 0 };
}

export function floorDisplayOffsetM(
  floorId: string,
  layout: FloorDisplayLayout,
): [number, number] {
  const offset = floorDisplayOffsetFor(floorId, layout);
  return [offset.displayOffsetXMm * 0.001, offset.displayOffsetZMm * 0.001];
}

export function toWorldXMm(
  floorId: string,
  localXMm: number,
  layout: FloorDisplayLayout,
): number {
  return localXMm + floorDisplayOffsetFor(floorId, layout).displayOffsetXMm;
}

export function toWorldZMm(
  floorId: string,
  localZMm: number,
  layout: FloorDisplayLayout,
): number {
  return localZMm + floorDisplayOffsetFor(floorId, layout).displayOffsetZMm;
}

export function toFloorLocalXMm(
  floorId: string,
  worldXMm: number,
  layout: FloorDisplayLayout,
): number {
  return worldXMm - floorDisplayOffsetFor(floorId, layout).displayOffsetXMm;
}

export function toFloorLocalZMm(
  floorId: string,
  worldZMm: number,
  layout: FloorDisplayLayout,
): number {
  return worldZMm - floorDisplayOffsetFor(floorId, layout).displayOffsetZMm;
}

export function placedRoomsOnFloor(
  rooms: PlacedRoom[],
  floorId: string,
): PlacedRoom[] {
  return rooms.filter((room) => room.floorId === floorId);
}

export function hallwaysOnFloor(
  hallways: Hallway[],
  floorId: string,
): Hallway[] {
  return hallways.filter((hallway) => hallway.floorId === floorId);
}

export function furnishingsOnFloor(
  furnishings: Furnishing[],
  floorId: string,
): Furnishing[] {
  return furnishings.filter((item) => item.floorId === floorId);
}

export function snapPointsOnFloor(
  snapPoints: SnapPoint[],
  floorId: string,
): SnapPoint[] {
  return snapPoints.filter((point) => point.floorId === floorId);
}

export function floorIslandBounds(
  floorId: string,
  layout: FloorDisplayLayout,
  rooms: PlacedRoom[],
  hallways: Hallway[],
): AxisBounds {
  const grid = floorLocalGridBounds(floorId, rooms, hallways);
  const offset = floorDisplayOffsetFor(floorId, layout);
  return {
    minX: grid.minX + offset.displayOffsetXMm,
    maxX: grid.maxX + offset.displayOffsetXMm,
    minZ: grid.minZ + offset.displayOffsetZMm,
    maxZ: grid.maxZ + offset.displayOffsetZMm,
  };
}

/** World-space bounds for a single floor island (for camera framing). */
export function viewBoundsForFloor(
  unitId: string,
  floorId: string,
  floors: UnitFloor[],
  rooms: PlacedRoom[],
  hallways: Hallway[],
): AxisBounds {
  const layout = computeFloorDisplayLayout(unitId, floors, rooms, hallways);
  return floorIslandBounds(floorId, layout, rooms, hallways);
}

/** Tighter world-space bounds around actual floor content (rooms + hallways). */
export function viewBoundsForFloorContent(
  unitId: string,
  floorId: string,
  floors: UnitFloor[],
  rooms: PlacedRoom[],
  hallways: Hallway[],
  paddingMm = 1200,
): AxisBounds {
  const layout = computeFloorDisplayLayout(unitId, floors, rooms, hallways);
  const content = floorLocalContentBounds(floorId, rooms, hallways);
  const offset = floorDisplayOffsetFor(floorId, layout);
  return {
    minX: content.minX + offset.displayOffsetXMm - paddingMm,
    maxX: content.maxX + offset.displayOffsetXMm + paddingMm,
    minZ: content.minZ + offset.displayOffsetZMm - paddingMm,
    maxZ: content.maxZ + offset.displayOffsetZMm + paddingMm,
  };
}

export function maxRoomHeightMmOnFloor(
  rooms: PlacedRoom[],
  floorId: string,
  fallbackMm = 2438,
): number {
  const floorRooms = placedRoomsOnFloor(rooms, floorId);
  if (floorRooms.length === 0) return fallbackMm;
  return Math.max(fallbackMm, ...floorRooms.map((room) => room.heightMm));
}

export function nextFloorSortOrder(unitId: string, floors: UnitFloor[]): number {
  return getFloorsForUnit(unitId, floors).length;
}

/** @deprecated Layout offsets are computed at render time; only sort order is needed when adding a floor. */
export function nextFloorDisplayOffset(
  unitId: string,
  floors: UnitFloor[],
  _placements: UnitRoomPlacement[],
  _rooms: PlacedRoom[],
): { displayOffsetXMm: number; displayOffsetZMm: number; sortOrder: number } {
  return {
    displayOffsetXMm: 0,
    displayOffsetZMm: 0,
    sortOrder: nextFloorSortOrder(unitId, floors),
  };
}

export function defaultFloorName(floors: UnitFloor[], unitId: string): string {
  const count = getFloorsForUnit(unitId, floors).length;
  if (count === 0) return "Main";
  if (count === 1) return "Second floor";
  return `Floor ${count + 1}`;
}

export function allFloorsBounds(
  unitId: string,
  floors: UnitFloor[],
  rooms: PlacedRoom[],
  hallways: Hallway[],
): AxisBounds {
  const unitFloors = getFloorsForUnit(unitId, floors);
  if (unitFloors.length === 0) {
    return {
      minX: -3000,
      maxX: 3000,
      minZ: -3000,
      maxZ: 3000,
    };
  }

  const layout = computeFloorDisplayLayout(unitId, floors, rooms, hallways);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const floor of unitFloors) {
    const bounds = floorIslandBounds(floor.id, layout, rooms, hallways);
    minX = Math.min(minX, bounds.minX);
    maxX = Math.max(maxX, bounds.maxX);
    minZ = Math.min(minZ, bounds.minZ);
    maxZ = Math.max(maxZ, bounds.maxZ);
  }

  return { minX, maxX, minZ, maxZ };
}
