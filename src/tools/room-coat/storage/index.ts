import { getItem, setItem } from "@/core/storage/db";
import { STORAGE_KEYS } from "@/core/storage/keys";
import { migrateStateIfNeeded, ensureMinimumState } from "@/tools/room-coat/lib/migrate-state";
import {
  CURRENT_ROOM_COAT_SCHEMA_VERSION,
  DEFAULT_ROOM_COAT,
  DEFAULT_ROOM_COAT_STATE,
  DEFAULT_VIEW_SETTINGS,
  type Door,
  type Hallway,
  type HallwayWallOpening,
  type HallwayWaypoint,
  type HomeUnit,
  type Paint,
  type Room,
  type RoomCoatState,
  type UnitPreference,
  type UnitRoomPlacement,
  type WallOpening,
  type WallSide,
} from "@/tools/room-coat/types/state";

function parsePaint(value: unknown): Paint | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Paint>;
  if (typeof item.id !== "string" || typeof item.code !== "string") return null;
  if (typeof item.hex !== "string") return null;
  return {
    id: item.id,
    code: item.code,
    brand: typeof item.brand === "string" ? item.brand : undefined,
    name: typeof item.name === "string" ? item.name : undefined,
    hex: item.hex,
  };
}

function parseCoat(value: unknown) {
  const coat = (value ?? DEFAULT_ROOM_COAT) as Partial<typeof DEFAULT_ROOM_COAT>;
  return {
    wallPaintId: typeof coat.wallPaintId === "string" ? coat.wallPaintId : null,
    baseboardPaintId:
      typeof coat.baseboardPaintId === "string" ? coat.baseboardPaintId : null,
    ceilingPaintId:
      typeof coat.ceilingPaintId === "string" ? coat.ceilingPaintId : null,
    doorPaintId: typeof coat.doorPaintId === "string" ? coat.doorPaintId : null,
  };
}

function parseDoor(value: unknown): Door | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Door>;
  const walls: WallSide[] = ["north", "south", "east", "west"];
  if (
    typeof item.id !== "string" ||
    !walls.includes(item.wall as WallSide) ||
    typeof item.widthMm !== "number" ||
    typeof item.heightMm !== "number" ||
    typeof item.offsetFromCornerMm !== "number"
  ) {
    return null;
  }
  return {
    id: item.id,
    wall: item.wall as WallSide,
    widthMm: item.widthMm,
    heightMm: item.heightMm,
    offsetFromCornerMm: item.offsetFromCornerMm,
    overridePaintId:
      typeof item.overridePaintId === "string" ? item.overridePaintId : null,
  };
}

function parseOverrides(value: unknown): Record<string, string> {
  const surfaceOverrides: Record<string, string> = {};
  if (value && typeof value === "object") {
    for (const [key, paintId] of Object.entries(value)) {
      if (typeof paintId === "string") surfaceOverrides[key] = paintId;
    }
  }
  return surfaceOverrides;
}

function parseRoom(value: unknown): Room | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Room> & {
    unitId?: string;
    originXMm?: number;
    coat?: unknown;
    surfaceOverrides?: unknown;
  };
  if (
    typeof item.id !== "string" ||
    typeof item.name !== "string" ||
    typeof item.widthMm !== "number" ||
    typeof item.lengthMm !== "number" ||
    typeof item.heightMm !== "number"
  ) {
    return null;
  }

  const doors = Array.isArray(item.doors)
    ? item.doors.map(parseDoor).filter((door): door is Door => door !== null)
    : [];

  return {
    id: item.id,
    name: item.name,
    widthMm: item.widthMm,
    lengthMm: item.lengthMm,
    heightMm: item.heightMm,
    doors,
  };
}

function parseWallOpening(value: unknown): WallOpening | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<WallOpening>;
  const walls: WallSide[] = ["north", "south", "east", "west"];
  if (
    typeof item.id !== "string" ||
    !walls.includes(item.wall as WallSide) ||
    typeof item.startMm !== "number" ||
    typeof item.endMm !== "number"
  ) {
    return null;
  }
  return {
    id: item.id,
    wall: item.wall as WallSide,
    startMm: item.startMm,
    endMm: item.endMm,
    hallwayId: typeof item.hallwayId === "string" ? item.hallwayId : null,
  };
}

function parseWaypoint(value: unknown): HallwayWaypoint | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<HallwayWaypoint>;
  if (typeof item.xMm !== "number" || typeof item.zMm !== "number") return null;
  return { xMm: item.xMm, zMm: item.zMm };
}
function parsePlacement(value: unknown): UnitRoomPlacement | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<UnitRoomPlacement>;
  if (
    typeof item.id !== "string" ||
    typeof item.unitId !== "string" ||
    typeof item.roomId !== "string" ||
    typeof item.originXMm !== "number" ||
    typeof item.originZMm !== "number"
  ) {
    return null;
  }

  const wallOpenings = Array.isArray(item.wallOpenings)
    ? item.wallOpenings
        .map(parseWallOpening)
        .filter((opening): opening is WallOpening => opening !== null)
    : [];

  return {
    id: item.id,
    unitId: item.unitId,
    roomId: item.roomId,
    originXMm: item.originXMm,
    originZMm: item.originZMm,
    coat: parseCoat(item.coat),
    surfaceOverrides: parseOverrides(item.surfaceOverrides),
    wallOpenings,
  };
}

