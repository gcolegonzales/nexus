export type UnitPreference = "imperial" | "metric";

import type { FloorFinishType } from "@/tools/room-coat/lib/floor-finishes";

export type SurfaceCategory = "wall" | "baseboard" | "ceiling" | "door" | "window" | "floor";

export type WallSide = "north" | "south" | "east" | "west";

export interface Paint {
  id: string;
  code: string;
  brand?: string;
  name?: string;
  hex: string;
  sheen?: PaintSheen;
  surfaceTexture?: PaintSurfaceTexture;
}

export type PaintSheen = "flat" | "eggshell" | "satin" | "semi-gloss";
export type PaintSurfaceTexture = "smooth" | "orange-peel" | "knockdown";

export interface RoomCoat {
  wallPaintId: string | null;
  baseboardPaintId: string | null;
  ceilingPaintId: string | null;
  doorPaintId: string | null;
  floorFinishType: FloorFinishType | null;
  floorFinishVariantId: string | null;
}

export interface RoomVertex {
  xMm: number;
  zMm: number;
}

export type DoorHingeSide = "left" | "right";

export interface Door {
  id: string;
  wallIndex: number;
  widthMm: number;
  heightMm: number;
  offsetFromCornerMm: number;
  overridePaintId: string | null;
  hingeSide?: DoorHingeSide;
  /** When true (default), door swings into the room. */
  swingsInward?: boolean;
}

export interface Window {
  id: string;
  wallIndex: number;
  widthMm: number;
  heightMm: number;
  sillHeightMm: number;
  offsetFromCornerMm: number;
}

/** Gap along a room wall — open floor plan between rooms. */
export interface WallOpening {
  id: string;
  wallIndex: number;
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

/** Side-by-side floor island within a unit. */
export interface UnitFloor {
  id: string;
  unitId: string;
  name: string;
  sortOrder: number;
  displayOffsetXMm: number;
  displayOffsetZMm: number;
}

/** Axis-aligned furnishing on a floor (floor-local coordinates). */
export interface Furnishing {
  id: string;
  unitId: string;
  floorId: string;
  roomPlacementId?: string;
  label: string;
  presetId?: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  centerXMm: number;
  centerZMm: number;
  rotationDeg: 0 | 90 | 180 | 270;
  color?: string;
  snapPointId?: string | null;
}

/** User-placed anchor for snapping furnishings or hallway connections. */
export type SnapPointKind = "floor" | "wall";

export interface SnapPoint {
  id: string;
  unitId: string;
  floorId: string;
  kind: SnapPointKind;
  roomPlacementId?: string;
  /** Wall segment index when kind is "wall". */
  wallIndex?: number;
  /** Offset along the wall edge, mm. */
  wallOffsetMm?: number;
  /** Preferred hallway width when snapping a hallway to this point. */
  hallwayWidthMm?: number;
  label?: string;
  xMm: number;
  zMm: number;
  rotationDeg?: 0 | 90 | 180 | 270;
  consumeOnPlace: boolean;
}

/** Metadata link between floors (e.g. stairs) — no geometry yet. */
export interface FloorLink {
  id: string;
  unitId: string;
  fromFloorId: string;
  toFloorId: string;
  label?: string;
}

/** Room attached to a unit with layout and paint state. */
export interface UnitRoomPlacement {
  id: string;
  unitId: string;
  floorId: string;
  roomId: string;
  originXMm: number;
  originZMm: number;
  /** Wall centerline vertices in floor-local mm. */
  verticesMm: RoomVertex[];
  /** True for enclosed rooms; false for open wall chains. */
  closed: boolean;
  /** Per-placement size overrides (mm). Falls back to catalog room when unset. */
  widthMm?: number;
  lengthMm?: number;
  heightMm?: number;
  coat: RoomCoat;
  surfaceOverrides: Record<string, string>;
  wallOpenings: WallOpening[];
  doors?: Door[];
  windows?: Window[];
}

/** Merged placement + catalog room for rendering and paint resolution. */
export interface PlacedRoom {
  placementId: string;
  unitId: string;
  floorId: string;
  roomId: string;
  name: string;
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  originXMm: number;
  originZMm: number;
  verticesMm: RoomVertex[];
  closed: boolean;
  coat: RoomCoat;
  doors: Door[];
  windows: Window[];
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

/** Hallway centerline with corners — waypoints in floor-local mm coordinates. */
export interface Hallway {
  id: string;
  unitId: string;
  floorId: string;
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
  showRoomLabels: boolean;
  showFloorGrid: boolean;
  showFurnishings: boolean;
  showSnapPoints: boolean;
  showClearanceLabels: boolean;
  snapMode: "all" | "grid-walls" | "grid" | "off";
}

export interface RoomCoatState {
  schemaVersion: number;
  unitPreference: UnitPreference;
  viewSettings: RoomCoatViewSettings;
  units: HomeUnit[];
  floors: UnitFloor[];
  rooms: Room[];
  placements: UnitRoomPlacement[];
  hallways: Hallway[];
  furnishings: Furnishing[];
  snapPoints: SnapPoint[];
  floorLinks: FloorLink[];
  activeUnitId: string | null;
  activeFloorId: string | null;
}

export const CURRENT_ROOM_COAT_SCHEMA_VERSION = 10;

export const DEFAULT_ROOM_COAT: RoomCoat = {
  wallPaintId: null,
  baseboardPaintId: null,
  ceilingPaintId: null,
  doorPaintId: null,
  floorFinishType: null,
  floorFinishVariantId: null,
};

export const DEFAULT_VIEW_SETTINGS: RoomCoatViewSettings = {
  showCeilings: true,
  showWallLabels: true,
  showRoomLabels: true,
  showFloorGrid: false,
  showFurnishings: true,
  showSnapPoints: true,
  showClearanceLabels: true,
  snapMode: "all",
};

export const DEFAULT_ROOM_COAT_STATE: RoomCoatState = {
  schemaVersion: CURRENT_ROOM_COAT_SCHEMA_VERSION,
  unitPreference: "imperial",
  viewSettings: { ...DEFAULT_VIEW_SETTINGS },
  units: [],
  floors: [],
  rooms: [],
  placements: [],
  hallways: [],
  furnishings: [],
  snapPoints: [],
  floorLinks: [],
  activeUnitId: null,
  activeFloorId: null,
};

export interface SurfaceDescriptor {
  id: string;
  roomId?: string;
  hallwayId?: string;
  category: SurfaceCategory;
  label: string;
  doorId?: string;
  windowId?: string;
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
