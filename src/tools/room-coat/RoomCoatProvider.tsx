"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createId } from "@/shared/ids/createId";
import { PAGE_CONTAINER } from "@/shared/ui/page-container";
import { ensureSchemaVersion } from "@/core/storage/db";
import { useToast } from "@nexus/ui";
import { wallCenter } from "@/tools/room-coat/lib/unit-layout";
import {
  createDefaultUnit,
  defaultHallwayName,
  ensureMinimumState,
  nextRoomOrigin,
} from "@/tools/room-coat/lib/migrate-state";
import {
  getActiveUnit,
  getActiveFloorForState,
  getAvailableRoomsForUnit,
  getFloorsForActiveUnit,
  getFurnishingsForUnit,
  getHallwaysForUnit,
  getSnapPointsForUnit,
  resolvePlacedRooms,
} from "@/tools/room-coat/lib/unit-scope";
import { withoutBaseboardSurfaceOverrides } from "@/tools/room-coat/lib/baseboard-paint";
import {
  createDefaultFloor,
  defaultFloorName,
  nextFloorSortOrder,
} from "@/tools/room-coat/lib/floor-utils";
import { furnishingPresetById } from "@/tools/room-coat/lib/furnishing-presets";
import {
  defaultDoorDimensionsMm,
  defaultRoomDimensionsMm,
  defaultWindowDimensionsMm,
} from "@/tools/room-coat/lib/units";
import {
  boundsFromVertices,
  rectVerticesFromCenter,
  resizeRoomFootprint,
  scaleWallOffsetMm,
  translateVertices,
} from "@/tools/room-coat/lib/room-shape";
import { offsetToWorldOnWall } from "@/tools/room-coat/lib/wall-openings";
import {
  isWallSnapPoint,
  snapPointWorldMm,
} from "@/tools/room-coat/lib/snap-point-utils";
import type { HallwayConnectionOpening } from "@/tools/room-coat/lib/hallway-draft";
import { tryPlanHallwayExtension } from "@/tools/room-coat/lib/hallway-draft";
import {
  importRoomCoatSlice,
  loadRoomCoat,
  saveRoomCoat,
} from "@/tools/room-coat/storage";
import type {
  Furnishing,
  Hallway,
  HallwayWaypoint,
  HomeUnit,
  Door,
  Window,
  Paint,
  PlacedRoom,
  Room,
  RoomCoat,
  RoomCoatState,
  RoomCoatViewSettings,
  SnapPoint,
  UnitFloor,
  UnitPreference,
  WallSide,
} from "@/tools/room-coat/types/state";
import { DEFAULT_ROOM_COAT, DEFAULT_ROOM_COAT_STATE } from "@/tools/room-coat/types/state";

export interface AddRoomInput {
  name: string;
  widthMm?: number;
  lengthMm?: number;
  heightMm?: number;
  wallPaintId?: string | null;
  originXMm?: number;
  originZMm?: number;
  floorId?: string;
  verticesMm?: Array<{ xMm: number; zMm: number }>;
  closed?: boolean;
}

export interface AddRoomResult {
  roomId: string;
  placementId: string | null;
}

interface RoomCoatContextValue {
  state: RoomCoatState;
  activeUnit: HomeUnit;
  activeFloor: UnitFloor | null;
  unitFloors: UnitFloor[];
  activePlacedRooms: PlacedRoom[];
  allPlacedRooms: PlacedRoom[];
  activeHallways: Hallway[];
  allHallways: Hallway[];
  activeFurnishings: Furnishing[];
  activeSnapPoints: SnapPoint[];
  activePaints: Paint[];
  isReady: boolean;
  selectedSurfaceId: string | null;
  setSelectedSurfaceId: (surfaceId: string | null) => void;
  refresh: () => Promise<void>;
  setUnitPreference: (unit: UnitPreference) => Promise<void>;
  setShowCeilings: (show: boolean) => Promise<void>;
  setShowWallLabels: (show: boolean) => Promise<void>;
  setShowRoomLabels: (show: boolean) => Promise<void>;
  setShowFloorGrid: (show: boolean) => Promise<void>;
  setShowFurnishings: (show: boolean) => Promise<void>;
  setShowSnapPoints: (show: boolean) => Promise<void>;
  setShowClearanceLabels: (show: boolean) => Promise<void>;
  setSnapMode: (mode: RoomCoatViewSettings["snapMode"]) => Promise<void>;
  upsertPaint: (paint: Paint) => Promise<void>;
  deletePaint: (paintId: string) => Promise<void>;
  addUnit: (name: string) => Promise<string>;
  updateUnit: (unitId: string, patch: Partial<HomeUnit>) => Promise<void>;
  deleteUnit: (unitId: string) => Promise<void>;
  setActiveUnitId: (unitId: string) => Promise<void>;
  setActiveFloorId: (floorId: string) => Promise<void>;
  addFloor: (name?: string) => Promise<string>;
  addRoom: (input: AddRoomInput) => Promise<AddRoomResult>;
  updateRoom: (
    roomId: string,
    patch: Partial<Pick<Room, "name" | "widthMm" | "lengthMm" | "heightMm">>,
  ) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  attachRoomToUnit: (roomId: string, unitId?: string) => Promise<void>;
  detachRoomFromUnit: (placementId: string) => Promise<void>;
  moveRoom: (placementId: string, originXMm: number, originZMm: number) => Promise<void>;
  updatePlacedRoomDimensions: (
    placementId: string,
    patch: Partial<Pick<PlacedRoom, "widthMm" | "lengthMm" | "heightMm">>,
  ) => Promise<void>;
  addFurnishing: (
    input: Omit<Furnishing, "id" | "unitId" | "floorId"> & {
      unitId?: string;
      floorId?: string;
    },
  ) => Promise<string>;
  updateFurnishing: (
    furnishingId: string,
    patch: Partial<
      Pick<
        Furnishing,
        | "label"
        | "centerXMm"
        | "centerZMm"
        | "rotationDeg"
        | "widthMm"
        | "depthMm"
        | "heightMm"
        | "color"
        | "snapPointId"
        | "roomPlacementId"
      >
    >,
  ) => Promise<void>;
  deleteFurnishing: (furnishingId: string) => Promise<void>;
  addSnapPoint: (
    input: Omit<SnapPoint, "id" | "unitId" | "floorId"> & {
      unitId?: string;
      floorId?: string;
    },
  ) => Promise<string>;
  removeSnapPoint: (snapPointId: string) => Promise<void>;
  updateSnapPoint: (
    snapPointId: string,
    patch: Partial<
      Pick<
        SnapPoint,
        "xMm" | "zMm" | "label" | "rotationDeg" | "wallOffsetMm" | "hallwayWidthMm"
      >
    >,
  ) => Promise<void>;
  setRoomCoat: (placementId: string, coat: RoomCoat) => Promise<void>;
  setHallwayCoat: (hallwayId: string, coat: RoomCoat) => Promise<void>;
  setSurfaceOverride: (
    spaceId: string,
    surfaceId: string,
    paintId: string,
    kind: "room" | "hallway",
  ) => Promise<void>;
  clearSurfaceOverride: (
    spaceId: string,
    surfaceId: string,
    kind: "room" | "hallway",
  ) => Promise<void>;
  connectHallway: (
    unitId: string,
    roomAId: string,
    wallA: WallSide,
    roomBId: string,
    wallB: WallSide,
  ) => Promise<void>;
  addHallway: (
    unitId: string,
    waypoints: HallwayWaypoint[],
    widthMm?: number,
  ) => Promise<string>;
  createHallwayWithOpenings: (
    unitId: string,
    waypoints: HallwayWaypoint[],
    widthMm: number,
    openings: HallwayConnectionOpening[],
  ) => Promise<string>;
  undoLastEditorAction: () => Promise<boolean>;
  updateHallwayWaypoints: (
    hallwayId: string,
    waypoints: HallwayWaypoint[],
  ) => Promise<void>;
  addWallOpening: (
    placementId: string,
    wallIndex: number,
    startMm: number,
    endMm: number,
  ) => Promise<void>;
  addDoorToPlacement: (
    placementId: string,
    door: Omit<Door, "id" | "overridePaintId"> & { id?: string },
  ) => Promise<void>;
  updateDoor: (
    placementId: string,
    doorId: string,
    patch: Partial<
      Pick<
        Door,
        | "wallIndex"
        | "offsetFromCornerMm"
        | "widthMm"
        | "heightMm"
        | "hingeSide"
        | "swingsInward"
        | "overridePaintId"
      >
    >,
  ) => Promise<void>;
  removeDoor: (placementId: string, doorId: string) => Promise<void>;
  addWindowToPlacement: (
    placementId: string,
    wallIndex: number,
    offsetFromCornerMm: number,
  ) => Promise<void>;
  updateWindow: (
    placementId: string,
    windowId: string,
    patch: Partial<
      Pick<
        Window,
        "wallIndex" | "offsetFromCornerMm" | "widthMm" | "heightMm" | "sillHeightMm"
      >
    >,
  ) => Promise<void>;
  removeWindow: (placementId: string, windowId: string) => Promise<void>;
  removeWallOpening: (placementId: string, openingId: string) => Promise<void>;
  deleteHallway: (hallwayId: string) => Promise<void>;
  getAvailableRoomsForUnit: (unitId?: string) => Room[];
}