function parseUnit(value: unknown): HomeUnit | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<HomeUnit>;
  if (typeof item.id !== "string" || typeof item.name !== "string") return null;

  const paints = Array.isArray(item.paints)
    ? item.paints.map(parsePaint).filter((paint): paint is Paint => paint !== null)
    : [];

  return {
    id: item.id,
    name: item.name,
    paints,
    defaultCoat: parseCoat(
      (item as Partial<HomeUnit>).defaultCoat ?? item.hallwayCoat,
    ),
    hallwayCoat: parseCoat(item.hallwayCoat),
  };
}

function parseHallway(value: unknown): Hallway | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Hallway> & {
    roomAId?: string;
    wallA?: WallSide;
    roomBId?: string;
    wallB?: WallSide;
  };
  if (
    typeof item.id !== "string" ||
    typeof item.unitId !== "string" ||
    typeof item.name !== "string" ||
    typeof item.widthMm !== "number" ||
    typeof item.heightMm !== "number"
  ) {
    return null;
  }

  const waypointsMm = Array.isArray(item.waypointsMm)
    ? item.waypointsMm
        .map(parseWaypoint)
        .filter((waypoint): waypoint is HallwayWaypoint => waypoint !== null)
    : [];

  return {
    id: item.id,
    unitId: item.unitId,
    name: item.name,
    widthMm: item.widthMm,
    heightMm: item.heightMm,
    waypointsMm,
    coat: parseCoat(item.coat),
    surfaceOverrides: parseOverrides(item.surfaceOverrides),
    wallOpenings: parseHallwayWallOpenings(item.wallOpenings),
  };
}

function parseHallwayWallOpenings(value: unknown): HallwayWallOpening[] {
  if (!Array.isArray(value)) return [];

  const openings: HallwayWallOpening[] = [];
  for (const opening of value) {
    if (!opening || typeof opening !== "object") continue;
    const row = opening as Partial<HallwayWallOpening>;
    if (
      typeof row.id !== "string" ||
      typeof row.segIndex !== "number" ||
      (row.side !== 0 && row.side !== 1) ||
      typeof row.startMm !== "number" ||
      typeof row.endMm !== "number"
    ) {
      continue;
    }
    openings.push({
      id: row.id,
      segIndex: row.segIndex,
      side: row.side,
      startMm: row.startMm,
      endMm: row.endMm,
      connectingHallwayId:
        typeof row.connectingHallwayId === "string"
          ? row.connectingHallwayId
          : undefined,
    });
  }
  return openings;
}

function normalizeState(raw: unknown): RoomCoatState {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_ROOM_COAT_STATE };
  }

  const item = raw as Partial<RoomCoatState> & {
    paints?: Paint[];
    activeRoomId?: string | null;
  };

  const unitPreference: UnitPreference =
    item.unitPreference === "metric" ? "metric" : "imperial";

  const legacyPaints = Array.isArray(item.paints)
    ? item.paints.map(parsePaint).filter((paint): paint is Paint => paint !== null)
    : [];

  const rooms = Array.isArray(item.rooms)
    ? item.rooms.map(parseRoom).filter((room): room is Room => room !== null)
    : [];

  const units = Array.isArray(item.units)
    ? item.units.map(parseUnit).filter((unit): unit is HomeUnit => unit !== null)
    : [];

  const placements = Array.isArray(item.placements)
    ? item.placements
        .map(parsePlacement)
        .filter((placement): placement is UnitRoomPlacement => placement !== null)
    : [];

  const hallways = Array.isArray(item.hallways)
    ? item.hallways
        .map(parseHallway)
        .filter((hallway): hallway is Hallway => hallway !== null)
    : [];

  const activeUnitId =
    typeof item.activeUnitId === "string" &&
    units.some((unit) => unit.id === item.activeUnitId)
      ? item.activeUnitId
      : units[0]?.id ?? null;

  const viewSettings = {
    showCeilings:
      item.viewSettings?.showCeilings ?? DEFAULT_VIEW_SETTINGS.showCeilings,
    showWallLabels:
      item.viewSettings?.showWallLabels ?? DEFAULT_VIEW_SETTINGS.showWallLabels,
  };

  const base: RoomCoatState = {
    schemaVersion:
      typeof item.schemaVersion === "number" ? item.schemaVersion : 1,
    unitPreference,
    viewSettings,
    units:
      units.length > 0
        ? units
        : legacyPaints.length > 0
          ? []
          : units,
    rooms,
    placements,
    hallways,
    activeUnitId,
  };

  if (legacyPaints.length > 0 && base.schemaVersion < 3) {
    (base as RoomCoatState & { paints?: Paint[] }).paints = legacyPaints;
  }

  return migrateStateIfNeeded(base);
}

export async function loadRoomCoat(): Promise<RoomCoatState> {
  const raw = await getItem<unknown>(STORAGE_KEYS.roomCoat);
  if (!raw) {
    const fresh = ensureMinimumState({ ...DEFAULT_ROOM_COAT_STATE });
    await saveRoomCoat(fresh);
    return fresh;
  }
  const loaded = normalizeState(raw);
  if (loaded.units.length === 0) {
    const fresh = ensureMinimumState(loaded);
    await saveRoomCoat(fresh);
    return fresh;
  }
  return loaded;
}

export async function saveRoomCoat(state: RoomCoatState): Promise<void> {
  await setItem(STORAGE_KEYS.roomCoat, {
    ...state,
    schemaVersion: CURRENT_ROOM_COAT_SCHEMA_VERSION,
  });
}

export function importRoomCoatSlice(data: unknown): RoomCoatState {
  return normalizeState(data);
}
