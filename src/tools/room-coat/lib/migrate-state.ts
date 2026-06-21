import { createId } from "@/shared/ids/createId";
import { wallCenter } from "@/tools/room-coat/lib/unit-layout";
import type {
  Hallway,
  HallwayWaypoint,
  HomeUnit,
  Paint,
  PlacedRoom,
  Room,
  RoomCoat,
  RoomCoatState,
  UnitRoomPlacement,
  WallSide,
} from "@/tools/room-coat/types/state";
import {
  CURRENT_ROOM_COAT_SCHEMA_VERSION,
  DEFAULT_ROOM_COAT,
  DEFAULT_ROOM_COAT_STATE,
  DEFAULT_VIEW_SETTINGS,
} from "@/tools/room-coat/types/state";

const ROOM_SPACING_MM = 6000;

type LegacyV2Room = Room & {
  unitId?: string;
  originXMm?: number;
  originZMm?: number;
  coat?: RoomCoat;
  surfaceOverrides?: Record<string, string>;
};

type LegacyV2State = RoomCoatState & {
  paints?: Paint[];
  activeRoomId?: string | null;
  rooms: LegacyV2Room[];
  placements?: UnitRoomPlacement[];
};

export function migrateStateIfNeeded(raw: RoomCoatState): RoomCoatState {
  let state = raw as LegacyV2State;

  if (state.schemaVersion < 2) {
    state = migrateV1ToV2(state);
  }

  if (state.schemaVersion < 3) {
    state = migrateV2ToV3(state);
  }

  if (state.schemaVersion < 4) {
    state = migrateV3ToV4(state);
  }

  if (state.schemaVersion < 5) {
    state = migrateV4ToV5(state);
  }

  if (state.schemaVersion < 6) {
    state = migrateV5ToV6(state);
  }

  return ensureMinimumState(state);
}

function migrateV1ToV2(raw: LegacyV2State): LegacyV2State {
  const legacyRooms = raw.rooms as LegacyV2Room[];

  if (legacyRooms.length === 0) {
    return {
      ...raw,
      schemaVersion: 2,
      viewSettings: raw.viewSettings ?? { ...DEFAULT_VIEW_SETTINGS },
      units: [],
      hallways: [],
      activeUnitId: null,
    };
  }

  const unitId = createId();
  const unit: HomeUnit = {
    id: unitId,
    name: "My unit",
    paints: raw.paints ?? [],
    defaultCoat: { ...DEFAULT_ROOM_COAT },
    hallwayCoat: { ...DEFAULT_ROOM_COAT },
  };

  const rooms: LegacyV2Room[] = legacyRooms.map((room, index) => ({
    ...room,
    unitId,
    originXMm: room.originXMm ?? index * ROOM_SPACING_MM,
    originZMm: room.originZMm ?? 0,
  }));

  return {
    ...raw,
    schemaVersion: 2,
    viewSettings: raw.viewSettings ?? { ...DEFAULT_VIEW_SETTINGS },
    units: [unit],
    rooms,
    hallways: [],
    activeUnitId: unitId,
  };
}

function migrateV2ToV3(raw: LegacyV2State): RoomCoatState {
  const globalPaints = raw.paints ?? [];
  const legacyRooms = raw.rooms as LegacyV2Room[];

  const units: HomeUnit[] = raw.units.map((unit, index) => {
    const hallwayCoat = unit.hallwayCoat ?? { ...DEFAULT_ROOM_COAT };
    return {
      ...unit,
      paints: index === 0 ? globalPaints : [],
      defaultCoat: unit.defaultCoat ?? { ...hallwayCoat },
      hallwayCoat: { ...hallwayCoat },
    };
  });

  const rooms: Room[] = legacyRooms.map((room) => ({
    id: room.id,
    name: room.name,
    widthMm: room.widthMm,
    lengthMm: room.lengthMm,
    heightMm: room.heightMm,
    doors: room.doors ?? [],
  }));

  const placements: UnitRoomPlacement[] = legacyRooms
    .filter((room) => room.unitId)
    .map((room) => ({
      id: room.id,
      unitId: room.unitId!,
      roomId: room.id,
      originXMm: room.originXMm ?? 0,
      originZMm: room.originZMm ?? 0,
      coat: room.coat ?? { ...DEFAULT_ROOM_COAT },
      surfaceOverrides: room.surfaceOverrides ?? {},
      wallOpenings: [],
    }));

  return {
    schemaVersion: 3,
    unitPreference: raw.unitPreference,
    viewSettings: raw.viewSettings ?? { ...DEFAULT_VIEW_SETTINGS },
    units,
    rooms,
    placements,
    hallways: raw.hallways ?? [],
    activeUnitId: raw.activeUnitId,
  };
}

type LegacyV3Hallway = Hallway & {
  roomAId?: string;
  wallA?: WallSide;
  roomBId?: string;
  wallB?: WallSide;
};