function activeFloorIdForUnit(state: RoomCoatState, unitId: string): string {
  const floor = getActiveFloorForState({
    ...state,
    activeUnitId: unitId,
  });
  if (floor) return floor.id;
  const existing = state.floors.find((item) => item.unitId === unitId);
  if (existing) return existing.id;
  return createDefaultFloor(unitId).id;
}

const RoomCoatContext = createContext<RoomCoatContextValue | null>(null);

function stripPaintReferences(
  state: RoomCoatState,
  paintId: string,
): RoomCoatState {
  const stripCoat = (coat: RoomCoat): RoomCoat => ({
    wallPaintId: coat.wallPaintId === paintId ? null : coat.wallPaintId,
    baseboardPaintId:
      coat.baseboardPaintId === paintId ? null : coat.baseboardPaintId,
    ceilingPaintId:
      coat.ceilingPaintId === paintId ? null : coat.ceilingPaintId,
    doorPaintId: coat.doorPaintId === paintId ? null : coat.doorPaintId,
    floorFinishType: coat.floorFinishType,
    floorFinishVariantId: coat.floorFinishVariantId,
  });

  return {
    ...state,
    units: state.units.map((unit) => ({
      ...unit,
      paints: unit.paints.filter((paint) => paint.id !== paintId),
      defaultCoat: stripCoat(unit.defaultCoat),
      hallwayCoat: stripCoat(unit.hallwayCoat),
    })),
    placements: state.placements.map((placement) => ({
      ...placement,
      coat: stripCoat(placement.coat),
      surfaceOverrides: Object.fromEntries(
        Object.entries(placement.surfaceOverrides).filter(
          ([, id]) => id !== paintId,
        ),
      ),
    })),
    rooms: state.rooms.map((room) => ({
      ...room,
      doors: room.doors.map((door) => ({
        ...door,
        overridePaintId:
          door.overridePaintId === paintId ? null : door.overridePaintId,
      })),
    })),
    hallways: state.hallways.map((hallway) => ({
      ...hallway,
      coat: stripCoat(hallway.coat),
      surfaceOverrides: Object.fromEntries(
        Object.entries(hallway.surfaceOverrides).filter(
          ([, id]) => id !== paintId,
        ),
      ),
    })),
  };
}

