import { getItem, setItem } from "@/core/storage/db";
import { STORAGE_KEYS } from "@/core/storage/keys";
import { migrateStateIfNeeded, ensureMinimumState } from "@/tools/room-coat/lib/migrate-state";
import { isFloorFinishType } from "@/tools/room-coat/lib/floor-finishes";
import {
  CURRENT_ROOM_COAT_SCHEMA_VERSION,
  DEFAULT_ROOM_COAT,
  DEFAULT_ROOM_COAT_STATE,
  DEFAULT_VIEW_SETTINGS,
  type Door,
  type FloorLink,
  type Furnishing,
  type Hallway,
  type HallwayWallOpening,
  type HallwayWaypoint,
  type HomeUnit,
  type Paint,
  type Room,
  type RoomCoatState,
  type SnapPoint,
  type UnitFloor,
  type UnitPreference,
  type UnitRoomPlacement,
  type WallOpening,
  type WallSide,
  type Window,
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
    sheen:
      item.sheen === "flat" ||
      item.sheen === "eggshell" ||
      item.sheen === "satin" ||
      item.sheen === "semi-gloss"
        ? item.sheen
        : undefined,
    surfaceTexture:
      item.surfaceTexture === "orange-peel" ||
      item.surfaceTexture === "knockdown" ||
      item.surfaceTexture === "smooth"
        ? item.surfaceTexture
        : undefined,
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
    floorFinishType:
      typeof coat.floorFinishType === "string" &&
      isFloorFinishType(coat.floorFinishType)
        ? coat.floorFinishType
        : null,
    floorFinishVariantId:
      typeof coat.floorFinishVariantId === "string"
        ? coat.floorFinishVariantId
        : null,
  };
}

function parseDoor(value: unknown): Door | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Door> & { wall?: WallSide };
  if (
    typeof item.id !== "string" ||
    typeof item.widthMm !== "number" ||
    typeof item.heightMm !== "number" ||
    typeof item.offsetFromCornerMm !== "number"
  ) {
    return null;
  }
  const walls: WallSide[] = ["north", "south", "east", "west"];
  const wallIndex =
    typeof item.wallIndex === "number"
      ? item.wallIndex
      : walls.includes(item.wall as WallSide)
        ? { north: 2, south: 0, east: 1, west: 3 }[item.wall as WallSide]
        : null;
  if (wallIndex === null) return null;
  return {
    id: item.id,
    wallIndex,
    widthMm: item.widthMm,
    heightMm: item.heightMm,
    offsetFromCornerMm: item.offsetFromCornerMm,
    overridePaintId:
      typeof item.overridePaintId === "string" ? item.overridePaintId : null,
    hingeSide: item.hingeSide === "right" ? "right" : "left",
    swingsInward: item.swingsInward !== false,
  };
}

