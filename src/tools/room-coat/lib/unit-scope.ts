import type {
  Furnishing,
  Hallway,
  HomeUnit,
  Paint,
  PlacedRoom,
  Room,
  RoomCoatState,
  SnapPoint,
  UnitFloor,
  UnitRoomPlacement,
} from "@/tools/room-coat/types/state";
import { getActiveFloor, getFloorsForUnit } from "@/tools/room-coat/lib/floor-utils";
import {
  boundsFromVertices,
  rectVerticesFromCenter,
  roomVertices,
} from "@/tools/room-coat/lib/room-shape";

export function getActiveUnit(state: RoomCoatState): HomeUnit | null {
  if (state.activeUnitId) {
    const match = state.units.find((unit) => unit.id === state.activeUnitId);
    if (match) return match;
  }
  return state.units[0] ?? null;
}

export function getUnitPaints(state: RoomCoatState, unitId: string): Paint[] {
  return state.units.find((unit) => unit.id === unitId)?.paints ?? [];
}

export function getPlacementsForUnit(
  unitId: string,
  placements: UnitRoomPlacement[],
): UnitRoomPlacement[] {
  return placements.filter((placement) => placement.unitId === unitId);
}

export function getHallwaysForUnit(unitId: string, hallways: Hallway[]): Hallway[] {
  return hallways.filter((hallway) => hallway.unitId === unitId);
}

export function getRoomDefinition(
  state: RoomCoatState,
  roomId: string,
): Room | undefined {
  return state.rooms.find((room) => room.id === roomId);
}

export function resolvePlacedRoom(
  placement: UnitRoomPlacement,
  room: Room,
): PlacedRoom {
  const widthMm = placement.widthMm ?? room.widthMm;
  const lengthMm = placement.lengthMm ?? room.lengthMm;
  const heightMm = placement.heightMm ?? room.heightMm;
  const closed = placement.closed ?? true;
  const verticesMm =
    placement.verticesMm?.length >= (closed ? 3 : 2)
      ? placement.verticesMm
      : rectVerticesFromCenter(
          placement.originXMm,
          placement.originZMm,
          widthMm,
          lengthMm,
        );
  const bounds = boundsFromVertices(verticesMm);

  return {
    placementId: placement.id,
    unitId: placement.unitId,
    floorId: placement.floorId,
    roomId: room.id,
    name: room.name,
    widthMm: Math.max(widthMm, bounds.widthMm),
    lengthMm: Math.max(lengthMm, bounds.lengthMm),
    heightMm,
    originXMm: bounds.centerXMm,
    originZMm: bounds.centerZMm,
    verticesMm,
    closed,
    coat: placement.coat,
    doors: [...room.doors, ...(placement.doors ?? [])],
    windows: placement.windows ?? [],
    surfaceOverrides: placement.surfaceOverrides,
    wallOpenings: placement.wallOpenings ?? [],
  };
}

export function resolvePlacedRooms(
  state: RoomCoatState,
  unitId: string,
  floorId?: string | null,
): PlacedRoom[] {
  const roomById = new Map(state.rooms.map((room) => [room.id, room]));

  return getPlacementsForUnit(unitId, state.placements)
    .filter((placement) => !floorId || placement.floorId === floorId)
    .map((placement) => {
      const room = roomById.get(placement.roomId);
      if (!room) return null;
      return resolvePlacedRoom(placement, room);
    })
    .filter((room): room is PlacedRoom => room !== null);
}

export function getFloorsForActiveUnit(state: RoomCoatState): UnitFloor[] {
  const unit = getActiveUnit(state);
  if (!unit) return [];
  return getFloorsForUnit(unit.id, state.floors);
}

export function getActiveFloorForState(state: RoomCoatState): UnitFloor | null {
  const unit = getActiveUnit(state);
  if (!unit) return null;
  return getActiveFloor(state.floors, unit.id, state.activeFloorId);
}

export function getFurnishingsForUnit(
  state: RoomCoatState,
  unitId: string,
  floorId?: string | null,
): Furnishing[] {
  return state.furnishings.filter(
    (item) =>
      item.unitId === unitId && (!floorId || item.floorId === floorId),
  );
}

export function getSnapPointsForUnit(
  state: RoomCoatState,
  unitId: string,
  floorId?: string | null,
): SnapPoint[] {
  return state.snapPoints.filter(
    (point) =>
      point.unitId === unitId && (!floorId || point.floorId === floorId),
  );
}

export function getHallwaysForUnitScoped(
  unitId: string,
  hallways: Hallway[],
  floorId?: string | null,
): Hallway[] {
  return hallways.filter(
    (hallway) =>
      hallway.unitId === unitId && (!floorId || hallway.floorId === floorId),
  );
}

export function getAvailableRoomsForUnit(
  state: RoomCoatState,
  unitId: string,
): Room[] {
  const attachedRoomIds = new Set(
    getPlacementsForUnit(unitId, state.placements).map(
      (placement) => placement.roomId,
    ),
  );
  return state.rooms.filter((room) => !attachedRoomIds.has(room.id));
}

export function getUnitName(state: RoomCoatState, unitId: string): string {
  return state.units.find((unit) => unit.id === unitId)?.name ?? "Unknown unit";
}

export function placementIdsForRoom(
  state: RoomCoatState,
  roomId: string,
): string[] {
  return state.placements
    .filter((placement) => placement.roomId === roomId)
    .map((placement) => placement.id);
}