export function RoomCoatProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [state, setState] = useState<RoomCoatState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [selectedSurfaceId, setSelectedSurfaceId] = useState<string | null>(
    null,
  );
  const stateRef = useRef<RoomCoatState | null>(null);
  stateRef.current = state;
  const undoStackRef = useRef<RoomCoatState[]>([]);

  const pushUndoSnapshot = useCallback(() => {
    const current = stateRef.current;
    if (!current) return;
    undoStackRef.current.push(structuredClone(current));
    if (undoStackRef.current.length > 40) {
      undoStackRef.current.shift();
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      await ensureSchemaVersion();
      const loaded = await loadRoomCoat();
      setState(loaded);
    } catch (error) {
      console.error("Failed to load Room Coat state", error);
      toast.error(
        "Could not load saved data",
        "Starting from a fresh layout. Some saved work may be unavailable.",
      );
      const fresh = ensureMinimumState({ ...DEFAULT_ROOM_COAT_STATE });
      setState(fresh);
      try {
        await saveRoomCoat(fresh);
      } catch (saveError) {
        console.error("Failed to persist fallback Room Coat state", saveError);
        toast.error("Could not save changes", "Your work may not persist.");
      }
    } finally {
      setIsReady(true);
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persist = useCallback(
    async (next: RoomCoatState) => {
      stateRef.current = next;
      setState(next);
      try {
        await saveRoomCoat(next);
      } catch (error) {
        console.error("Failed to save Room Coat state", error);
        toast.error(
          "Could not save changes",
          "Your edits are shown but may not persist after refreshing.",
        );
      }
    },
    [toast],
  );

  const mutate = useCallback(
    async (updater: (current: RoomCoatState) => RoomCoatState) => {
      const current = stateRef.current;
      if (!current) return;
      await persist(updater(current));
    },
    [persist],
  );

  const undoLastEditorAction = useCallback(async (): Promise<boolean> => {
    const previous = undoStackRef.current.pop();
    if (!previous) return false;
    await persist(previous);
    return true;
  }, [persist]);

  const setUnitPreference = useCallback(
    async (unit: UnitPreference) => {
      await mutate((current) => ({ ...current, unitPreference: unit }));
    },
    [mutate],
  );

  const setShowCeilings = useCallback(
    async (show: boolean) => {
      await mutate((current) => ({
        ...current,
        viewSettings: { ...current.viewSettings, showCeilings: show },
      }));
    },
    [mutate],
  );

  const setShowWallLabels = useCallback(
    async (show: boolean) => {
      await mutate((current) => ({
        ...current,
        viewSettings: { ...current.viewSettings, showWallLabels: show },
      }));
    },
    [mutate],
  );

  const setShowRoomLabels = useCallback(
    async (show: boolean) => {
      await mutate((current) => ({
        ...current,
        viewSettings: { ...current.viewSettings, showRoomLabels: show },
      }));
    },
    [mutate],
  );

  const setShowFloorGrid = useCallback(
    async (show: boolean) => {
      await mutate((current) => ({
        ...current,
        viewSettings: { ...current.viewSettings, showFloorGrid: show },
      }));
    },
    [mutate],
  );

  const setShowFurnishings = useCallback(
    async (show: boolean) => {
      await mutate((current) => ({
        ...current,
        viewSettings: { ...current.viewSettings, showFurnishings: show },
      }));
    },
    [mutate],
  );

  const setShowSnapPoints = useCallback(
    async (show: boolean) => {
      await mutate((current) => ({
        ...current,
        viewSettings: { ...current.viewSettings, showSnapPoints: show },
      }));
    },
    [mutate],
  );

  const setShowClearanceLabels = useCallback(
    async (show: boolean) => {
      await mutate((current) => ({
        ...current,
        viewSettings: { ...current.viewSettings, showClearanceLabels: show },
      }));
    },
    [mutate],
  );

  const setSnapMode = useCallback(
    async (mode: RoomCoatViewSettings["snapMode"]) => {
      await mutate((current) => ({
        ...current,
        viewSettings: { ...current.viewSettings, snapMode: mode },
      }));
    },
    [mutate],
  );

  const upsertPaint = useCallback(
    async (paint: Paint) => {
      await mutate((current) => {
        const unit = getActiveUnit(current);
        if (!unit) return current;
        const exists = unit.paints.some((item) => item.id === paint.id);
        const paints = exists
          ? unit.paints.map((item) => (item.id === paint.id ? paint : item))
          : [...unit.paints, paint];
        return {
          ...current,
          units: current.units.map((item) =>
            item.id === unit.id ? { ...item, paints } : item,
          ),
        };
      });
    },
    [mutate],
  );

  const deletePaint = useCallback(
    async (paintId: string) => {
      await mutate((current) => stripPaintReferences(current, paintId));
    },
    [mutate],
  );

  const addUnit = useCallback(
    async (name: string) => {
      const unit = createDefaultUnit(name.trim() || "New unit");
      const floor = createDefaultFloor(unit.id, "Main");
      await mutate((current) => ({
        ...current,
        units: [...current.units, unit],
        floors: [...current.floors, floor],
        activeUnitId: unit.id,
        activeFloorId: floor.id,
      }));
      return unit.id;
    },
    [mutate],
  );

  const updateUnit = useCallback(
    async (unitId: string, patch: Partial<HomeUnit>) => {
      await mutate((current) => ({
        ...current,
        units: current.units.map((unit) => {
          if (unit.id !== unitId) return unit;
          const next = { ...unit, ...patch, id: unit.id };
          if (patch.defaultCoat && patch.hallwayCoat === undefined) {
            next.hallwayCoat = { ...patch.defaultCoat };
          } else if (patch.hallwayCoat && patch.defaultCoat === undefined) {
            next.defaultCoat = { ...patch.hallwayCoat };
          }
          return next;
        }),
      }));
    },
    [mutate],
  );

  const deleteUnit = useCallback(
    async (unitId: string) => {
      await mutate((current) => {
        if (current.units.length <= 1) return current;

        const units = current.units.filter((unit) => unit.id !== unitId);
        return {
          ...current,
          units,
          floors: current.floors.filter((floor) => floor.unitId !== unitId),
          placements: current.placements.filter(
            (placement) => placement.unitId !== unitId,
          ),
          hallways: current.hallways.filter(
            (hallway) => hallway.unitId !== unitId,
          ),
          furnishings: current.furnishings.filter(
            (item) => item.unitId !== unitId,
          ),
          snapPoints: current.snapPoints.filter(
            (point) => point.unitId !== unitId,
          ),
          floorLinks: current.floorLinks.filter((link) => link.unitId !== unitId),
          activeUnitId:
            current.activeUnitId === unitId
              ? (units[0]?.id ?? null)
              : current.activeUnitId,
          activeFloorId:
            current.activeUnitId === unitId
              ? (current.floors.find((floor) => floor.unitId === units[0]?.id)?.id ??
                null)
              : current.activeFloorId,
        };
      });
    },
    [mutate],
  );

  const setActiveUnitId = useCallback(
    async (unitId: string) => {
      await mutate((current) => {
        if (current.activeUnitId === unitId) return current;
        const floorId = activeFloorIdForUnit(current, unitId);
        return { ...current, activeUnitId: unitId, activeFloorId: floorId };
      });
      setSelectedSurfaceId(null);
    },
    [mutate],
  );

  const setActiveFloorId = useCallback(
    async (floorId: string) => {
      await mutate((current) => {
        if (!current.floors.some((floor) => floor.id === floorId)) return current;
        return { ...current, activeFloorId: floorId };
      });
    },
    [mutate],
  );

  const addFloor = useCallback(
    async (name?: string) => {
      let createdId = "";
      await mutate((current) => {
        const unitId = current.activeUnitId ?? current.units[0]?.id;
        if (!unitId) return current;
        const sortOrder = nextFloorSortOrder(unitId, current.floors);
        const floor: UnitFloor = {
          id: createId(),
          unitId,
          name: name?.trim() || defaultFloorName(current.floors, unitId),
          sortOrder,
          displayOffsetXMm: 0,
          displayOffsetZMm: 0,
        };
        createdId = floor.id;
        return {
          ...current,
          floors: [...current.floors, floor],
          activeFloorId: floor.id,
        };
      });
      return createdId;
    },
    [mutate],
  );

  const attachRoomToUnit = useCallback(
    async (roomId: string, unitId?: string) => {
      await mutate((current) => {
        const room = current.rooms.find((item) => item.id === roomId);
        const targetUnitId =
          unitId ?? current.activeUnitId ?? current.units[0]?.id;
        if (!room || !targetUnitId) return current;

        if (
          current.placements.some(
            (placement) =>
              placement.unitId === targetUnitId && placement.roomId === roomId,
          )
        ) {
          return current;
        }

        const origin = nextRoomOrigin(
          targetUnitId,
          current.placements,
          current.rooms,
        );
        const placement = {
          id: createId(),
          unitId: targetUnitId,
          floorId: activeFloorIdForUnit(current, targetUnitId),
          roomId,
          ...origin,
          verticesMm: rectVerticesFromCenter(
            origin.originXMm,
            origin.originZMm,
            room.widthMm,
            room.lengthMm,
          ),
          closed: true,
          coat: { ...DEFAULT_ROOM_COAT },
          surfaceOverrides: {},
          wallOpenings: [],
        };

        return {
          ...current,
          placements: [...current.placements, placement],
          activeUnitId: targetUnitId,
        };
      });
    },
    [mutate],
  );

  const addRoom = useCallback(
    async (input: AddRoomInput): Promise<AddRoomResult> => {
      let roomId = "";
      let placementId: string | null = null;
      await mutate((current) => {
        const defaults = defaultRoomDimensionsMm();
        const room: Room = {
          id: createId(),
          name: input.name.trim() || "New room",
          widthMm: Math.max(300, Math.round(input.widthMm ?? defaults.widthMm)),
          lengthMm: Math.max(300, Math.round(input.lengthMm ?? defaults.lengthMm)),
          heightMm: Math.max(300, Math.round(input.heightMm ?? defaults.heightMm)),
          doors: [],
        };
        roomId = room.id;

        const targetUnitId = current.activeUnitId ?? current.units[0]?.id;
        if (!targetUnitId) {
          return { ...current, rooms: [...current.rooms, room] };
        }

        const alreadyAttached = current.placements.some(
          (placement) =>
            placement.unitId === targetUnitId && placement.roomId === room.id,
        );

        const floorId =
          input.floorId ?? activeFloorIdForUnit(current, targetUnitId);
        const origin =
          input.originXMm !== undefined && input.originZMm !== undefined
            ? {
                originXMm: Math.round(input.originXMm),
                originZMm: Math.round(input.originZMm),
              }
            : nextRoomOrigin(
                targetUnitId,
                current.placements,
                [...current.rooms, room],
              );

        const verticesMm =
          input.verticesMm ??
          rectVerticesFromCenter(
            origin.originXMm,
            origin.originZMm,
            room.widthMm,
            room.lengthMm,
          );
        const closed = input.closed ?? true;
        const bounds = boundsFromVertices(verticesMm);
        const resolvedOrigin = input.verticesMm
          ? {
              originXMm: bounds.centerXMm,
              originZMm: bounds.centerZMm,
            }
          : origin;
        if (input.verticesMm) {
          room.widthMm = Math.max(room.widthMm, bounds.widthMm);
          room.lengthMm = Math.max(room.lengthMm, bounds.lengthMm);
        }

        const nextPlacementId = createId();
        placementId = alreadyAttached ? null : nextPlacementId;

        const nextPlacements = alreadyAttached
          ? current.placements
          : [
              ...current.placements,
              {
                id: nextPlacementId,
                unitId: targetUnitId,
                floorId,
                roomId: room.id,
                ...resolvedOrigin,
                verticesMm,
                closed,
                widthMm: room.widthMm,
                lengthMm: room.lengthMm,
                heightMm: room.heightMm,
                coat: {
                  ...DEFAULT_ROOM_COAT,
                  wallPaintId: input.wallPaintId ?? null,
                },
                surfaceOverrides: {},
                wallOpenings: [],
              },
            ];

        return {
          ...current,
          rooms: [...current.rooms, room],
          placements: nextPlacements,
          activeUnitId: targetUnitId,
        };
      });
      return { roomId, placementId };
    },
    [mutate],
  );

  const updateRoom = useCallback(
    async (
      roomId: string,
      patch: Partial<Pick<Room, "name" | "widthMm" | "lengthMm" | "heightMm">>,
    ) => {
      await mutate((current) => ({
        ...current,
        rooms: current.rooms.map((room) => {
          if (room.id !== roomId) return room;

          const next = { ...room };

          if (patch.name !== undefined) {
            const trimmed = patch.name.trim();
            if (!trimmed) return room;
            next.name = trimmed;
          }

          if (patch.widthMm !== undefined) {
            next.widthMm = Math.max(300, Math.round(patch.widthMm));
          }
          if (patch.lengthMm !== undefined) {
            next.lengthMm = Math.max(300, Math.round(patch.lengthMm));
          }
          if (patch.heightMm !== undefined) {
            next.heightMm = Math.max(300, Math.round(patch.heightMm));
          }

          return next;
        }),
      }));
    },
    [mutate],
  );

  const detachRoomFromUnit = useCallback(
    async (placementId: string) => {
      await mutate((current) => ({
        ...current,
        placements: current.placements.filter(
          (placement) => placement.id !== placementId,
        ),
      }));
      if (selectedSurfaceId?.startsWith(`${placementId}:`)) {
        setSelectedSurfaceId(null);
      }
    },
    [mutate, selectedSurfaceId],
  );

  const deleteRoom = useCallback(
    async (roomId: string) => {
      await mutate((current) => ({
        ...current,
        rooms: current.rooms.filter((room) => room.id !== roomId),
        placements: current.placements.filter(
          (placement) => placement.roomId !== roomId,
        ),
      }));
    },
    [mutate],
  );

  const moveRoom = useCallback(
    async (placementId: string, originXMm: number, originZMm: number) => {
      pushUndoSnapshot();
      await mutate((current) => ({
        ...current,
        placements: current.placements.map((placement) => {
          if (placement.id !== placementId) return placement;
          const dx = originXMm - placement.originXMm;
          const dz = originZMm - placement.originZMm;
          return {
            ...placement,
            originXMm,
            originZMm,
            verticesMm: translateVertices(placement.verticesMm ?? [], dx, dz),
          };
        }),
      }));
    },
    [mutate, pushUndoSnapshot],
  );

  const updatePlacedRoomDimensions = useCallback(
    async (
      placementId: string,
      patch: Partial<Pick<PlacedRoom, "widthMm" | "lengthMm" | "heightMm">>,
    ) => {
      pushUndoSnapshot();
      await mutate((current) => {
        const placement = current.placements.find((entry) => entry.id === placementId);
        if (!placement) return current;

        const closed = placement.closed ?? true;
        const minVertexCount = closed ? 3 : 2;
        const oldVertices =
          placement.verticesMm.length >= minVertexCount
            ? placement.verticesMm
            : rectVerticesFromCenter(
                placement.originXMm,
                placement.originZMm,
                placement.widthMm ?? 3000,
                placement.lengthMm ?? 3000,
              );

        let nextPlacement = { ...placement };

        if (patch.heightMm !== undefined) {
          nextPlacement.heightMm = Math.max(300, Math.round(patch.heightMm));
        }

        if (patch.widthMm !== undefined || patch.lengthMm !== undefined) {
          const resized = resizeRoomFootprint(
            {
              verticesMm: placement.verticesMm,
              closed,
              originXMm: placement.originXMm,
              originZMm: placement.originZMm,
              widthMm: placement.widthMm,
              lengthMm: placement.lengthMm,
              wallOpenings: placement.wallOpenings ?? [],
            },
            {
              widthMm: patch.widthMm,
              lengthMm: patch.lengthMm,
            },
          );

          nextPlacement = {
            ...nextPlacement,
            verticesMm: resized.verticesMm,
            originXMm: resized.originXMm,
            originZMm: resized.originZMm,
            widthMm: resized.widthMm,
            lengthMm: resized.lengthMm,
            wallOpenings: resized.wallOpenings,
          };
        }

        const resizedFootprint =
          patch.widthMm !== undefined || patch.lengthMm !== undefined;

        const roomForSnap: PlacedRoom = {
          placementId: placement.id,
          unitId: placement.unitId,
          floorId: placement.floorId,
          roomId: placement.roomId,
          name: "",
          widthMm: nextPlacement.widthMm ?? 3000,
          lengthMm: nextPlacement.lengthMm ?? 3000,
          heightMm: nextPlacement.heightMm ?? 2438,
          originXMm: nextPlacement.originXMm,
          originZMm: nextPlacement.originZMm,
          verticesMm: nextPlacement.verticesMm,
          closed,
          coat: placement.coat,
          doors: [],
          windows: [],
          surfaceOverrides: placement.surfaceOverrides,
          wallOpenings: nextPlacement.wallOpenings ?? [],
        };

        const scaledSnapPoints = resizedFootprint
          ? current.snapPoints.map((point) => {
              if (
                point.roomPlacementId !== placementId ||
                !isWallSnapPoint(point) ||
                point.wallIndex === undefined ||
                point.wallOffsetMm === undefined
              ) {
                return point;
              }

              const wallOffsetMm = scaleWallOffsetMm(
                point.wallIndex,
                point.wallOffsetMm,
                oldVertices,
                nextPlacement.verticesMm,
                closed,
              );
              const world = offsetToWorldOnWall(
                roomForSnap,
                point.wallIndex,
                wallOffsetMm,
              );
              return {
                ...point,
                wallOffsetMm,
                xMm: Math.round(world.x),
                zMm: Math.round(world.z),
              };
            })
          : current.snapPoints;

        return {
          ...current,
          placements: current.placements.map((entry) =>
            entry.id === placementId ? nextPlacement : entry,
          ),
          snapPoints: scaledSnapPoints,
        };
      });
    },
    [mutate, pushUndoSnapshot],
  );

  const addFurnishing = useCallback(
    async (
      input: Omit<Furnishing, "id" | "unitId" | "floorId"> & {
        unitId?: string;
        floorId?: string;
      },
    ) => {
      let createdId = "";
      await mutate((current) => {
        const unitId = input.unitId ?? current.activeUnitId ?? current.units[0]?.id;
        if (!unitId) return current;
        const floorId = input.floorId ?? activeFloorIdForUnit(current, unitId);
        const furnishing: Furnishing = {
          id: createId(),
          unitId,
          floorId,
          label: input.label,
          presetId: input.presetId,
          widthMm: input.widthMm,
          depthMm: input.depthMm,
          heightMm: input.heightMm,
          centerXMm: Math.round(input.centerXMm),
          centerZMm: Math.round(input.centerZMm),
          rotationDeg: input.rotationDeg,
          color: input.color,
          roomPlacementId: input.roomPlacementId,
          snapPointId: input.snapPointId ?? null,
        };
        createdId = furnishing.id;
        return {
          ...current,
          furnishings: [...current.furnishings, furnishing],
        };
      });
      return createdId;
    },
    [mutate],
  );

  const updateFurnishing = useCallback(
    async (
      furnishingId: string,
      patch: Partial<
        Pick<
          Furnishing,
          | "label"
          | "centerXMm"
          | "centerZMm"
          | "rotationDeg"
          | "widthMm"
          | "depthMm"
          | "heightMm"
          | "color"
          | "snapPointId"
          | "roomPlacementId"
        >
      >,
    ) => {
      pushUndoSnapshot();
      await mutate((current) => ({
        ...current,
        furnishings: current.furnishings.map((item) => {
          if (item.id !== furnishingId) return item;
          const next = { ...item, ...patch };
          if (patch.widthMm !== undefined) {
            next.widthMm = Math.max(150, Math.round(patch.widthMm));
          }
          if (patch.depthMm !== undefined) {
            next.depthMm = Math.max(150, Math.round(patch.depthMm));
          }
          if (patch.heightMm !== undefined) {
            next.heightMm = Math.max(150, Math.round(patch.heightMm));
          }
          return next;
        }),
      }));
    },
    [mutate, pushUndoSnapshot],
  );

  const deleteFurnishing = useCallback(
    async (furnishingId: string) => {
      pushUndoSnapshot();
      await mutate((current) => ({
        ...current,
        furnishings: current.furnishings.filter((item) => item.id !== furnishingId),
      }));
    },
    [mutate, pushUndoSnapshot],
  );

  const addSnapPoint = useCallback(
    async (
      input: Omit<SnapPoint, "id" | "unitId" | "floorId"> & {
        unitId?: string;
        floorId?: string;
      },
    ) => {
      let createdId = "";
      await mutate((current) => {
        const unitId = input.unitId ?? current.activeUnitId ?? current.units[0]?.id;
        if (!unitId) return current;
        const floorId = input.floorId ?? activeFloorIdForUnit(current, unitId);
        const point: SnapPoint = {
          id: createId(),
          unitId,
          floorId,
          kind: input.kind ?? "floor",
          xMm: Math.round(input.xMm),
          zMm: Math.round(input.zMm),
          label: input.label,
          rotationDeg: input.rotationDeg,
          consumeOnPlace:
            input.kind === "wall" ? false : input.consumeOnPlace !== false,
          roomPlacementId: input.roomPlacementId,
          wallIndex: input.wallIndex,
          wallOffsetMm: input.wallOffsetMm,
          hallwayWidthMm: input.hallwayWidthMm,
        };
        createdId = point.id;
        return {
          ...current,
          snapPoints: [...current.snapPoints, point],
        };
      });
      return createdId;
    },
    [mutate],
  );

  const removeSnapPoint = useCallback(
    async (snapPointId: string) => {
      await mutate((current) => ({
        ...current,
        snapPoints: current.snapPoints.filter((point) => point.id !== snapPointId),
        furnishings: current.furnishings.map((item) =>
          item.snapPointId === snapPointId
            ? { ...item, snapPointId: null }
            : item,
        ),
      }));
    },
    [mutate],
  );

  const updateSnapPoint = useCallback(
    async (
      snapPointId: string,
      patch: Partial<
        Pick<
          SnapPoint,
          "xMm" | "zMm" | "label" | "rotationDeg" | "wallOffsetMm" | "hallwayWidthMm"
        >
      >,
    ) => {
      pushUndoSnapshot();
      await mutate((current) => {
        const oldPoint = current.snapPoints.find((point) => point.id === snapPointId);
        if (!oldPoint) return current;

        const rooms = resolvePlacedRooms(current, oldPoint.unitId);
        let nextPoint: SnapPoint = { ...oldPoint, ...patch };

        if (
          isWallSnapPoint(nextPoint) &&
          nextPoint.wallIndex &&
          nextPoint.wallOffsetMm !== undefined
        ) {
          const room = rooms.find(
            (entry) => entry.placementId === nextPoint.roomPlacementId,
          );
          if (room) {
            const world = offsetToWorldOnWall(
              room,
              nextPoint.wallIndex,
              nextPoint.wallOffsetMm,
            );
            nextPoint = {
              ...nextPoint,
              xMm: Math.round(world.x),
              zMm: Math.round(world.z),
            };
          }
        } else if (patch.xMm !== undefined || patch.zMm !== undefined) {
          nextPoint = {
            ...nextPoint,
            xMm: Math.round(patch.xMm ?? nextPoint.xMm),
            zMm: Math.round(patch.zMm ?? nextPoint.zMm),
          };
        }

        const newWorld = snapPointWorldMm(nextPoint, rooms);

        return {
          ...current,
          snapPoints: current.snapPoints.map((point) =>
            point.id === snapPointId ? nextPoint : point,
          ),
          furnishings: current.furnishings.map((item) =>
            item.snapPointId === snapPointId
              ? {
                  ...item,
                  centerXMm: newWorld.xMm,
                  centerZMm: newWorld.zMm,
                }
              : item,
          ),
        };
      });
    },
    [mutate, pushUndoSnapshot],
  );

  const setRoomCoat = useCallback(
    async (placementId: string, coat: RoomCoat) => {
      await mutate((current) => ({
        ...current,
        placements: current.placements.map((placement) => {
          if (placement.id !== placementId) return placement;
          const room = resolvePlacedRooms(current, placement.unitId).find(
            (entry) => entry.placementId === placementId,
          );
          const surfaceOverrides =
            room &&
            coat.baseboardPaintId !== placement.coat.baseboardPaintId
              ? withoutBaseboardSurfaceOverrides(
                  placement.surfaceOverrides,
                  room,
                )
              : placement.surfaceOverrides;
          return { ...placement, coat, surfaceOverrides };
        }),
      }));
    },
    [mutate],
  );

  const setHallwayCoat = useCallback(
    async (hallwayId: string, coat: RoomCoat) => {
      await mutate((current) => ({
        ...current,
        hallways: current.hallways.map((hallway) => {
          if (hallway.id !== hallwayId) return hallway;
          const surfaceOverrides =
            coat.baseboardPaintId !== hallway.coat.baseboardPaintId
              ? withoutBaseboardSurfaceOverrides(
                  hallway.surfaceOverrides,
                  hallway,
                )
              : hallway.surfaceOverrides;
          return { ...hallway, coat, surfaceOverrides };
        }),
      }));
    },
    [mutate],
  );

  const setSurfaceOverride = useCallback(
    async (
      spaceId: string,
      surfaceId: string,
      paintId: string,
      kind: "room" | "hallway",
    ) => {
      await mutate((current) => {
        if (kind === "room") {
          return {
            ...current,
            placements: current.placements.map((placement) =>
              placement.id === spaceId
                ? {
                    ...placement,
                    surfaceOverrides: {
                      ...placement.surfaceOverrides,
                      [surfaceId]: paintId,
                    },
                  }
                : placement,
            ),
          };
        }
        return {
          ...current,
          hallways: current.hallways.map((hallway) =>
            hallway.id === spaceId
              ? {
                  ...hallway,
                  surfaceOverrides: {
                    ...hallway.surfaceOverrides,
                    [surfaceId]: paintId,
                  },
                }
              : hallway,
          ),
        };
      });
    },
    [mutate],
  );

  const clearSurfaceOverride = useCallback(
    async (spaceId: string, surfaceId: string, kind: "room" | "hallway") => {
      await mutate((current) => {
        if (kind === "room") {
          return {
            ...current,
            placements: current.placements.map((placement) => {
              if (placement.id !== spaceId) return placement;
              const { [surfaceId]: _, ...rest } = placement.surfaceOverrides;
              return { ...placement, surfaceOverrides: rest };
            }),
          };
        }
        return {
          ...current,
          hallways: current.hallways.map((hallway) => {
            if (hallway.id !== spaceId) return hallway;
            const { [surfaceId]: _, ...rest } = hallway.surfaceOverrides;
            return { ...hallway, surfaceOverrides: rest };
          }),
        };
      });
    },
    [mutate],
  );

  const connectHallway = useCallback(
    async (
      unitId: string,
      roomAId: string,
      wallA: WallSide,
      roomBId: string,
      wallB: WallSide,
    ) => {
      await mutate((current) => {
        const placedRooms = resolvePlacedRooms(current, unitId);
        const roomA = placedRooms.find((room) => room.placementId === roomAId);
        const roomB = placedRooms.find((room) => room.placementId === roomBId);
        const unit = current.units.find((item) => item.id === unitId);
        if (!roomA || !roomB || !unit) return current;

        const a = wallCenter(roomA, wallA);
        const b = wallCenter(roomB, wallB);
        const hallway: Hallway = {
          id: createId(),
          unitId,
          floorId: activeFloorIdForUnit(current, unitId),
          name: defaultHallwayName(current.hallways),
          widthMm: 914,
          heightMm: roomA.heightMm,
          waypointsMm: [
            { xMm: a.x, zMm: a.z },
            { xMm: b.x, zMm: b.z },
          ],
          coat: { ...unit.defaultCoat },
          surfaceOverrides: {},
          wallOpenings: [],
        };

        return {
          ...current,
          hallways: [...current.hallways, hallway],
        };
      });
    },
    [mutate],
  );

  const addHallway = useCallback(
    async (
      unitId: string,
      waypoints: HallwayWaypoint[],
      widthMm = 914,
    ) => {
      if (waypoints.length < 2) return "";
      let createdId = "";
      await mutate((current) => {
        const unit = current.units.find((item) => item.id === unitId);
        if (!unit) return current;
        const hallway: Hallway = {
          id: createId(),
          unitId,
          floorId: activeFloorIdForUnit(current, unitId),
          name: defaultHallwayName(current.hallways),
          widthMm,
          heightMm: 2438,
          waypointsMm: waypoints,
          coat: { ...unit.defaultCoat },
          surfaceOverrides: {},
          wallOpenings: [],
        };
        createdId = hallway.id;
        return { ...current, hallways: [...current.hallways, hallway] };
      });
      return createdId;
    },
    [mutate],
  );

  const createHallwayWithOpenings = useCallback(
    async (
      unitId: string,
      waypoints: HallwayWaypoint[],
      widthMm: number,
      openings: HallwayConnectionOpening[],
    ) => {
      if (waypoints.length < 2) return "";
      pushUndoSnapshot();
      let createdId = "";
      await mutate((current) => {
        const unit = current.units.find((item) => item.id === unitId);
        if (!unit) return current;

        let placements = current.placements;
        let hallways = [...current.hallways];

        const extension = tryPlanHallwayExtension(hallways, waypoints, openings);
        if (extension) {
          createdId = extension.hallwayId;
          hallways = hallways.map((parent) =>
            parent.id === extension.hallwayId
              ? { ...parent, waypointsMm: extension.waypoints }
              : parent,
          );

          for (const opening of extension.openings) {
            const lo = Math.min(opening.startMm, opening.endMm);
            const hi = Math.max(opening.startMm, opening.endMm);
            if (hi - lo < 100) continue;

            if (opening.kind === "room") {
              placements = placements.map((placement) => {
                if (placement.id !== opening.placementId) return placement;
                return {
                  ...placement,
                  wallOpenings: [
                    ...placement.wallOpenings,
                    {
                      id: createId(),
                      wallIndex: opening.wallIndex,
                      startMm: lo,
                      endMm: hi,
                      hallwayId: extension.hallwayId,
                    },
                  ],
                };
              });
            }
          }

          return {
            ...current,
            hallways,
            placements,
          };
        }

        const hallway: Hallway = {
          id: createId(),
          unitId,
          floorId: activeFloorIdForUnit(current, unitId),
          name: defaultHallwayName(current.hallways),
          widthMm,
          heightMm: 2438,
          waypointsMm: waypoints,
          coat: { ...unit.defaultCoat },
          surfaceOverrides: {},
          wallOpenings: [],
        };
        createdId = hallway.id;

        hallways = [...hallways, hallway];

        for (const opening of openings) {
          const lo = Math.min(opening.startMm, opening.endMm);
          const hi = Math.max(opening.startMm, opening.endMm);
          if (hi - lo < 100) continue;

          if (opening.kind === "room") {
            placements = placements.map((placement) => {
              if (placement.id !== opening.placementId) return placement;
              return {
                ...placement,
                wallOpenings: [
                  ...placement.wallOpenings,
                  {
                    id: createId(),
                    wallIndex: opening.wallIndex,
                    startMm: lo,
                    endMm: hi,
                    hallwayId: hallway.id,
                  },
                ],
              };
            });
            continue;
          }

          hallways = hallways.map((parent) => {
            if (parent.id !== opening.hallwayId) return parent;
            return {
              ...parent,
              wallOpenings: [
                ...parent.wallOpenings,
                {
                  id: createId(),
                  segIndex: opening.segIndex,
                  side: opening.side,
                  startMm: lo,
                  endMm: hi,
                  connectingHallwayId: hallway.id,
                },
              ],
            };
          });
        }

        return {
          ...current,
          hallways,
          placements,
        };
      });
      return createdId;
    },
    [mutate, pushUndoSnapshot],
  );

  const updateHallwayWaypoints = useCallback(
    async (hallwayId: string, waypoints: HallwayWaypoint[]) => {
      if (waypoints.length < 2) return;
      await mutate((current) => ({
        ...current,
        hallways: current.hallways.map((hallway) =>
          hallway.id === hallwayId ? { ...hallway, waypointsMm: waypoints } : hallway,
        ),
      }));
    },
    [mutate],
  );

  const addWallOpening = useCallback(
    async (
      placementId: string,
      wallIndex: number,
      startMm: number,
      endMm: number,
    ) => {
      const lo = Math.min(startMm, endMm);
      const hi = Math.max(startMm, endMm);
      if (hi - lo < 100) return;

      pushUndoSnapshot();
      await mutate((current) => ({
        ...current,
        placements: current.placements.map((placement) => {
          if (placement.id !== placementId) return placement;
          const opening = {
            id: createId(),
            wallIndex,
            startMm: lo,
            endMm: hi,
          };
          return {
            ...placement,
            wallOpenings: [...placement.wallOpenings, opening],
          };
        }),
      }));
    },
    [mutate, pushUndoSnapshot],
  );

  const addDoorToPlacement = useCallback(
    async (
      placementId: string,
      doorInput: Omit<Door, "id" | "overridePaintId"> & { id?: string },
    ) => {
      pushUndoSnapshot();
      await mutate((current) => ({
        ...current,
        placements: current.placements.map((placement) => {
          if (placement.id !== placementId) return placement;
          const door: Door = {
            id: doorInput.id ?? createId(),
            wallIndex: doorInput.wallIndex,
            widthMm: doorInput.widthMm,
            heightMm: doorInput.heightMm,
            offsetFromCornerMm: doorInput.offsetFromCornerMm,
            overridePaintId: null,
            hingeSide: doorInput.hingeSide ?? "left",
            swingsInward: doorInput.swingsInward !== false,
          };
          return {
            ...placement,
            doors: [...(placement.doors ?? []), door],
          };
        }),
      }));
    },
    [mutate, pushUndoSnapshot],
  );

  const updateDoor = useCallback(
    async (
      placementId: string,
      doorId: string,
      patch: Partial<
        Pick<
          Door,
          | "wallIndex"
          | "offsetFromCornerMm"
          | "widthMm"
          | "heightMm"
          | "hingeSide"
          | "swingsInward"
          | "overridePaintId"
        >
      >,
    ) => {
      pushUndoSnapshot();
      await mutate((current) => ({
        ...current,
        placements: current.placements.map((placement) => {
          if (placement.id !== placementId) return placement;
          return {
            ...placement,
            doors: (placement.doors ?? []).map((door) =>
              door.id === doorId ? { ...door, ...patch } : door,
            ),
          };
        }),
      }));
    },
    [mutate, pushUndoSnapshot],
  );

  const removeDoor = useCallback(
    async (placementId: string, doorId: string) => {
      pushUndoSnapshot();
      await mutate((current) => ({
        ...current,
        placements: current.placements.map((placement) => {
          if (placement.id !== placementId) return placement;
          return {
            ...placement,
            doors: (placement.doors ?? []).filter((door) => door.id !== doorId),
          };
        }),
      }));
    },
    [mutate, pushUndoSnapshot],
  );

  const addWindowToPlacement = useCallback(
    async (
      placementId: string,
      wallIndex: number,
      offsetFromCornerMm: number,
    ) => {
      const dims = defaultWindowDimensionsMm();
      pushUndoSnapshot();
      await mutate((current) => ({
        ...current,
        placements: current.placements.map((placement) => {
          if (placement.id !== placementId) return placement;
          const window = {
            id: createId(),
            wallIndex,
            widthMm: dims.widthMm,
            heightMm: dims.heightMm,
            sillHeightMm: dims.sillHeightMm,
            offsetFromCornerMm,
          };
          return {
            ...placement,
            windows: [...(placement.windows ?? []), window],
          };
        }),
      }));
    },
    [mutate, pushUndoSnapshot],
  );

  const updateWindow = useCallback(
    async (
      placementId: string,
      windowId: string,
      patch: Partial<
        Pick<
          Window,
          "wallIndex" | "offsetFromCornerMm" | "widthMm" | "heightMm" | "sillHeightMm"
        >
      >,
    ) => {
      pushUndoSnapshot();
      await mutate((current) => ({
        ...current,
        placements: current.placements.map((placement) => {
          if (placement.id !== placementId) return placement;
          return {
            ...placement,
            windows: (placement.windows ?? []).map((window) =>
              window.id === windowId ? { ...window, ...patch } : window,
            ),
          };
        }),
      }));
    },
    [mutate, pushUndoSnapshot],
  );

  const removeWindow = useCallback(
    async (placementId: string, windowId: string) => {
      pushUndoSnapshot();
      await mutate((current) => ({
        ...current,
        placements: current.placements.map((placement) => {
          if (placement.id !== placementId) return placement;
          return {
            ...placement,
            windows: (placement.windows ?? []).filter(
              (window) => window.id !== windowId,
            ),
          };
        }),
      }));
    },
    [mutate, pushUndoSnapshot],
  );

  const removeWallOpening = useCallback(
    async (placementId: string, openingId: string) => {
      await mutate((current) => ({
        ...current,
        placements: current.placements.map((placement) => {
          if (placement.id !== placementId) return placement;
          return {
            ...placement,
            wallOpenings: placement.wallOpenings.filter(
              (opening) => opening.id !== openingId,
            ),
          };
        }),
      }));
    },
    [mutate],
  );

  const deleteHallway = useCallback(
    async (hallwayId: string) => {
      pushUndoSnapshot();
      await mutate((current) => ({
        ...current,
        hallways: current.hallways
          .filter((hallway) => hallway.id !== hallwayId)
          .map((hallway) => ({
            ...hallway,
            wallOpenings: hallway.wallOpenings.filter(
              (opening) => opening.connectingHallwayId !== hallwayId,
            ),
          })),
        placements: current.placements.map((placement) => ({
          ...placement,
          wallOpenings: placement.wallOpenings.filter(
            (opening) => opening.hallwayId !== hallwayId,
          ),
        })),
      }));
      if (selectedSurfaceId?.startsWith(`${hallwayId}:`)) {
        setSelectedSurfaceId(null);
      }
    },
    [mutate, pushUndoSnapshot, selectedSurfaceId],
  );

  const getAvailableRooms = useCallback(
    (unitId?: string) => {
      const current = stateRef.current;
      if (!current) return [];
      const targetUnitId =
        unitId ?? current.activeUnitId ?? current.units[0]?.id;
      if (!targetUnitId) return [];
      return getAvailableRoomsForUnit(current, targetUnitId);
    },
    [],
  );

  const activeUnit = useMemo(() => {
    if (!state) return null;
    return getActiveUnit(state);
  }, [state]);

  const activeFloor = useMemo(() => {
    if (!state) return null;
    return getActiveFloorForState(state);
  }, [state]);

  const unitFloors = useMemo(() => {
    if (!state) return [];
    return getFloorsForActiveUnit(state);
  }, [state]);

  const allPlacedRooms = useMemo(() => {
    if (!state || !activeUnit) return [];
    return resolvePlacedRooms(state, activeUnit.id);
  }, [state, activeUnit]);

  const activePlacedRooms = useMemo(() => {
    if (!state || !activeUnit || !activeFloor) return [];
    return resolvePlacedRooms(state, activeUnit.id, activeFloor.id);
  }, [state, activeUnit, activeFloor]);

  const allHallways = useMemo(() => {
    if (!state || !activeUnit) return [];
    return getHallwaysForUnit(activeUnit.id, state.hallways);
  }, [state, activeUnit]);

  const activeHallways = useMemo(() => {
    if (!state || !activeUnit || !activeFloor) return [];
    return getHallwaysForUnit(activeUnit.id, state.hallways).filter(
      (hallway) => hallway.floorId === activeFloor.id,
    );
  }, [state, activeUnit, activeFloor]);

  const activeFurnishings = useMemo(() => {
    if (!state || !activeUnit || !activeFloor) return [];
    return getFurnishingsForUnit(state, activeUnit.id, activeFloor.id);
  }, [state, activeUnit, activeFloor]);

  const activeSnapPoints = useMemo(() => {
    if (!state || !activeUnit || !activeFloor) return [];
    return getSnapPointsForUnit(state, activeUnit.id, activeFloor.id);
  }, [state, activeUnit, activeFloor]);

  const activePaints = useMemo(() => activeUnit?.paints ?? [], [activeUnit]);

  const value = useMemo((): RoomCoatContextValue | null => {
    if (!state || !activeUnit) return null;

    return {
      state,
      activeUnit,
      activeFloor,
      unitFloors,
      activePlacedRooms,
      allPlacedRooms,
      activeHallways,
      allHallways,
      activeFurnishings,
      activeSnapPoints,
      activePaints,
      isReady,
      selectedSurfaceId,
      setSelectedSurfaceId,
      refresh,
      setUnitPreference,
      setShowCeilings,
      setShowWallLabels,
      setShowRoomLabels,
      setShowFloorGrid,
      setShowFurnishings,
      setShowSnapPoints,
      setShowClearanceLabels,
      setSnapMode,
      upsertPaint,
      deletePaint,
      addUnit,
      updateUnit,
      deleteUnit,
      setActiveUnitId,
      setActiveFloorId,
      addFloor,
      addRoom,
      updateRoom,
      deleteRoom,
      attachRoomToUnit,
      detachRoomFromUnit,
      moveRoom,
      updatePlacedRoomDimensions,
      addFurnishing,
      updateFurnishing,
      deleteFurnishing,
      addSnapPoint,
      removeSnapPoint,
      updateSnapPoint,
      setRoomCoat,
      setHallwayCoat,
      setSurfaceOverride,
      clearSurfaceOverride,
      connectHallway,
      addHallway,
      createHallwayWithOpenings,
      undoLastEditorAction,
      updateHallwayWaypoints,
      addWallOpening,
      addDoorToPlacement,
      updateDoor,
      removeDoor,
      addWindowToPlacement,
      updateWindow,
      removeWindow,
      removeWallOpening,
      deleteHallway,
      getAvailableRoomsForUnit: getAvailableRooms,
    };
  }, [
    state,
    activeUnit,
    activeFloor,
    unitFloors,
    activePlacedRooms,
    allPlacedRooms,
    activeHallways,
    allHallways,
    activeFurnishings,
    activeSnapPoints,
    activePaints,
    isReady,
    selectedSurfaceId,
    refresh,
    setUnitPreference,
    setShowCeilings,
    setShowWallLabels,
    setShowRoomLabels,
    setShowFloorGrid,
    setShowFurnishings,
    setShowSnapPoints,
    setShowClearanceLabels,
    setSnapMode,
    upsertPaint,
    deletePaint,
    addUnit,
    updateUnit,
    deleteUnit,
    setActiveUnitId,
    setActiveFloorId,
    addFloor,
    addRoom,
    updateRoom,
    deleteRoom,
    attachRoomToUnit,
    detachRoomFromUnit,
    moveRoom,
    updatePlacedRoomDimensions,
    addFurnishing,
    updateFurnishing,
    deleteFurnishing,
    addSnapPoint,
    removeSnapPoint,
    updateSnapPoint,
    setRoomCoat,
    setHallwayCoat,
    setSurfaceOverride,
    clearSurfaceOverride,
    connectHallway,
    addHallway,
    createHallwayWithOpenings,
    undoLastEditorAction,
    updateHallwayWaypoints,
    addWallOpening,
    addDoorToPlacement,
    updateDoor,
    removeDoor,
    addWindowToPlacement,
    updateWindow,
    removeWindow,
    removeWallOpening,
    deleteHallway,
    getAvailableRooms,
  ]);

  if (!isReady || !value) {
    return (
      <div className={`${PAGE_CONTAINER} py-20 text-center text-muted`}>
        Loading Room Coat…
      </div>
    );
  }

  return (
    <RoomCoatContext.Provider value={value}>{children}</RoomCoatContext.Provider>
  );
}

export function useRoomCoat(): RoomCoatContextValue {
  const context = useContext(RoomCoatContext);
  if (!context) {
    throw new Error("useRoomCoat must be used within RoomCoatProvider");
  }
  return context;
}

export { importRoomCoatSlice };
