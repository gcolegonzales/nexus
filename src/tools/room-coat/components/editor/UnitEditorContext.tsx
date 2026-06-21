"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import type { EditorTool, RoomWallHit } from "@/tools/room-coat/lib/editor-surfaces";
import { logHallway } from "@/tools/room-coat/lib/hallway-debug";
import {
  collectHallwayConnectionOpenings,
  commitWallPlacementPoint,
  createHallwayDrawDraft,
  createWallPlacementFromHit,
  canCompleteHallwayDraft,
  extendHallwayEndPoint,
  hallwayWallSnapRadiusMm,
  prepareHallwayForCreate,
  setPlacementCenter,
  snapHallwayPoint,
  type HallwayDrawDraft,
  type WallPlacement,
} from "@/tools/room-coat/lib/hallway-draft";
import {
  createWallPlacementFromHallwayHit,
  findEndpointWallHit,
  setHallwayPlacementCenter,
  type HallwayWallHit,
} from "@/tools/room-coat/lib/hallway-wall-hit";
import { isHallwayWallLink, isRoomWallLink } from "@/tools/room-coat/lib/wall-links";
import { offsetInOpening } from "@/tools/room-coat/lib/wall-openings";
import type { HallwayWaypoint, WallSide } from "@/tools/room-coat/types/state";
import type { EditorHoverMeasurement } from "@/tools/room-coat/lib/surface-measurements";

interface OpeningAnchor {
  placementId: string;
  wall: WallSide;
  offsetMm: number;
}

interface UnitEditorContextValue {
  tool: EditorTool;
  setTool: (tool: EditorTool) => void;
  hallwayDraft: HallwayDrawDraft;
  wallHover: HallwayWaypoint | null;
  setWallHover: (point: HallwayWaypoint | null) => void;
  openingAnchor: OpeningAnchor | null;
  selectedPlacementId: string | null;
  roomFlash: { placementId: string; key: number } | null;
  hoveredWallKey: string | null;
  setHoveredWallKey: (key: string | null) => void;
  setHallwayWidthMm: (widthMm: number) => void;
  updateWallPlacement: (placement: WallPlacement) => void;
  updateStartPullPreview: (preview: HallwayWaypoint) => void;
  confirmEndWallPlacement: () => void;
  updatePathPreview: (xMm: number, zMm: number) => void;
  commitPathSegment: () => void;
  finishPlacementDrag: () => void;
  undoHallwayStep: () => void;
  finishHallway: () => Promise<void>;
  resetHallwayDraft: () => void;
  cancelTool: () => void;
  handleWallHit: (hit: RoomWallHit) => void;
  handleHallwayWallHit: (hit: HallwayWallHit) => void;
  handleRoomSelect: (placementId: string) => void;
  focusRoomFromInventory: (placementId: string) => void;
  setHallwayOrbitEnabled: (enabled: boolean) => void;
  hallwayOrbitEnabled: boolean;
  hoverMeasurement: EditorHoverMeasurement | null;
  setHoverMeasurement: (
    measurement: EditorHoverMeasurement | null,
    surfaceId?: string,
  ) => void;
}

const UnitEditorContext = createContext<UnitEditorContextValue | null>(null);

export function useUnitEditor() {
  const value = useContext(UnitEditorContext);
  if (!value) {
    throw new Error("useUnitEditor must be used within UnitEditorProvider");
  }
  return value;
}

