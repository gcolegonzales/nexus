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
import { ensureSchemaVersion } from "@/core/storage/db";
import { wallCenter } from "@/tools/room-coat/lib/unit-layout";
import {
  createDefaultUnit,
  defaultHallwayName,
  ensureMinimumState,
  nextRoomOrigin,
} from "@/tools/room-coat/lib/migrate-state";
import {
  getActiveUnit,
  getAvailableRoomsForUnit,
  getHallwaysForUnit,
  resolvePlacedRooms,
} from "@/tools/room-coat/lib/unit-scope";
import { defaultRoomDimensionsMm } from "@/tools/room-coat/lib/units";
import type { HallwayConnectionOpening } from "@/tools/room-coat/lib/hallway-draft";
import {
  importRoomCoatSlice,
  loadRoomCoat,
  saveRoomCoat,
} from "@/tools/room-coat/storage";
import type {
  Hallway,
  HallwayWaypoint,
  HomeUnit,
  Paint,
  PlacedRoom,
  Room,
  RoomCoat,
  RoomCoatState,
  UnitPreference,
  WallSide,
} from "@/tools/room-coat/types/state";
import { DEFAULT_ROOM_COAT, DEFAULT_ROOM_COAT_STATE } from "@/tools/room-coat/types/state";

interface RoomCoatContextValue {
  state: RoomCoatState;
  activeUnit: HomeUnit;
  activePlacedRooms: PlacedRoom[];
  activeHallways: Hallway[];
  activePaints: Paint[];
  isReady: boolean;
  selectedSurfaceId: string | null;
  setSelectedSurfaceId: (surfaceId: string | null) => void;
  refresh: () => Promise<void>;
  setUnitPreference: (unit: UnitPreference) => Promise<void>;
  setShowCeilings: (show: boolean) => Promise<void>;
  setShowWallLabels: (show: boolean) => Promise<void>;
  upsertPaint: (paint: Paint) => Promise<void>;
  deletePaint: (paintId: string) => Promise<void>;
  addUnit: (name: string) => Promise<string>;
  updateUnit: (unitId: string, patch: Partial<HomeUnit>) => Promise<void>;
  deleteUnit: (unitId: string) => Promise<void>;
  setActiveUnitId: (unitId: string) => Promise<void>;
  addRoom: (name: string) => Promise<string>;
  updateRoom: (
    roomId: string,
    patch: Partial<Pick<Room, "name" | "widthMm" | "lengthMm" | "heightMm">>,
  ) => Promise<void>;
  deleteRoom: (roomId: string) => Promise<void>;
  attachRoomToUnit: (roomId: string, unitId?: string) => Promise<void>;
  detachRoomFromUnit: (placementId: string) => Promise<void>;
  moveRoom: (placementId: string, originXMm: number, originZMm: number) => Promise<void>;
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
    wall: WallSide,
    startMm: number,
    endMm: number,
  ) => Promise<void>;
  removeWallOpening: (placementId: string, openingId: string) => Promise<void>;
  deleteHallway: (hallwayId: string) => Promise<void>;
  getAvailableRoomsForUnit: (unitId?: string) => Room[];
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
      const fresh = ensureMinimumState({ ...DEFAULT_ROOM_COAT_STATE });
      setState(fresh);
      try {
        await saveRoomCoat(fresh);
      } catch (saveError) {
        console.error("Failed to persist fallback Room Coat state", saveError);
      }
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const persist = useCallback(async (next: RoomCoatState) => {
    stateRef.current = next;
    setState(next);
    await saveRoomCoat(next);
  }, []);

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
      await mutate((current) => ({
        ...current,
        units: [...current.units, unit],
        activeUnitId: unit.id,
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
          placements: current.placements.filter(
            (placement) => placement.unitId !== unitId,
          ),
          hallways: current.hallways.filter(
            (hallway) => hallway.unitId !== unitId,
          ),
          activeUnitId:
            current.activeUnitId === unitId
              ? (units[0]?.id ?? null)
              : current.activeUnitId,
        };
      });
    },
    [mutate],
  );

  const setActiveUnitId = useCallback(
    async (unitId: string) => {
      await mutate((current) => {
        if (current.activeUnitId === unitId) return current;
        return { ...current, activeUnitId: unitId };
      });
      setSelectedSurfaceId(null);
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
          roomId,
          ...origin,
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
    async (name: string) => {
      let roomId = "";
      await mutate((current) => {
        const dims = defaultRoomDimensionsMm();
        const room: Room = {
          id: createId(),
          name: name.trim() || "New room",
          ...dims,
          doors: [],
        };
        roomId = room.id;
        return { ...current, rooms: [...current.rooms, room] };
      });
      await attachRoomToUnit(roomId);
      return roomId;
    },
    [mutate, attachRoomToUnit],
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
        placements: current.placements.map((placement) =>
          placement.id === placementId
            ? { ...placement, originXMm, originZMm }
            : placement,
        ),
      }));
    },
    [mutate, pushUndoSnapshot],
  );

  const setRoomCoat = useCallback(
    async (placementId: string, coat: RoomCoat) => {
      await mutate((current) => ({
        ...current,
        placements: current.placements.map((placement) =>
          placement.id === placementId ? { ...placement, coat } : placement,
        ),
      }));
    },
    [mutate],
  );

  const setHallwayCoat = useCallback(
    async (hallwayId: string, coat: RoomCoat) => {
      await mutate((current) => ({
        ...current,
        hallways: current.hallways.map((hallway) =>
          hallway.id === hallwayId ? { ...hallway, coat } : hallway,
        ),
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

        const hallway: Hallway = {
          id: createId(),
          unitId,
          name: defaultHallwayName(current.hallways),
          widthMm,
          heightMm: 2438,
          waypointsMm: waypoints,
          coat: { ...unit.defaultCoat },
          surfaceOverrides: {},
          wallOpenings: [],
        };
        createdId = hallway.id;

        let placements = current.placements;
        let hallways = [...current.hallways, hallway];

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
                    wall: opening.wall,
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
      wall: WallSide,
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
            wall,
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

  const activePlacedRooms = useMemo(() => {
    if (!state || !activeUnit) return [];
    return resolvePlacedRooms(state, activeUnit.id);
  }, [state, activeUnit]);

  const activeHallways = useMemo(() => {
    if (!state || !activeUnit) return [];
    return getHallwaysForUnit(activeUnit.id, state.hallways);
  }, [state, activeUnit]);

  const activePaints = useMemo(() => activeUnit?.paints ?? [], [activeUnit]);

  const value = useMemo((): RoomCoatContextValue | null => {
    if (!state || !activeUnit) return null;

    return {
      state,
      activeUnit,
      activePlacedRooms,
      activeHallways,
      activePaints,
      isReady,
      selectedSurfaceId,
      setSelectedSurfaceId,
      refresh,
      setUnitPreference,
      setShowCeilings,
      setShowWallLabels,
      upsertPaint,
      deletePaint,
      addUnit,
      updateUnit,
      deleteUnit,
      setActiveUnitId,
      addRoom,
      updateRoom,
      deleteRoom,
      attachRoomToUnit,
      detachRoomFromUnit,
      moveRoom,
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
      removeWallOpening,
      deleteHallway,
      getAvailableRoomsForUnit: getAvailableRooms,
    };
  }, [
    state,
    activeUnit,
    activePlacedRooms,
    activeHallways,
    activePaints,
    isReady,
    selectedSurfaceId,
    refresh,
    setUnitPreference,
    setShowCeilings,
    setShowWallLabels,
    upsertPaint,
    deletePaint,
    addUnit,
    updateUnit,
    deleteUnit,
    setActiveUnitId,
    addRoom,
    updateRoom,
    deleteRoom,
    attachRoomToUnit,
    detachRoomFromUnit,
    moveRoom,
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
    removeWallOpening,
    deleteHallway,
    getAvailableRooms,
  ]);

  if (!isReady || !value) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center text-muted sm:px-6">
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