function parseWindow(value: unknown): Window | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Window>;
  if (
    typeof item.id !== "string" ||
    typeof item.wallIndex !== "number" ||
    typeof item.widthMm !== "number" ||
    typeof item.heightMm !== "number" ||
    typeof item.sillHeightMm !== "number" ||
    typeof item.offsetFromCornerMm !== "number"
  ) {
    return null;
  }
  return {
    id: item.id,
    wallIndex: item.wallIndex,
    widthMm: item.widthMm,
    heightMm: item.heightMm,
    sillHeightMm: item.sillHeightMm,
    offsetFromCornerMm: item.offsetFromCornerMm,
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
  const item = value as Partial<WallOpening> & { wall?: WallSide };
  if (
    typeof item.id !== "string" ||
    typeof item.startMm !== "number" ||
    typeof item.endMm !== "number"
  ) {
    return null;
  }
  const walls: WallSide[] = ["north", "south", "east", "west"];
  const wallIndex =
    typeof item.wallIndex === "number"
      ? item.wallIndex
      : walls.includes(item.wall as WallSide)
        ? { north: 2, south: 0, east: 1, west: 3 }[item.wall as WallSide]
        : null;
  if (wallIndex === null) return null;
  return {
    id: item.id,
    wallIndex,
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

  const verticesMm = Array.isArray(item.verticesMm)
    ? item.verticesMm
        .map(parseWaypoint)
        .filter((vertex): vertex is { xMm: number; zMm: number } => vertex !== null)
    : [];

  return {
    id: item.id,
    unitId: item.unitId,
    floorId: typeof item.floorId === "string" ? item.floorId : "",
    roomId: item.roomId,
    originXMm: item.originXMm,
    originZMm: item.originZMm,
    verticesMm,
    closed: item.closed !== false,
    widthMm: typeof item.widthMm === "number" ? item.widthMm : undefined,
    lengthMm: typeof item.lengthMm === "number" ? item.lengthMm : undefined,
    heightMm: typeof item.heightMm === "number" ? item.heightMm : undefined,
    coat: parseCoat(item.coat),
    surfaceOverrides: parseOverrides(item.surfaceOverrides),
    wallOpenings,
    doors: Array.isArray(item.doors)
      ? item.doors.map(parseDoor).filter((door): door is Door => door !== null)
      : [],
    windows: Array.isArray(item.windows)
      ? item.windows
          .map(parseWindow)
          .filter((window): window is Window => window !== null)
      : [],
  };
}

function parseFloor(value: unknown): UnitFloor | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<UnitFloor>;
  if (
    typeof item.id !== "string" ||
    typeof item.unitId !== "string" ||
    typeof item.name !== "string"
  ) {
    return null;
  }
  return {
    id: item.id,
    unitId: item.unitId,
    name: item.name,
    sortOrder: typeof item.sortOrder === "number" ? item.sortOrder : 0,
    displayOffsetXMm:
      typeof item.displayOffsetXMm === "number" ? item.displayOffsetXMm : 0,
    displayOffsetZMm:
      typeof item.displayOffsetZMm === "number" ? item.displayOffsetZMm : 0,
  };
}

function parseFurnishing(value: unknown): Furnishing | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<Furnishing>;
  const rotations = [0, 90, 180, 270] as const;
  if (
    typeof item.id !== "string" ||
    typeof item.unitId !== "string" ||
    typeof item.floorId !== "string" ||
    typeof item.label !== "string" ||
    typeof item.widthMm !== "number" ||
    typeof item.depthMm !== "number" ||
    typeof item.heightMm !== "number" ||
    typeof item.centerXMm !== "number" ||
    typeof item.centerZMm !== "number" ||
    !rotations.includes(item.rotationDeg as 0 | 90 | 180 | 270)
  ) {
    return null;
  }
  return {
    id: item.id,
    unitId: item.unitId,
    floorId: item.floorId,
    roomPlacementId:
      typeof item.roomPlacementId === "string"
        ? item.roomPlacementId
        : undefined,
    label: item.label,
    presetId: typeof item.presetId === "string" ? item.presetId : undefined,
    widthMm: item.widthMm,
    depthMm: item.depthMm,
    heightMm: item.heightMm,
    centerXMm: item.centerXMm,
    centerZMm: item.centerZMm,
    rotationDeg: item.rotationDeg as 0 | 90 | 180 | 270,
    color: typeof item.color === "string" ? item.color : undefined,
    snapPointId:
      typeof item.snapPointId === "string" ? item.snapPointId : null,
  };
}