export function UnitEditorProvider({ children }: { children: ReactNode }) {
  const {
    activeUnit,
    activePlacedRooms,
    activeHallways,
    createHallwayWithOpenings,
    addWallOpening,
    undoLastEditorAction,
  } = useRoomCoat();

  const [tool, setToolState] = useState<EditorTool>("move");
  const [hallwayDraft, setHallwayDraft] = useState<HallwayDrawDraft>(
    createHallwayDrawDraft,
  );
  const [wallHover, setWallHover] = useState<HallwayWaypoint | null>(null);
  const [openingAnchor, setOpeningAnchor] = useState<OpeningAnchor | null>(
    null,
  );
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(
    null,
  );
  const [roomFlash, setRoomFlash] = useState<{
    placementId: string;
    key: number;
  } | null>(null);
  const [hoveredWallKey, setHoveredWallKey] = useState<string | null>(null);
  const [hallwayOrbitEnabled, setHallwayOrbitEnabled] = useState(true);
  const [hoverMeasurement, setHoverMeasurementState] =
    useState<EditorHoverMeasurement | null>(null);

  const setHoverMeasurement = useCallback(
    (measurement: EditorHoverMeasurement | null, surfaceId?: string) => {
      setHoverMeasurementState((current) => {
        if (measurement) return measurement;
        if (surfaceId && current?.surfaceId !== surfaceId) return current;
        return null;
      });
    },
    [],
  );

  const resetHallwayDraft = useCallback(() => {
    setHallwayDraft(createHallwayDrawDraft());
    setWallHover(null);
    setHallwayOrbitEnabled(true);
  }, []);

  const cancelTool = useCallback(() => {
    setToolState("move");
    resetHallwayDraft();
    setOpeningAnchor(null);
    setHoveredWallKey(null);
    setWallHover(null);
    setHoverMeasurement(null);
  }, [resetHallwayDraft]);

  const setTool = useCallback(
    (next: EditorTool) => {
      setToolState(next);
      resetHallwayDraft();
      setOpeningAnchor(null);
      setHoveredWallKey(null);
      setWallHover(null);
      setHoverMeasurement(null);
      if (next !== "move") {
        setSelectedPlacementId(null);
      }
    },
    [resetHallwayDraft],
  );

  const setHallwayWidthMm = useCallback((widthMm: number) => {
    const nextWidth = Math.max(600, Math.min(2400, widthMm));
    setHallwayDraft((current) => {
      if (!current.wallPlacement) {
        return { ...current, widthMm: nextWidth };
      }
      if (isHallwayWallLink(current.wallPlacement.link)) {
        const link = current.wallPlacement.link;
        const hallway = activeHallways.find((item) => item.id === link.hallwayId);
        if (!hallway) return { ...current, widthMm: nextWidth };
        const offsetMm = current.wallPlacement.link.offsetMm;
        return {
          ...current,
          widthMm: nextWidth,
          wallPlacement: setHallwayPlacementCenter(
            hallway,
            { ...current.wallPlacement, widthMm: nextWidth },
            offsetMm,
          ),
        };
      }
      const room = activePlacedRooms.find(
        (item) =>
          isRoomWallLink(current.wallPlacement!.link) &&
          item.placementId === current.wallPlacement!.link.placementId,
      );
      if (!room) return { ...current, widthMm: nextWidth };
      const offsetMm = isRoomWallLink(current.wallPlacement.link)
        ? current.wallPlacement.link.offsetMm
        : 0;
      return {
        ...current,
        widthMm: nextWidth,
        wallPlacement: setPlacementCenter(room, {
          ...current.wallPlacement,
          widthMm: nextWidth,
        }, offsetMm),
      };
    });
  }, [activeHallways, activePlacedRooms]);

  const startWallPlacement = useCallback(
    (hit: RoomWallHit, widthMm: number) => {
      const room = activePlacedRooms.find(
        (item) => item.placementId === hit.placementId,
      );
      if (!room) return;
      const wallPlacement = createWallPlacementFromHit(room, hit, widthMm);
      logHallway("wall placement start", { wallPlacement });
      setHallwayDraft({
        phase: "placing-start",
        widthMm,
        points: [],
        links: [],
        preview: null,
        wallPlacement,
      });
    },
    [activePlacedRooms],
  );

  const updateWallPlacement = useCallback((placement: WallPlacement) => {
    setHallwayDraft((current) => ({
      ...current,
      widthMm: placement.widthMm,
      wallPlacement: placement,
    }));
  }, []);

  const updateStartPullPreview = useCallback((preview: HallwayWaypoint) => {
    setHallwayDraft((current) => {
      if (current.phase !== "placing-start" || !current.wallPlacement) {
        return current;
      }
      return { ...current, preview };
    });
  }, []);

  const confirmEndWallPlacement = useCallback(() => {
    setHallwayDraft((current) => {
      if (current.phase !== "placing-end" || !current.wallPlacement) {
        return current;
      }
      const links = [...current.links];
      while (links.length < current.points.length) links.push(null);
      links[current.points.length - 1] = current.wallPlacement.link;
      logHallway("confirm end placement", { link: current.wallPlacement.link });
      return {
        ...current,
        phase: "ready",
        widthMm: current.wallPlacement.widthMm,
        points: current.points,
        links,
        preview: null,
        wallPlacement: null,
      };
    });
  }, []);

  const finishPlacementDrag = useCallback(() => {
    setHallwayDraft((current) => {
      if (current.phase !== "placing-start" || !current.preview || !current.wallPlacement) {
        return current;
      }
      const room = isRoomWallLink(current.wallPlacement.link)
        ? (activePlacedRooms.find((item) => {
            const link = current.wallPlacement!.link;
            return isRoomWallLink(link) && item.placementId === link.placementId;
          }) ?? null)
        : null;
      if (isRoomWallLink(current.wallPlacement.link) && !room) {
        return current;
      }
      const { point, link } = commitWallPlacementPoint(
        room,
        activeHallways,
        current.wallPlacement,
      );
      const dist = Math.hypot(
        point.xMm - current.preview.xMm,
        point.zMm - current.preview.zMm,
      );
      if (dist < 80) {
        return { ...current, preview: null };
      }

      const midDraft: HallwayDrawDraft = {
        ...current,
        phase: "dragging",
        points: [point],
        links: [link],
        wallPlacement: null,
      };
      const snapped = snapHallwayPoint(
        activePlacedRooms,
        activeHallways,
        midDraft,
        current.preview.xMm,
        current.preview.zMm,
      );

      logHallway("commit start from pull", {
        point,
        preview: current.preview,
        segment: snapped.point,
      });

      return {
        ...midDraft,
        points: [point, snapped.point],
        links: [link, snapped.link],
        preview: null,
      };
    });
  }, [activeHallways, activePlacedRooms]);

  const updatePathPreview = useCallback(
    (xMm: number, zMm: number) => {
      setHallwayDraft((current) => {
        if (
          current.phase !== "dragging" &&
          current.phase !== "ready"
        ) {
          return current;
        }
        if (current.points.length === 0) return current;
        const snapped = snapHallwayPoint(
          activePlacedRooms,
          activeHallways,
          current,
          xMm,
          zMm,
        );
        const extension = extendHallwayEndPoint(
          current.points,
          snapped.point.xMm,
          snapped.point.zMm,
        );
        if (!extension) {
          return { ...current, preview: snapped.point };
        }
        const links = [...current.links];
        while (links.length < current.points.length) links.push(null);
        links[links.length - 1] = null;
        return {
          ...current,
          links,
          preview: snapped.point,
          wallPlacement: null,
        };
      });
    },
    [activeHallways, activePlacedRooms],
  );

  const commitPathSegment = useCallback(() => {
    setHallwayDraft((current) => {
      if (!current.preview || current.points.length === 0) return current;
      if (current.phase !== "dragging" && current.phase !== "ready") {
        return current;
      }

      const last = current.points[current.points.length - 1];
      const dist = Math.hypot(
        last.xMm - current.preview.xMm,
        last.zMm - current.preview.zMm,
      );
      if (dist < 80) return { ...current, preview: null };

      const snapped = snapHallwayPoint(
        activePlacedRooms,
        activeHallways,
        current,
        current.preview.xMm,
        current.preview.zMm,
      );

      const extension = extendHallwayEndPoint(
        current.points,
        snapped.point.xMm,
        snapped.point.zMm,
      );
      if (extension) {
        const points = [...current.points];
        points[points.length - 1] = extension;
        const links = [...current.links];
        while (links.length < points.length) links.push(null);
        links[links.length - 1] = null;
        logHallway("extend path segment", { pointCount: points.length });
        return {
          ...current,
          phase: "ready",
          points,
          links,
          preview: null,
          wallPlacement: null,
        };
      }

      const endpointHit = findEndpointWallHit(
        activePlacedRooms,
        activeHallways,
        snapped.point.xMm,
        snapped.point.zMm,
        hallwayWallSnapRadiusMm(current.widthMm),
      );
      if (endpointHit) {
        logHallway("path reached wall → end placement");
        if (endpointHit.kind === "room") {
          return {
            ...current,
            phase: "placing-end",
            preview: null,
            wallPlacement: createWallPlacementFromHit(
              endpointHit.hit.room,
              endpointHit.hit,
              current.widthMm,
              last,
            ),
          };
        }
        return {
          ...current,
          phase: "placing-end",
          preview: null,
          wallPlacement: createWallPlacementFromHallwayHit(
            endpointHit.hit.hallway,
            endpointHit.hit,
            current.widthMm,
            last,
          ),
        };
      }

      const points = [...current.points, snapped.point];
      const links = [...current.links, snapped.link];
      logHallway("commit path segment", { pointCount: points.length });
      return {
        ...current,
        phase: points.length >= 2 ? "ready" : "dragging",
        points,
        links,
        preview: null,
      };
    });
  }, [activeHallways, activePlacedRooms]);

  const undoHallwayStep = useCallback(() => {
    setHallwayDraft((current) => {
      if (current.phase === "idle") return current;
      if (current.phase === "placing-start") {
        return createHallwayDrawDraft();
      }
      if (current.phase === "placing-end") {
        return {
          ...current,
          phase: current.points.length >= 2 ? "ready" : "dragging",
          wallPlacement: null,
          preview: null,
        };
      }
      if (current.points.length <= 1) {
        return createHallwayDrawDraft();
      }
      const points = current.points.slice(0, -1);
      const links = current.links.slice(0, -1);
      return {
        ...current,
        phase: points.length >= 2 ? "ready" : "dragging",
        points,
        links,
        preview: null,
        wallPlacement: null,
      };
    });
  }, []);

  const finishHallway = useCallback(async () => {
    const prepared = prepareHallwayForCreate(
      activePlacedRooms,
      activeHallways,
      hallwayDraft,
    );
    if (!prepared) return;

    const { points, links } = prepared;

    const openings = collectHallwayConnectionOpenings(
      activePlacedRooms,
      activeHallways,
      points,
      links,
      hallwayDraft.widthMm,
    );

    logHallway("create hallway", { pointCount: points.length, openings });

    await createHallwayWithOpenings(
      activeUnit.id,
      points,
      hallwayDraft.widthMm,
      openings,
    );

    cancelTool();
  }, [
    activeHallways,
    activePlacedRooms,
    activeUnit.id,
    cancelTool,
    createHallwayWithOpenings,
    hallwayDraft,
  ]);

  const handleWallHit = useCallback(
    (hit: RoomWallHit) => {
      if (tool === "hallway") {
        const room = activePlacedRooms.find(
          (item) => item.placementId === hit.placementId,
        );
        if (!room) return;

        if (hallwayDraft.phase === "idle") {
          startWallPlacement(hit, hallwayDraft.widthMm);
          return;
        }

        if (
          hallwayDraft.phase === "dragging" ||
          hallwayDraft.phase === "ready"
        ) {
          const last =
            hallwayDraft.points[hallwayDraft.points.length - 1];
          setHallwayDraft((current) => ({
            ...current,
            phase: "placing-end",
            preview: null,
            wallPlacement: createWallPlacementFromHit(
              room,
              hit,
              current.widthMm,
              last,
            ),
          }));
        }
        return;
      }

      if (tool === "open-walls") {
        const room = activePlacedRooms.find(
          (item) => item.placementId === hit.placementId,
        );
        if (!room) return;
        if (offsetInOpening(room, hit.wall, hit.offsetMm)) return;

        if (!openingAnchor) {
          setOpeningAnchor({
            placementId: hit.placementId,
            wall: hit.wall,
            offsetMm: hit.offsetMm,
          });
          return;
        }

        if (
          openingAnchor.placementId !== hit.placementId ||
          openingAnchor.wall !== hit.wall
        ) {
          setOpeningAnchor({
            placementId: hit.placementId,
            wall: hit.wall,
            offsetMm: hit.offsetMm,
          });
          return;
        }

        void addWallOpening(
          hit.placementId,
          hit.wall,
          openingAnchor.offsetMm,
          hit.offsetMm,
        ).then(() => setOpeningAnchor(null));
      }
    },
    [
      activePlacedRooms,
      addWallOpening,
      hallwayDraft.phase,
      hallwayDraft.widthMm,
      openingAnchor,
      startWallPlacement,
      tool,
    ],
  );

  const handleHallwayWallHit = useCallback(
    (hit: HallwayWallHit) => {
      if (tool !== "hallway") return;

      if (hallwayDraft.phase === "idle") {
        const wallPlacement = createWallPlacementFromHallwayHit(
          hit.hallway,
          hit,
          hallwayDraft.widthMm,
        );
        logHallway("hallway wall placement start", { wallPlacement });
        setHallwayDraft({
          phase: "placing-start",
          widthMm: hallwayDraft.widthMm,
          points: [],
          links: [],
          preview: null,
          wallPlacement,
        });
        return;
      }

      if (
        hallwayDraft.phase === "dragging" ||
        hallwayDraft.phase === "ready"
      ) {
        const last = hallwayDraft.points[hallwayDraft.points.length - 1];
        setHallwayDraft((current) => ({
          ...current,
          phase: "placing-end",
          preview: null,
          wallPlacement: createWallPlacementFromHallwayHit(
            hit.hallway,
            hit,
            current.widthMm,
            last,
          ),
        }));
      }
    },
    [hallwayDraft.phase, hallwayDraft.points, hallwayDraft.widthMm, tool],
  );

  const handleRoomSelect = useCallback(
    (placementId: string) => {
      if (tool === "move") {
        setSelectedPlacementId(placementId);
      }
    },
    [tool],
  );

  const focusRoomFromInventory = useCallback((placementId: string) => {
    setSelectedPlacementId(placementId);
    setRoomFlash({ placementId, key: Date.now() });
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "z") {
        event.preventDefault();
        if (tool === "hallway" && hallwayDraft.phase !== "idle") {
          undoHallwayStep();
          return;
        }
        void undoLastEditorAction();
        return;
      }

      if (event.key === "Escape") {
        cancelTool();
        return;
      }

      if (
        event.key === "Enter" &&
        tool === "hallway" &&
        canCompleteHallwayDraft(
          activePlacedRooms,
          activeHallways,
          hallwayDraft,
        )
      ) {
        event.preventDefault();
        void finishHallway();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeHallways,
    activePlacedRooms,
    cancelTool,
    finishHallway,
    hallwayDraft,
    tool,
    undoHallwayStep,
    undoLastEditorAction,
  ]);

  const value = useMemo(
    () => ({
      tool,
      setTool,
      hallwayDraft,
      wallHover,
      setWallHover,
      openingAnchor,
      selectedPlacementId,
      roomFlash,
      hoveredWallKey,
      setHoveredWallKey,
      setHallwayWidthMm,
      updateWallPlacement,
      updateStartPullPreview,
      confirmEndWallPlacement,
      updatePathPreview,
      commitPathSegment,
      finishPlacementDrag,
      undoHallwayStep,
      finishHallway,
      resetHallwayDraft,
      cancelTool,
      handleWallHit,
      handleHallwayWallHit,
      handleRoomSelect,
      focusRoomFromInventory,
      setHallwayOrbitEnabled,
      hallwayOrbitEnabled,
      hoverMeasurement,
      setHoverMeasurement,
    }),
    [
      tool,
      setTool,
      hallwayDraft,
      wallHover,
      openingAnchor,
      selectedPlacementId,
      roomFlash,
      hoveredWallKey,
      setHallwayWidthMm,
      updateWallPlacement,
      updateStartPullPreview,
      confirmEndWallPlacement,
      updatePathPreview,
      commitPathSegment,
      finishPlacementDrag,
      undoHallwayStep,
      finishHallway,
      resetHallwayDraft,
      cancelTool,
      handleWallHit,
      handleHallwayWallHit,
      handleRoomSelect,
      focusRoomFromInventory,
      hallwayOrbitEnabled,
      hoverMeasurement,
    ],
  );

  return (
    <UnitEditorContext.Provider value={value}>
      {children}
    </UnitEditorContext.Provider>
  );
}