function migrateV3ToV4(raw: RoomCoatState): RoomCoatState {
  const roomById = new Map(raw.rooms.map((room) => [room.id, room]));
  const placements = raw.placements.map((placement) => ({
    ...placement,
    wallOpenings: placement.wallOpenings ?? [],
  }));

  const placedById = new Map<string, PlacedRoom>();
  for (const placement of placements) {
    const room = roomById.get(placement.roomId);
    if (!room) continue;
    placedById.set(placement.id, {
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
      wallOpenings: placement.wallOpenings,
    });
  }

  const hallways = (raw.hallways as LegacyV3Hallway[]).map((hallway) => {
    if (hallway.waypointsMm && hallway.waypointsMm.length >= 2) {
      return {
        id: hallway.id,
        unitId: hallway.unitId,
        name: hallway.name,
        widthMm: hallway.widthMm,
        heightMm: hallway.heightMm,
        waypointsMm: hallway.waypointsMm,
        coat: hallway.coat,
        surfaceOverrides: hallway.surfaceOverrides,
        wallOpenings: hallway.wallOpenings ?? [],
      };
    }

    const legacy = hallway as LegacyV3Hallway;
    const roomA = legacy.roomAId
      ? placedById.get(legacy.roomAId)
      : undefined;
    const roomB = legacy.roomBId
      ? placedById.get(legacy.roomBId)
      : undefined;

    let waypointsMm: HallwayWaypoint[] = [];
    if (roomA && roomB && legacy.wallA && legacy.wallB) {
      const a = wallCenter(roomA, legacy.wallA);
      const b = wallCenter(roomB, legacy.wallB);
      waypointsMm = [
        { xMm: a.x, zMm: a.z },
        { xMm: b.x, zMm: b.z },
      ];
    }

    return {
      id: hallway.id,
      unitId: hallway.unitId,
      name: hallway.name,
      widthMm: hallway.widthMm,
      heightMm: hallway.heightMm,
      waypointsMm,
      coat: hallway.coat,
      surfaceOverrides: hallway.surfaceOverrides,
      wallOpenings: hallway.wallOpenings ?? [],
    };
  });

  return {
    ...raw,
    schemaVersion: 4,
    placements,
    hallways,
  };
}

function migrateV4ToV5(raw: RoomCoatState): RoomCoatState {
  return {
    ...raw,
    schemaVersion: 5,
    hallways: raw.hallways.map((hallway) => ({
      ...hallway,
      wallOpenings: hallway.wallOpenings ?? [],
    })),
    viewSettings: {
      ...raw.viewSettings,
      showWallLabels:
        raw.viewSettings.showWallLabels ?? DEFAULT_VIEW_SETTINGS.showWallLabels,
    },
  };
}

function migrateV5ToV6(raw: RoomCoatState): RoomCoatState {
  return {
    ...raw,
    schemaVersion: 6,
    units: raw.units.map((unit) => {
      const legacy = unit as HomeUnit & { defaultCoat?: RoomCoat };
      const defaultCoat =
        legacy.defaultCoat ?? unit.hallwayCoat ?? { ...DEFAULT_ROOM_COAT };
      return {
        ...unit,
        defaultCoat: { ...defaultCoat },
        hallwayCoat: { ...defaultCoat },
      };
    }),
  };
}

export function createDefaultUnit(name = "My unit"): HomeUnit {
  const defaultCoat = { ...DEFAULT_ROOM_COAT };
  return {
    id: createId(),
    name,
    paints: [],
    defaultCoat,
    hallwayCoat: { ...defaultCoat },
  };
}

export function nextRoomOrigin(
  unitId: string,
  placements: UnitRoomPlacement[],
  rooms: Room[],
): {
  originXMm: number;
  originZMm: number;
} {
  const unitPlacements = placements.filter(
    (placement) => placement.unitId === unitId,
  );
  if (unitPlacements.length === 0) {
    return { originXMm: 0, originZMm: 0 };
  }

  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const maxX = Math.max(
    ...unitPlacements.map((placement) => {
      const room = roomById.get(placement.roomId);
      const width = room?.widthMm ?? 0;
      return placement.originXMm + width / 2;
    }),
  );

  return { originXMm: maxX + ROOM_SPACING_MM / 2, originZMm: 0 };
}

export function defaultHallwayName(hallways: Hallway[]): string {
  return `Hallway ${hallways.length + 1}`;
}

export function ensureMinimumState(state: RoomCoatState): RoomCoatState {
  if (state.units.length > 0) return state;

  const unit = createDefaultUnit();
  return {
    ...DEFAULT_ROOM_COAT_STATE,
    ...state,
    units: [unit],
    activeUnitId: unit.id,
    schemaVersion: CURRENT_ROOM_COAT_SCHEMA_VERSION,
  };
}
