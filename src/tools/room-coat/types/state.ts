export type UnitPreference = "imperial" | "metric";

export type SurfaceCategory = "wall" | "baseboard" | "ceiling" | "door";

export type WallSide = "north" | "south" | "east" | "west";

export interface Paint {
  id: string;
  code: string;
  brand?: string;
  name?: string;
  hex: string;
}

export interface RoomCoat {
  wallPaintId: string | null;
  baseboardPaintId: string | null;
  ceilingPaintId: string | null;
  doorPaintId: string | null;
}

export interface Door {
  id: string;
  wall: WallSide;
  widthMm: number;
  heightMm: number;
  offsetFromCornerMm: number;
  overridePaintId: string | null;
}

/** Gap along a room wall — open floor plan between rooms. */
export interface WallOpening {
  id: string;
  wall: WallSide;
  /** Distance from the wall's start corner along the wall edge, mm. */
  startMm: number;
  endMm: number;
  /** Set when an opening is created for a hallway connection. */
  hallwayId?: string | null;
}

/** Gap along a hallway segment wall — branch connection or manual opening. */
export interface HallwayWallOpening {
  id: string;
  segIndex: number;
  side: 0 | 1;
  /** Distance from the wall's start along the segment wall, mm. */
  startMm: number;
  endMm: number;
  /** Set when an opening is created for a connecting hallway. */
  connectingHallwayId?: string | null;
}

export interface HallwayWaypoint {
  xMm: number;
  zMm: number;
}

/** Catalog room — dimensions fixed at creation. */
export interface Room {
  id: string;
  name: string;
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  doors: Door[];
}

/** Room attached to a unit with layout and paint state. */
export interface UnitRoomPlacement {
  id: string;
  unitId: string;
  roomId: string;
  originXMm: number;
  originZMm: number;
  coat: RoomCoat;
  surfaceOverrides: Record<string, string>;
  wallOpenings: WallOpening[];
}

/** Merged placement + catalog room for rendering and paint resolution. */
export interface PlacedRoom {
  placementId: string;
  unitId: string;
  roomId: string;
  name: string;
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  originXMm: number;
  originZMm: number;
  coat: RoomCoat;
  doors: Door[];
  surfaceOverrides: Record<string, string>;
  wallOpenings: WallOpening[];
}

export interface HomeUnit {
  id: string;
  name: string;
  paints: Paint[];
  /** Unit-wide defaults — inherited by rooms and hallways unless overridden. */
  defaultCoat: RoomCoat;
  /** @deprecated Kept in sync with defaultCoat for older data paths. */
  hallwayCoat: RoomCoat;
}

/** Hallway centerline with corners — waypoints in world mm coordinates. */
export interface Hallway {
  id: string;
  unitId: string;
  name: string;
  widthMm: number;
  heightMm: number;
  waypointsMm: HallwayWaypoint[];
  coat: RoomCoat;
  surfaceOverrides: Record<string, string>;
  wallOpenings: HallwayWallOpening[];
}

export interface RoomCoatViewSettings {
  showCeilings: boolean;
  showWallLabels: boolean;
}

export interface RoomCoatState {
  schemaVersion: number;
  unitPreference: UnitPreference;
  viewSettings: RoomCoatViewSettings;
  units: HomeUnit[];
  rooms: Room[];
  placements: UnitRoomPlacement[];
  hallways: Hallway[];
  activeUnitId: string | null;
}

export const CURRENT_ROOM_COAT_SCHEMA_VERSION = 6;

export const DEFAULT_ROOM_COAT: RoomCoat = {
  wallPaintId: null,
  baseboardPaintId: null,
  ceilingPaintId: null,
  doorPaintId: null,
};

export const DEFAULT_VIEW_SETTINGS: RoomCoatViewSettings = {
  showCeilings: true,
  showWallLabels: true,
};

export const DEFAULT_ROOM_COAT_STATE: RoomCoatState = {
  schemaVersion: CURRENT_ROOM_COAT_SCHEMA_VERSION,
  unitPreference: "imperial",
  viewSettings: { ...DEFAULT_VIEW_SETTINGS },
  units: [],
  rooms: [],
  placements: [],
  hallways: [],
  activeUnitId: null,
};

export interface SurfaceDescriptor {
  id: string;
  roomId?: string;
  hallwayId?: string;
  category: SurfaceCategory;
  label: string;
  doorId?: string;
}

export type PaintableSpace = PlacedRoom | Hallway;

export function isPlacedRoom(space: PaintableSpace): space is PlacedRoom {
  return "placementId" in space;
}

export function isHallway(space: PaintableSpace): space is Hallway {
  return "waypointsMm" in space;
}

export function unitDefaultCoat(unit: HomeUnit): RoomCoat {
  return unit.defaultCoat ?? unit.hallwayCoat;
}
