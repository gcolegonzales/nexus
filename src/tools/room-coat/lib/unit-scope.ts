import type {
  Hallway,
  HomeUnit,
  Paint,
  PlacedRoom,
  Room,
  RoomCoatState,
  UnitRoomPlacement,
} from "@/tools/room-coat/types/state";

export function getActiveUnit(state: RoomCoatState): HomeUnit | null {
  if (state.activeUnitId) {
    return state.units.find((unit) => unit.id === state.activeUnitId) ?? null;
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
  return {
    placementId: placement.id,
    unitId: placement.unitId,
    roomId: room.id,
    name: room.name,
    widthMm: room.widthMm,
    lengthMm: room.lengthMm,
    heightMm: room.heightMm,
    originXMm: placement.originXMm,
    originZMm: placement.originZMm,
    coat: placement.coat,
    doors: room.doors,
    surfaceOverrides: placement.surfaceOverrides,
    wallOpenings: placement.wallOpenings ?? [],
  };
}

export function resolvePlacedRooms(
  state: RoomCoatState,
  unitId: string,
): PlacedRoom[] {
  const roomById = new Map(state.rooms.map((room) => [room.id, room]));

  return getPlacementsForUnit(unitId, state.placements)
    .map((placement) => {
      const room = roomById.get(placement.roomId);
      if (!room) return null;
      return resolvePlacedRoom(placement, room);
    })
    .filter((room): room is PlacedRoom => room !== null);
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