function parseSnapPoint(value: unknown): SnapPoint | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<SnapPoint>;
  const rotations = [0, 90, 180, 270] as const;
  if (
    typeof item.id !== "string" ||
    typeof item.unitId !== "string" ||
    typeof item.floorId !== "string" ||
    typeof item.xMm !== "number" ||
    typeof item.zMm !== "number"
  ) {
    return null;
  }
  return {
    id: item.id,
    unitId: item.unitId,
    floorId: item.floorId,
    kind: item.kind === "wall" ? "wall" : "floor",
    roomPlacementId:
      typeof item.roomPlacementId === "string"
        ? item.roomPlacementId
        : undefined,
    wallIndex:
      typeof item.wallIndex === "number"
        ? item.wallIndex
        : typeof (item as { wall?: WallSide }).wall === "string" &&
            ["north", "south", "east", "west"].includes(
              (item as { wall?: WallSide }).wall as WallSide,
            )
          ? { north: 2, south: 0, east: 1, west: 3 }[
              (item as { wall: WallSide }).wall
            ]
          : undefined,
    wallOffsetMm:
      typeof item.wallOffsetMm === "number" ? item.wallOffsetMm : undefined,
    hallwayWidthMm:
      typeof item.hallwayWidthMm === "number" ? item.hallwayWidthMm : undefined,
    label: typeof item.label === "string" ? item.label : undefined,
    xMm: item.xMm,
    zMm: item.zMm,
    rotationDeg:
      item.rotationDeg !== undefined &&
      rotations.includes(item.rotationDeg as 0 | 90 | 180 | 270)
        ? (item.rotationDeg as 0 | 90 | 180 | 270)
        : undefined,
    consumeOnPlace: item.consumeOnPlace !== false,
  };
}

function parseFloorLink(value: unknown): FloorLink | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<FloorLink>;
  if (
    typeof item.id !== "string" ||
    typeof item.unitId !== "string" ||
    typeof item.fromFloorId !== "string" ||
    typeof item.toFloorId !== "string"
  ) {
    return null;
  }
  return {
    id: item.id,
    unitId: item.unitId,
    fromFloorId: item.fromFloorId,
    toFloorId: item.toFloorId,
    label: typeof item.label === "string" ? item.label : undefined,
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
    floorId: typeof item.floorId === "string" ? item.floorId : "",
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

  const floors = Array.isArray(item.floors)
    ? item.floors.map(parseFloor).filter((floor): floor is UnitFloor => floor !== null)
    : [];

  const furnishings = Array.isArray(item.furnishings)
    ? item.furnishings
        .map(parseFurnishing)
        .filter((entry): entry is Furnishing => entry !== null)
    : [];

  const snapPoints = Array.isArray(item.snapPoints)
    ? item.snapPoints
        .map(parseSnapPoint)
        .filter((entry): entry is SnapPoint => entry !== null)
    : [];

  const floorLinks = Array.isArray(item.floorLinks)
    ? item.floorLinks
        .map(parseFloorLink)
        .filter((entry): entry is FloorLink => entry !== null)
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
    showRoomLabels:
      item.viewSettings?.showRoomLabels ?? DEFAULT_VIEW_SETTINGS.showRoomLabels,
    showFloorGrid:
      item.viewSettings?.showFloorGrid ?? DEFAULT_VIEW_SETTINGS.showFloorGrid,
    showFurnishings:
      item.viewSettings?.showFurnishings ?? DEFAULT_VIEW_SETTINGS.showFurnishings,
    showSnapPoints:
      item.viewSettings?.showSnapPoints ?? DEFAULT_VIEW_SETTINGS.showSnapPoints,
    showClearanceLabels:
      item.viewSettings?.showClearanceLabels ??
      DEFAULT_VIEW_SETTINGS.showClearanceLabels,
    snapMode: item.viewSettings?.snapMode ?? DEFAULT_VIEW_SETTINGS.snapMode,
  };

  const activeFloorId =
    typeof item.activeFloorId === "string" &&
    floors.some((floor) => floor.id === item.activeFloorId)
      ? item.activeFloorId
      : floors.find((floor) => floor.unitId === activeUnitId)?.id ?? null;

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
    floors,
    rooms,
    placements,
    hallways,
    furnishings,
    snapPoints,
    floorLinks,
    activeUnitId,
    activeFloorId,
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
