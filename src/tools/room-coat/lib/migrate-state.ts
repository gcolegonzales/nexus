import { createId } from "@/shared/ids/createId";
import { wallCenter } from "@/tools/room-coat/lib/unit-layout";
import {
  rectVerticesFromCenter,
  WALL_SIDE_TO_INDEX,
} from "@/tools/room-coat/lib/room-shape";
import type {
  Hallway,
  HallwayWaypoint,
  HomeUnit,
  Paint,
  PlacedRoom,
  Room,
  RoomCoat,
  RoomCoatState,
  RoomVertex,
  UnitFloor,
  UnitRoomPlacement,
  WallOpening,
  WallSide,
} from "@/tools/room-coat/types/state";
import {
  CURRENT_ROOM_COAT_SCHEMA_VERSION,
  DEFAULT_ROOM_COAT,
  DEFAULT_ROOM_COAT_STATE,
  DEFAULT_VIEW_SETTINGS,
} from "@/tools/room-coat/types/state";
import { createDefaultFloor } from "@/tools/room-coat/lib/floor-utils";
import { createSeedPaints } from "@/tools/room-coat/lib/seed-paints";
import { isFloorFinishType } from "@/tools/room-coat/lib/floor-finishes";

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

  if (state.schemaVersion < 7) {
    state = migrateV6ToV7(state);
  }

  if (state.schemaVersion < 8) {
    state = migrateV7ToV8(state);
  }

  if (state.schemaVersion < 9) {
    state = migrateV8ToV9(state);
  }

  if (state.schemaVersion < 10) {
    state = migrateV9ToV10(state);
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
      floorId: "",
      roomId: room.id,
      originXMm: room.originXMm ?? 0,
      originZMm: room.originZMm ?? 0,
      verticesMm: rectVerticesFromCenter(
        room.originXMm ?? 0,
        room.originZMm ?? 0,
        room.widthMm,
        room.lengthMm,
      ),
      closed: true,
      coat: room.coat ?? { ...DEFAULT_ROOM_COAT },
      surfaceOverrides: room.surfaceOverrides ?? {},
      wallOpenings: [],
    }));

  return {
    schemaVersion: 3,
    unitPreference: raw.unitPreference,
    viewSettings: raw.viewSettings ?? { ...DEFAULT_VIEW_SETTINGS },
    units,
    floors: [],
    rooms,
    placements,
    hallways: raw.hallways ?? [],
    furnishings: [],
    snapPoints: [],
    floorLinks: [],
    activeUnitId: raw.activeUnitId,
    activeFloorId: null,
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
    const widthMm = placement.widthMm ?? room.widthMm;
    const lengthMm = placement.lengthMm ?? room.lengthMm;
    placedById.set(placement.id, {
      placementId: placement.id,
      unitId: placement.unitId,
      floorId: placement.floorId,
      roomId: room.id,
      name: room.name,
      widthMm,
      lengthMm,
      heightMm: room.heightMm,
      originXMm: placement.originXMm,
      originZMm: placement.originZMm,
      verticesMm:
        placement.verticesMm?.length >= 3
          ? placement.verticesMm
          : rectVerticesFromCenter(
              placement.originXMm,
              placement.originZMm,
              widthMm,
              lengthMm,
            ),
      closed: placement.closed ?? true,
      coat: placement.coat,
      doors: room.doors,
      windows: placement.windows ?? [],
      surfaceOverrides: placement.surfaceOverrides,
      wallOpenings: placement.wallOpenings,
    });
  }

  const hallways = (raw.hallways as LegacyV3Hallway[]).map((hallway) => {
    if (hallway.waypointsMm && hallway.waypointsMm.length >= 2) {
      return {
        id: hallway.id,
        unitId: hallway.unitId,
        floorId: hallway.floorId ?? "",
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
      floorId: hallway.floorId ?? "",
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
      showRoomLabels:
        raw.viewSettings.showRoomLabels ?? DEFAULT_VIEW_SETTINGS.showRoomLabels,
      showFloorGrid:
        raw.viewSettings.showFloorGrid ?? DEFAULT_VIEW_SETTINGS.showFloorGrid,
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

function migrateV6ToV7(raw: RoomCoatState): RoomCoatState {
  const floors: UnitFloor[] = [];
  const floorIdByUnit = new Map<string, string>();

  for (const unit of raw.units) {
    const floor = createDefaultFloor(unit.id, "Main");
    floors.push(floor);
    floorIdByUnit.set(unit.id, floor.id);
  }

  return {
    ...raw,
    schemaVersion: 7,
    floors,
    placements: raw.placements.map((placement) => ({
      ...placement,
      floorId:
        placement.floorId ??
        floorIdByUnit.get(placement.unitId) ??
        floors[0]?.id ??
        "",
    })),
    hallways: raw.hallways.map((hallway) => ({
      ...hallway,
      floorId:
        hallway.floorId ??
        floorIdByUnit.get(hallway.unitId) ??
        floors[0]?.id ??
        "",
    })),
    furnishings: raw.furnishings ?? [],
    snapPoints: raw.snapPoints ?? [],
    floorLinks: raw.floorLinks ?? [],
    activeFloorId:
      raw.activeFloorId ??
      (raw.activeUnitId
        ? floorIdByUnit.get(raw.activeUnitId) ?? floors[0]?.id ?? null
        : floors[0]?.id ?? null),
    viewSettings: {
      ...raw.viewSettings,
      showFurnishings:
        raw.viewSettings.showFurnishings ?? DEFAULT_VIEW_SETTINGS.showFurnishings,
      showSnapPoints:
        raw.viewSettings.showSnapPoints ?? DEFAULT_VIEW_SETTINGS.showSnapPoints,
      showClearanceLabels:
        raw.viewSettings.showClearanceLabels ??
        DEFAULT_VIEW_SETTINGS.showClearanceLabels,
      snapMode: raw.viewSettings.snapMode ?? DEFAULT_VIEW_SETTINGS.snapMode,
    },
  };
}

type LegacyWallSideOpening = WallOpening & { wall?: WallSide };

type LegacyPlacement = UnitRoomPlacement & {
  verticesMm?: RoomVertex[];
  closed?: boolean;
};

function migrateWallSideToIndex(wall: WallSide): number {
  return WALL_SIDE_TO_INDEX[wall];
}

function remapSurfaceOverrideKeys(
  overrides: Record<string, string>,
  placementId: string,
): Record<string, string> {
  const next: Record<string, string> = {};
  const wallPattern =
    /^(.+):wall:(north|south|east|west):(\d+)$/;
  const sides: WallSide[] = ["north", "south", "east", "west"];

  for (const [key, paintId] of Object.entries(overrides)) {
    const match = key.match(wallPattern);
    if (match && match[1] === placementId && sides.includes(match[2] as WallSide)) {
      const wallIndex = migrateWallSideToIndex(match[2] as WallSide);
      next[`${placementId}:wall:${wallIndex}:${match[3]}`] = paintId;
    } else {
      next[key] = paintId;
    }
  }

  return next;
}

function migrateV7ToV8(raw: RoomCoatState): RoomCoatState {
  const roomById = new Map(raw.rooms.map((room) => [room.id, room]));

  const rooms = raw.rooms.map((room) => ({
    ...room,
    doors: room.doors.map((door) => {
      const legacy = door as typeof door & { wall?: WallSide };
      if (typeof legacy.wall === "string") {
        return {
          ...door,
          wallIndex: migrateWallSideToIndex(legacy.wall),
        };
      }
      return door;
    }),
  }));

  const placements = raw.placements.map((placement) => {
    const legacy = placement as LegacyPlacement;
    const room = roomById.get(legacy.roomId);
    const widthMm = legacy.widthMm ?? room?.widthMm ?? 3000;
    const lengthMm = legacy.lengthMm ?? room?.lengthMm ?? 3000;
    const closed = legacy.closed ?? true;
    const verticesMm =
      legacy.verticesMm?.length >= (closed ? 3 : 2)
        ? legacy.verticesMm
        : rectVerticesFromCenter(
            legacy.originXMm,
            legacy.originZMm,
            widthMm,
            lengthMm,
          );

    const wallOpenings = (legacy.wallOpenings ?? []).map((opening) => {
      const legacyOpening = opening as LegacyWallSideOpening;
      if (typeof legacyOpening.wall === "string") {
        return {
          ...opening,
          wallIndex: migrateWallSideToIndex(legacyOpening.wall),
        };
      }
      return opening;
    });

    return {
      ...legacy,
      verticesMm,
      closed,
      wallOpenings,
      surfaceOverrides: remapSurfaceOverrideKeys(
        legacy.surfaceOverrides ?? {},
        legacy.id,
      ),
    };
  });

  const snapPoints = raw.snapPoints.map((point) => {
    const legacy = point as typeof point & { wall?: WallSide };
    if (typeof legacy.wall === "string") {
      return {
        ...point,
        wallIndex: migrateWallSideToIndex(legacy.wall),
      };
    }
    return point;
  });

  return {
    ...raw,
    schemaVersion: 8,
    rooms,
    placements,
    snapPoints,
  };
}

function normalizeCoat(coat: RoomCoat | undefined): RoomCoat {
  const base = coat ?? { ...DEFAULT_ROOM_COAT };
  return {
    wallPaintId: base.wallPaintId ?? null,
    baseboardPaintId: base.baseboardPaintId ?? null,
    ceilingPaintId: base.ceilingPaintId ?? null,
    doorPaintId: base.doorPaintId ?? null,
    floorFinishType:
      base.floorFinishType && isFloorFinishType(base.floorFinishType)
        ? base.floorFinishType
        : null,
    floorFinishVariantId:
      typeof base.floorFinishVariantId === "string"
        ? base.floorFinishVariantId
        : null,
  };
}

function migrateV8ToV9(raw: RoomCoatState): RoomCoatState {
  return {
    ...raw,
    schemaVersion: 9,
    units: raw.units.map((unit) => ({
      ...unit,
      defaultCoat: normalizeCoat(unit.defaultCoat),
      hallwayCoat: normalizeCoat(unit.hallwayCoat),
    })),
    placements: raw.placements.map((placement) => ({
      ...placement,
      coat: normalizeCoat(placement.coat),
    })),
    hallways: raw.hallways.map((hallway) => ({
      ...hallway,
      coat: normalizeCoat(hallway.coat),
    })),
  };
}

function migrateV9ToV10(raw: RoomCoatState): RoomCoatState {
  return {
    ...raw,
    schemaVersion: 10,
    placements: raw.placements.map((placement) => ({
      ...placement,
      doors: placement.doors ?? [],
      windows: placement.windows ?? [],
    })),
  };
}

export function createDefaultUnit(name = "My unit"): HomeUnit {
  const defaultCoat = { ...DEFAULT_ROOM_COAT };
  return {
    id: createId(),
    name,
    paints: createSeedPaints(),
    defaultCoat,
    hallwayCoat: { ...defaultCoat },
  };
}

function seedPaintsIfEmpty(units: HomeUnit[]): {
  units: HomeUnit[];
  changed: boolean;
} {
  let changed = false;
  const next = units.map((unit) => {
    if (unit.paints.length > 0) return unit;
    changed = true;
    return { ...unit, paints: createSeedPaints() };
  });
  return { units: next, changed };
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
  if (state.units.length > 0) {
    let next = state;
    if (state.floors.length === 0) {
      const floors = state.units.map((unit) => createDefaultFloor(unit.id, "Main"));
      const floorIdByUnit = new Map(floors.map((floor) => [floor.unitId, floor.id]));
      next = {
        ...state,
        floors,
        activeFloorId:
          state.activeFloorId ??
          (state.activeUnitId
            ? floorIdByUnit.get(state.activeUnitId) ?? floors[0]?.id ?? null
            : floors[0]?.id ?? null),
      };
    }
    const { units, changed: paintsSeeded } = seedPaintsIfEmpty(next.units);
    if (paintsSeeded) {
      next = { ...next, units };
    }
    return next;
  }

  const unit = createDefaultUnit();
  const floor = createDefaultFloor(unit.id, "Main");
  return {
    ...DEFAULT_ROOM_COAT_STATE,
    ...state,
    units: [unit],
    floors: [floor],
    activeUnitId: unit.id,
    activeFloorId: floor.id,
    schemaVersion: CURRENT_ROOM_COAT_SCHEMA_VERSION,
  };
}
