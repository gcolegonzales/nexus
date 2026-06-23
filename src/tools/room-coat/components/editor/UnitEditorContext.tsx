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
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import type { ContextMenuState } from "@/tools/room-coat/lib/editor-context-menu";
import type { RoomAngleSnapMode } from "@/tools/room-coat/lib/room-shape";
import { wallSegmentByIndex } from "@/tools/room-coat/lib/wall-openings";
import { clampOpeningOffset } from "@/tools/room-coat/lib/openings-layout";
import { validateDoorPlacement } from "@/tools/room-coat/lib/door-placement";
import {
  doorDraftAsDoor,
  doorDraftFromWallHit,
  isDoorDraftValid,
  parseDoorSurfaceId,
  resolveDoorWallHit,
} from "@/tools/room-coat/lib/door-draft";
import {
  doorMoveAnchorFromClick,
  resolveDoorWallOffsetMm,
} from "@/tools/room-coat/lib/door-wall-snap";
import {
  clampWindowOnWall,
  parseWindowSurfaceId,
  validateWindowPlacement,
} from "@/tools/room-coat/lib/window-surfaces";
import {
  defaultDoorDimensionsMm,
  defaultWindowDimensionsMm,
} from "@/tools/room-coat/lib/units";
import type { RoomDrawMode } from "@/tools/room-coat/components/editor/RoomDrawInteractions";
import type { EditorTool, RoomWallHit } from "@/tools/room-coat/lib/editor-surfaces";
import { logHallway } from "@/tools/room-coat/lib/hallway-debug";
import { resolveMeasureSnap } from "@/tools/room-coat/lib/measure-snap";
import {
  collectHallwayConnectionOpenings,
  commitWallPlacementPoint,
  createHallwayDrawDraft,
  createWallPlacementFromHit,
  canCompleteHallwayDraft,
  draftFromExitAlignmentSnap,
  extendHallwayEndPoint,
  nearestExitAlignmentSnap,
  hallwayWallSnapRadiusMm,
  prepareHallwayForCreate,
  setPlacementCenter,
  snapHallwayPoint,
  type HallwayDrawDraft,
  type ExitAlignmentSnap,
  type WallPlacement,
} from "@/tools/room-coat/lib/hallway-draft";
import {
  createWallPlacementFromHallwayHit,
  findEndpointWallHit,
  setHallwayPlacementCenter,
  type HallwayWallHit,
} from "@/tools/room-coat/lib/hallway-wall-hit";
import {
  defaultWallSnapLabel,
  nearestWallSnapOnWall,
  snapPointFromRoomWallHit,
  wallSnapHitFromPoint,
} from "@/tools/room-coat/lib/snap-point-utils";
import { offsetToWorldOnWall } from "@/tools/room-coat/lib/wall-openings";
import { isHallwayWallLink, isRoomWallLink, wallLinkKey } from "@/tools/room-coat/lib/wall-links";
import { offsetInOpening } from "@/tools/room-coat/lib/wall-openings";
import type { HallwayWaypoint, WallSide } from "@/tools/room-coat/types/state";
import {
  collectHallwayContinuationTargets,
  collectHallwayEntranceTargets,
  resolveHallwayDrawLineSnap,
  shouldSnapPointToEntranceCenter,
  type HallwayEntranceLineSnap,
} from "@/tools/room-coat/lib/hallway-entrance-snaps";
import type { EditorHoverMeasurement } from "@/tools/room-coat/lib/surface-measurements";
import type { SnapPointPrompt } from "@/tools/room-coat/components/editor/LayoutEditorInteractions";
import type { DimensionEditTarget } from "@/tools/room-coat/components/editor/dimension-edit";
import type { SnapGuideSegment } from "@/tools/room-coat/lib/snap-guides";

export type MeasurePhase = "idle" | "awaiting-end" | "complete";

interface OpeningAnchor {
  placementId: string;
  wallIndex: number;
  offsetMm: number;
}

interface UnitEditorContextValue {
  tool: EditorTool;
  setTool: (tool: EditorTool) => void;
  hallwayDraft: HallwayDrawDraft;
  wallHover: HallwayWaypoint | null;
  setWallHover: (point: HallwayWaypoint | null) => void;
  openingAnchor: OpeningAnchor | null;
  doorPreviewHit: RoomWallHit | null;
  handleDoorWallHover: (hit: RoomWallHit | null) => void;
  selectedPlacementId: string | null;
  roomFlash: { placementId: string; key: number } | null;
  hoveredWallKey: string | null;
  setHoveredWallKey: (key: string | null) => void;
  setHallwayWidthMm: (widthMm: number) => void;
  updateWallPlacement: (placement: WallPlacement) => void;
  updateStartPullPreview: (preview: HallwayWaypoint) => void;
  confirmEndWallPlacement: () => void;
  confirmStartEntrance: () => void;
  commitExitAlignmentSnap: (snap: ExitAlignmentSnap) => void;
  updatePathPreview: (xMm: number, zMm: number) => void;
  commitPathSegment: () => void;
  finishPlacementDrag: () => void;
  undoHallwayStep: () => void;
  finishHallway: () => Promise<void>;
  resetHallwayDraft: () => void;
  cancelTool: () => void;
  contextMenu: ContextMenuState | null;
  openContextMenu: (menu: ContextMenuState) => void;
  closeContextMenu: () => void;
  beginToolAction: (tool: EditorTool, init?: () => void) => void;
  startHallwayFromWallHit: (hit: RoomWallHit) => void;
  startOpenWallFromHit: (hit: RoomWallHit) => void;
  startDoorFromWallHit: (hit: RoomWallHit) => void;
  placeDoorFromWallHit: (hit: RoomWallHit) => Promise<string | null>;
  placeWindowFromWallHit: (hit: RoomWallHit) => void;
  handleWallHit: (hit: RoomWallHit) => void;
  handleHallwayWallHit: (hit: HallwayWallHit) => void;
  handleRoomSelect: (placementId: string) => void;
  clearSelection: () => void;
  focusRoomFromInventory: (placementId: string) => void;
  setHallwayOrbitEnabled: (enabled: boolean) => void;
  hallwayOrbitEnabled: boolean;
  hoverMeasurement: EditorHoverMeasurement | null;
  setHoverMeasurement: (
    measurement: EditorHoverMeasurement | null,
    surfaceId?: string,
  ) => void;
  selectedPresetId: string;
  setSelectedPresetId: (presetId: string) => void;
  furnishMode: "place" | "adjust";
  selectPlacementPreset: (presetId: string) => void;
  selectFurnishingForAdjust: (furnishingId: string) => void;
  consumeFurnishPlacementSuppression: () => boolean;
  suppressFurnishPlacement: () => void;
  selectedFurnishingId: string | null;
  setSelectedFurnishingId: (id: string | null) => void;
  furnishingRotation: 0 | 90 | 180 | 270;
  rotateFurnishing: () => void;
  measureStart: { xMm: number; zMm: number; label?: string } | null;
  measureEnd: { xMm: number; zMm: number; label?: string } | null;
  measurePhase: MeasurePhase;
  measurePreview: {
    xMm: number;
    zMm: number;
    label?: string;
    guides?: import("@/tools/room-coat/lib/snap-guides").SnapGuideSegment[];
  } | null;
  setMeasurePreview: (
    preview: {
      xMm: number;
      zMm: number;
      label?: string;
      guides?: import("@/tools/room-coat/lib/snap-guides").SnapGuideSegment[];
    } | null,
  ) => void;
  handleMeasureClick: (xMm: number, zMm: number) => void;
  moveMeasurePoint: (role: "start" | "end", xMm: number, zMm: number) => void;
  finishMeasurePointDrag: () => void;
  measureGuides: SnapGuideSegment[];
  snapMeasurePoint: (
    xMm: number,
    zMm: number,
    anchor?: { xMm: number; zMm: number } | null,
  ) => {
    xMm: number;
    zMm: number;
    label?: string;
    guides?: SnapGuideSegment[];
  };
  resetMeasure: () => void;
  exitMeasureTool: () => void;
  snapPointPrompt: SnapPointPrompt | null;
  setSnapPointPrompt: (prompt: SnapPointPrompt | null) => void;
  dimensionEditTarget: DimensionEditTarget | null;
  startDimensionEdit: (target: DimensionEditTarget) => void;
  cancelDimensionEdit: () => void;
  roomDrawMode: RoomDrawMode;
  setRoomDrawMode: (mode: RoomDrawMode) => void;
  roomAngleSnapMode: RoomAngleSnapMode;
  setRoomAngleSnapMode: (mode: RoomAngleSnapMode) => void;
  hallwayAngleSnapMode: RoomAngleSnapMode;
  setHallwayAngleSnapMode: (mode: RoomAngleSnapMode) => void;
  roomDrawSegmentLengthMm: number | null;
  setRoomDrawSegmentLengthMm: (lengthMm: number | null) => void;
  roomDrawInteriorAngleDeg: number | null;
  setRoomDrawInteriorAngleDeg: (angleDeg: number | null) => void;
  roomDrawWarnings: string[];
  setRoomDrawWarnings: (warnings: string[]) => void;
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
    activeFurnishings,
    createHallwayWithOpenings,
    addWallOpening,
    addDoorToPlacement,
    updateDoor,
    addWindowToPlacement,
    updateWindow,
    undoLastEditorAction,
    updateFurnishing,
    deleteFurnishing,
    activeSnapPoints,
    addSnapPoint,
    activeFloor,
    setSelectedSurfaceId,
    selectedSurfaceId,
    state,
  } = useRoomCoat();

  const [tool, setToolState] = useState<EditorTool>("select");
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [hallwayDraft, setHallwayDraft] = useState<HallwayDrawDraft>(
    createHallwayDrawDraft,
  );
  const [wallHover, setWallHover] = useState<HallwayWaypoint | null>(null);
  const [openingAnchor, setOpeningAnchor] = useState<OpeningAnchor | null>(
    null,
  );
  const [doorPreviewHit, setDoorPreviewHit] = useState<RoomWallHit | null>(
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

  const placeDoorFromWallHit = useCallback(
    async (hit: RoomWallHit): Promise<string | null> => {
      const room = activePlacedRooms.find(
        (item) => item.placementId === hit.placementId,
      );
      if (!room) return null;
      const dims = defaultDoorDimensionsMm();
      const resolvedHit = resolveDoorWallHit(room, hit, dims.widthMm);
      const draft = doorDraftFromWallHit(room, resolvedHit);
      if (!draft || !isDoorDraftValid(room, draft)) return null;
      const doorId = createId();
      await addDoorToPlacement(draft.placementId, {
        ...doorDraftAsDoor(draft),
        id: doorId,
      });
      return doorId;
    },
    [activePlacedRooms, addDoorToPlacement],
  );

  const handleDoorWallHover = useCallback(
    (hit: RoomWallHit | null) => {
      if (tool !== "add-door") return;
      if (!hit) {
        setDoorPreviewHit(null);
        return;
      }
      const room = activePlacedRooms.find(
        (item) => item.placementId === hit.placementId,
      );
      if (!room) {
        setDoorPreviewHit(hit);
        return;
      }
      setDoorPreviewHit(
        resolveDoorWallHit(room, hit, defaultDoorDimensionsMm().widthMm),
      );
    },
    [activePlacedRooms, tool],
  );

  const [hallwayOrbitEnabled, setHallwayOrbitEnabled] = useState(true);
  const [hoverMeasurement, setHoverMeasurementState] =
    useState<EditorHoverMeasurement | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState("chair");
  const [furnishMode, setFurnishMode] = useState<"place" | "adjust">("place");
  const furnishPlacementSuppressUntil = useRef(0);
  const prevMeasureFloorIdRef = useRef<string | null>(null);
  const stickyHallwayEntranceRef = useRef<HallwayEntranceLineSnap | null>(null);
  const [selectedFurnishingId, setSelectedFurnishingId] = useState<string | null>(
    null,
  );
  const [furnishingRotation, setFurnishingRotation] = useState<
    0 | 90 | 180 | 270
  >(0);
  const [measureStart, setMeasureStart] = useState<{
    xMm: number;
    zMm: number;
    label?: string;
  } | null>(null);
  const [measureEnd, setMeasureEnd] = useState<{
    xMm: number;
    zMm: number;
    label?: string;
  } | null>(null);
  const [measurePreview, setMeasurePreview] = useState<{
    xMm: number;
    zMm: number;
    label?: string;
    guides?: SnapGuideSegment[];
  } | null>(null);
  const [measureGuides, setMeasureGuides] = useState<SnapGuideSegment[]>([]);
  const [snapPointPrompt, setSnapPointPrompt] =
    useState<SnapPointPrompt | null>(null);
  const [dimensionEditTarget, setDimensionEditTarget] =
    useState<DimensionEditTarget | null>(null);
  const [roomDrawMode, setRoomDrawMode] = useState<RoomDrawMode>("polygon");
  const [roomAngleSnapMode, setRoomAngleSnapMode] =
    useState<RoomAngleSnapMode>("ortho");
  const [hallwayAngleSnapMode, setHallwayAngleSnapMode] =
    useState<RoomAngleSnapMode>("ortho");
  const [roomDrawSegmentLengthMm, setRoomDrawSegmentLengthMm] = useState<
    number | null
  >(null);
  const [roomDrawInteriorAngleDeg, setRoomDrawInteriorAngleDeg] = useState<
    number | null
  >(null);
  const [roomDrawWarnings, setRoomDrawWarnings] = useState<string[]>([]);

  const startDimensionEdit = useCallback((target: DimensionEditTarget) => {
    setDimensionEditTarget(target);
    if (target.kind === "room") {
      setSelectedPlacementId(target.placementId);
      setSelectedFurnishingId(null);
    } else {
      setSelectedFurnishingId(target.furnishingId);
    }
  }, []);

  const cancelDimensionEdit = useCallback(() => {
    setDimensionEditTarget(null);
  }, []);

  const selectPlacementPreset = useCallback((presetId: string) => {
    setSelectedPresetId(presetId);
    setFurnishMode("place");
    setSelectedFurnishingId(null);
  }, []);

  const selectFurnishingForAdjust = useCallback(
    (furnishingId: string) => {
      setSelectedFurnishingId(furnishingId);
      setFurnishMode("adjust");
      const item = activeFurnishings.find((entry) => entry.id === furnishingId);
      if (item?.presetId) {
        setSelectedPresetId(item.presetId);
      }
      if (item) {
        setFurnishingRotation(item.rotationDeg);
      }
    },
    [activeFurnishings],
  );

  const suppressFurnishPlacement = useCallback(() => {
    furnishPlacementSuppressUntil.current = Date.now() + 450;
  }, []);

  const consumeFurnishPlacementSuppression = useCallback(() => {
    if (Date.now() < furnishPlacementSuppressUntil.current) {
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (tool !== "measure") {
      setMeasurePreview(null);
      setMeasureGuides([]);
    }
  }, [tool]);

  const measurePhase: MeasurePhase = !measureStart
    ? "idle"
    : !measureEnd
      ? "awaiting-end"
      : "complete";

  const resetMeasure = useCallback(() => {
    setMeasureStart(null);
    setMeasureEnd(null);
    setMeasurePreview(null);
    setMeasureGuides([]);
  }, []);

  useEffect(() => {
    const floorId = activeFloor?.id ?? null;
    if (
      prevMeasureFloorIdRef.current !== null &&
      prevMeasureFloorIdRef.current !== floorId
    ) {
      resetMeasure();
    }
    prevMeasureFloorIdRef.current = floorId;
  }, [activeFloor?.id, resetMeasure]);

  const snapMeasurePoint = useCallback(
    (
      xMm: number,
      zMm: number,
      anchor?: { xMm: number; zMm: number } | null,
    ) => {
      const snapped = resolveMeasureSnap({
        xMm,
        zMm,
        rooms: activePlacedRooms,
        hallways: activeHallways,
        furnishings: activeFurnishings,
        snapPoints: activeSnapPoints,
        unit: state.unitPreference,
        snapMode: state.viewSettings.snapMode,
        anchor: anchor ?? null,
      });
      return {
        xMm: snapped.xMm,
        zMm: snapped.zMm,
        label: snapped.source?.label,
        guides: snapped.guides,
      };
    },
    [
      activeFurnishings,
      activeHallways,
      activePlacedRooms,
      activeSnapPoints,
      state.unitPreference,
      state.viewSettings.snapMode,
    ],
  );

  const handleMeasureClick = useCallback(
    (xMm: number, zMm: number) => {
      if (measureStart && measureEnd) return;

      const anchor =
        measureStart && !measureEnd ? measureStart : undefined;
      const point = snapMeasurePoint(xMm, zMm, anchor);
      setMeasureGuides([]);

      if (!measureStart) {
        setMeasureStart(point);
        setMeasureEnd(null);
        setMeasurePreview(null);
        return;
      }

      setMeasureEnd(point);
      setMeasurePreview(null);
    },
    [measureEnd, measureStart, snapMeasurePoint],
  );

  const moveMeasurePoint = useCallback(
    (role: "start" | "end", xMm: number, zMm: number) => {
      const anchor = role === "start" ? measureEnd : measureStart;
      const point = snapMeasurePoint(xMm, zMm, anchor ?? undefined);
      const next = {
        xMm: point.xMm,
        zMm: point.zMm,
        label: point.label,
      };
      if (role === "start") {
        setMeasureStart(next);
      } else {
        setMeasureEnd(next);
      }
      setMeasurePreview(null);
      setMeasureGuides(point.guides ?? []);
    },
    [measureEnd, measureStart, snapMeasurePoint],
  );

  const finishMeasurePointDrag = useCallback(() => {
    setMeasureGuides([]);
  }, []);

  const nextRotationDeg = useCallback(
    (current: 0 | 90 | 180 | 270): 0 | 90 | 180 | 270 => {
      if (current === 0) return 90;
      if (current === 90) return 180;
      if (current === 180) return 270;
      return 0;
    },
    [],
  );

  const rotateFurnishing = useCallback(() => {
    if (selectedFurnishingId) {
      const item = activeFurnishings.find(
        (entry) => entry.id === selectedFurnishingId,
      );
      if (item) {
        void updateFurnishing(selectedFurnishingId, {
          rotationDeg: nextRotationDeg(item.rotationDeg),
        });
      }
      return;
    }
    setFurnishingRotation((current) => nextRotationDeg(current));
  }, [
    activeFurnishings,
    nextRotationDeg,
    selectedFurnishingId,
    updateFurnishing,
  ]);

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
    stickyHallwayEntranceRef.current = null;
    setHallwayDraft(createHallwayDrawDraft());
    setWallHover(null);
    setHallwayOrbitEnabled(true);
  }, []);

  const hallwayDraftExcludeLinkKeys = useCallback((draft: HallwayDrawDraft) => {
    const keys = new Set<string>();
    for (const link of draft.links) {
      if (link) keys.add(wallLinkKey(link));
    }
    if (draft.wallPlacement) keys.add(wallLinkKey(draft.wallPlacement.link));
    if (draft.startPlacement) keys.add(wallLinkKey(draft.startPlacement.link));
    if (draft.endPlacement) keys.add(wallLinkKey(draft.endPlacement.link));
    return keys;
  }, []);

  const snapHallwayPointWithEntrance = useCallback(
    (draft: HallwayDrawDraft, xMm: number, zMm: number) => {
      const snapped = snapHallwayPoint(
        activePlacedRooms,
        activeHallways,
        draft,
        xMm,
        zMm,
        {
          snapPoints: activeSnapPoints,
          stickyEntranceLine: stickyHallwayEntranceRef.current,
          excludeLinkKeys: hallwayDraftExcludeLinkKeys(draft),
          angleSnapMode: hallwayAngleSnapMode,
        },
      );
      stickyHallwayEntranceRef.current = snapped.stickyEntranceLine ?? null;
      return snapped;
    },
    [
      activeHallways,
      activePlacedRooms,
      activeSnapPoints,
      hallwayDraftExcludeLinkKeys,
      hallwayAngleSnapMode,
    ],
  );

  const openContextMenu = useCallback((menu: ContextMenuState) => {
    setContextMenu(menu);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const beginToolAction = useCallback(
    (next: EditorTool, init?: () => void) => {
      setDimensionEditTarget(null);
      setToolState(next);
      if (next === "furnish") {
        setFurnishMode("place");
      }
      resetHallwayDraft();
      setOpeningAnchor(null);
      setDoorPreviewHit(null);
      setHoveredWallKey(null);
      setWallHover(null);
      setHoverMeasurement(null);
      setSnapPointPrompt(null);
      if (next !== "measure") {
        setMeasurePreview(null);
        setMeasureGuides([]);
      }
      if (next !== "furnish" && next !== "move" && next !== "select") {
        setSelectedFurnishingId(null);
      }
      if (next !== "move" && next !== "select") {
        setSelectedPlacementId(null);
      }
      init?.();
    },
    [resetHallwayDraft, setHoverMeasurement],
  );

  const exitMeasureTool = useCallback(() => {
    setToolState("select");
    setMeasurePreview(null);
    setMeasureGuides([]);
  }, []);

  const cancelTool = useCallback(() => {
    setToolState("select");
    resetHallwayDraft();
    setOpeningAnchor(null);
    setDoorPreviewHit(null);
    setHoveredWallKey(null);
    setWallHover(null);
    setHoverMeasurement(null);
    setMeasurePreview(null);
    setMeasureGuides([]);
    setSnapPointPrompt(null);
  }, [resetHallwayDraft]);

  const setTool = useCallback(
    (next: EditorTool) => beginToolAction(next),
    [beginToolAction],
  );

  const startOpenWallFromHit = useCallback((hit: RoomWallHit) => {
    setOpeningAnchor({
      placementId: hit.placementId,
      wallIndex: hit.wallIndex,
      offsetMm: hit.offsetMm,
    });
  }, []);

  const startDoorFromWallHit = useCallback(
    (hit: RoomWallHit) => {
      void placeDoorFromWallHit(hit).then((doorId) => {
        if (!doorId) return;
        setDoorPreviewHit(null);
        setToolState("select");
        setSelectedSurfaceId(`${hit.placementId}:door:${doorId}`);
      });
    },
    [placeDoorFromWallHit, setSelectedSurfaceId],
  );

  const placeWindowFromWallHit = useCallback(
    (hit: RoomWallHit) => {
      const room = activePlacedRooms.find(
        (item) => item.placementId === hit.placementId,
      );
      if (!room) return;
      const edge = wallSegmentByIndex(room, hit.wallIndex);
      if (!edge) return;
      const dims = defaultWindowDimensionsMm();
      const offsetFromCornerMm = clampOpeningOffset(
        edge.lengthMm,
        dims.widthMm,
        hit.offsetMm,
      );
      const candidate = {
        wallIndex: hit.wallIndex,
        widthMm: dims.widthMm,
        heightMm: dims.heightMm,
        sillHeightMm: dims.sillHeightMm,
        offsetFromCornerMm,
      };
      if (!validateWindowPlacement(room, candidate).valid) return;
      void addWindowToPlacement(
        hit.placementId,
        hit.wallIndex,
        offsetFromCornerMm,
      );
    },
    [activePlacedRooms, addWindowToPlacement],
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
        startPlacement: null,
        endPlacement: null,
      });
    },
    [activePlacedRooms],
  );

  const startHallwayFromWallHit = useCallback(
    (hit: RoomWallHit) => {
      const room = activePlacedRooms.find(
        (item) => item.placementId === hit.placementId,
      );
      if (!room) return;

      const wallSnap = nearestWallSnapOnWall(
        activeSnapPoints,
        hit.placementId,
        hit.wallIndex,
        hit.offsetMm,
      );
      const snapData = wallSnap ? wallSnapHitFromPoint(wallSnap) : null;
      const snappedHit = (() => {
        if (!snapData) return hit;
        const world = offsetToWorldOnWall(
          room,
          snapData.wallIndex,
          snapData.offsetMm,
        );
        return {
          ...hit,
          wallIndex: snapData.wallIndex,
          offsetMm: snapData.offsetMm,
          xMm: world.x,
          zMm: world.z,
        };
      })();
      const widthMm = snapData?.widthMm ?? hallwayDraft.widthMm;
      startWallPlacement(snappedHit, widthMm);
    },
    [
      activePlacedRooms,
      activeSnapPoints,
      hallwayDraft.widthMm,
      startWallPlacement,
    ],
  );

  const updateWallPlacement = useCallback((placement: WallPlacement) => {
    setHallwayDraft((current) => {
      if (current.phase === "align-exit") {
        const isEnd =
          current.endPlacement &&
          wallLinkKey(current.endPlacement.link) === wallLinkKey(placement.link);
        const isStart =
          current.startPlacement &&
          wallLinkKey(current.startPlacement.link) === wallLinkKey(placement.link);
        if (isEnd) {
          return {
            ...current,
            widthMm: placement.widthMm,
            endPlacement: placement,
          };
        }
        if (isStart) {
          return {
            ...current,
            widthMm: placement.widthMm,
            startPlacement: placement,
          };
        }
        return current;
      }
      return {
        ...current,
        widthMm: placement.widthMm,
        wallPlacement: placement,
      };
    });
  }, []);

  const updateStartPullPreview = useCallback((preview: HallwayWaypoint) => {
    setHallwayDraft((current) => {
      if (
        current.phase !== "placing-start" &&
        current.phase !== "align-exit"
      ) {
        return current;
      }
      if (current.phase === "align-exit") {
        const snapped = nearestExitAlignmentSnap(
          activePlacedRooms,
          activeHallways,
          current,
          preview.xMm,
          preview.zMm,
        );
        return {
          ...current,
          preview: snapped ? snapped.point : preview,
        };
      }
      if (current.wallPlacement) {
        const room = isRoomWallLink(current.wallPlacement.link)
          ? (activePlacedRooms.find(
              (item) =>
                isRoomWallLink(current.wallPlacement!.link) &&
                item.placementId === current.wallPlacement!.link.placementId,
            ) ?? null)
          : null;
        const { point: approachFrom } = commitWallPlacementPoint(
          room,
          activeHallways,
          current.wallPlacement,
        );
        const lineSnap = resolveHallwayDrawLineSnap({
          rooms: activePlacedRooms,
          hallways: activeHallways,
          entranceTargets: collectHallwayEntranceTargets(
            activePlacedRooms,
            activeHallways,
            activeSnapPoints,
          ),
          continuationTargets: collectHallwayContinuationTargets(activeHallways),
          pointerXMm: preview.xMm,
          pointerZMm: preview.zMm,
          approachFrom,
          stickyLine: stickyHallwayEntranceRef.current,
        });
        if (lineSnap) {
          stickyHallwayEntranceRef.current = lineSnap.stickyLine;
          if (
            shouldSnapPointToEntranceCenter(
              lineSnap.stickyLine.anchor,
              lineSnap.point,
            )
          ) {
            return {
              ...current,
              preview:
                lineSnap.stickyLine.kind === "continuation"
                  ? {
                      xMm: Math.round(lineSnap.stickyLine.anchor.xMm),
                      zMm: Math.round(lineSnap.stickyLine.anchor.zMm),
                    }
                  : lineSnap.point,
            };
          }
          return { ...current, preview: lineSnap.point };
        }
        stickyHallwayEntranceRef.current = null;
      }
      return { ...current, preview };
    });
  }, [activeHallways, activePlacedRooms, activeSnapPoints]);

  const commitExitAlignmentSnap = useCallback((snap: ExitAlignmentSnap) => {
    setHallwayDraft((current) => {
      if (current.phase !== "align-exit" && current.phase !== "dragging") {
        return current;
      }
      logHallway("commit exit alignment snap", { label: snap.label });
      return draftFromExitAlignmentSnap(current, snap);
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
        startPlacement: null,
      };
    });
  }, []);

  const confirmStartEntrance = useCallback(() => {
    setHallwayDraft((current) => {
      if (current.phase !== "placing-start" || !current.wallPlacement) {
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

      logHallway("confirm start entrance", { point, link });

      return {
        ...current,
        phase: "pick-end",
        widthMm: current.wallPlacement.widthMm,
        points: [point],
        links: [link],
        preview: null,
        wallPlacement: null,
        startPlacement: current.wallPlacement,
        endPlacement: null,
      };
    });
  }, [activeHallways, activePlacedRooms]);

  const finishPlacementDrag = useCallback(() => {
    setHallwayDraft((current) => {
      const placement =
        current.wallPlacement ?? current.startPlacement;
      const isStartDrag =
        current.phase === "placing-start" ||
        (current.phase === "align-exit" && current.startPlacement);
      if (!isStartDrag || !current.preview || !placement) {
        return current;
      }

      if (current.phase === "align-exit" && current.endPlacement) {
        const alignSnap = nearestExitAlignmentSnap(
          activePlacedRooms,
          activeHallways,
          current,
          current.preview.xMm,
          current.preview.zMm,
          120,
        );
        if (alignSnap) {
          return draftFromExitAlignmentSnap(current, alignSnap);
        }
      }

      const room = isRoomWallLink(placement.link)
        ? (activePlacedRooms.find((item) => {
            const link = placement.link;
            return isRoomWallLink(link) && item.placementId === link.placementId;
          }) ?? null)
        : null;
      if (isRoomWallLink(placement.link) && !room) {
        return current;
      }
      const { point, link } = commitWallPlacementPoint(
        room,
        activeHallways,
        placement,
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
      const snapped = snapHallwayPointWithEntrance(
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
        startPlacement: current.startPlacement,
        endPlacement: current.endPlacement,
      };
    });
  }, [activeHallways, activePlacedRooms, snapHallwayPointWithEntrance]);

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
        const snapped = snapHallwayPointWithEntrance(current, xMm, zMm);
        const extension = extendHallwayEndPoint(
          current.points,
          snapped.point.xMm,
          snapped.point.zMm,
        );
        if (!extension) {
          let preview = snapped.point;
          if (current.endPlacement && current.startPlacement) {
            const alignSnap = nearestExitAlignmentSnap(
              activePlacedRooms,
              activeHallways,
              current,
              preview.xMm,
              preview.zMm,
            );
            if (alignSnap) preview = alignSnap.point;
          }
          return { ...current, preview };
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
    [snapHallwayPointWithEntrance],
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

      const snapped = snapHallwayPointWithEntrance(
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
  }, [activeHallways, activePlacedRooms, snapHallwayPointWithEntrance]);

  const undoHallwayStep = useCallback(() => {
    stickyHallwayEntranceRef.current = null;
    setHallwayDraft((current) => {
      if (current.phase === "idle") return current;
      if (current.phase === "placing-start") {
        return createHallwayDrawDraft();
      }
      if (current.phase === "pick-end" && current.startPlacement) {
        return {
          phase: "placing-start",
          widthMm: current.widthMm,
          points: [],
          links: [],
          preview: null,
          wallPlacement: current.startPlacement,
          startPlacement: null,
          endPlacement: null,
        };
      }
      if (current.phase === "align-exit" && current.startPlacement) {
        return {
          phase: "pick-end",
          widthMm: current.widthMm,
          points: current.points.slice(0, 1),
          links: current.links.slice(0, 1),
          preview: null,
          wallPlacement: null,
          startPlacement: current.startPlacement,
          endPlacement: null,
        };
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
      if (tool === "select" || tool === "move") {
        const doorRef = selectedSurfaceId
          ? parseDoorSurfaceId(selectedSurfaceId)
          : null;
        if (doorRef) {
          const room = activePlacedRooms.find(
            (item) => item.placementId === doorRef.placementId,
          );
          const door = room?.doors.find((item) => item.id === doorRef.doorId);
          if (room && door && hit.placementId === doorRef.placementId) {
            const anchor = doorMoveAnchorFromClick(door, hit.offsetMm);
            const offsetFromCornerMm = resolveDoorWallOffsetMm(
              room,
              activeSnapPoints,
              hit.wallIndex,
              hit.offsetMm,
              door.widthMm,
              anchor,
            );
            if (offsetFromCornerMm === null) return;
            const candidate = {
              wallIndex: hit.wallIndex,
              offsetFromCornerMm,
              widthMm: door.widthMm,
              heightMm: door.heightMm,
              hingeSide: door.hingeSide,
            };
            if (!validateDoorPlacement(room, candidate).valid) return;
            void updateDoor(doorRef.placementId, doorRef.doorId, {
              wallIndex: hit.wallIndex,
              offsetFromCornerMm,
            });
            return;
          }
        }

        const windowRef = selectedSurfaceId
          ? parseWindowSurfaceId(selectedSurfaceId)
          : null;
        if (windowRef) {
          const room = activePlacedRooms.find(
            (item) => item.placementId === windowRef.placementId,
          );
          const window = room?.windows?.find(
            (item) => item.id === windowRef.windowId,
          );
          if (room && window && hit.placementId === windowRef.placementId) {
            const edge = wallSegmentByIndex(room, hit.wallIndex);
            if (edge) {
              const nextOffset = clampOpeningOffset(
                edge.lengthMm,
                window.widthMm,
                hit.offsetMm,
              );
              const candidate = {
                ...window,
                wallIndex: hit.wallIndex,
                offsetFromCornerMm: nextOffset,
              };
              const clamped = clampWindowOnWall(room, candidate, hit.offsetMm);
              if (!clamped) return;
              void updateWindow(windowRef.placementId, windowRef.windowId, {
                wallIndex: clamped.wallIndex,
                offsetFromCornerMm: clamped.offsetFromCornerMm,
              });
            }
            return;
          }
        }
      }

      if (tool === "snap-point") {
        const room = activePlacedRooms.find(
          (item) => item.placementId === hit.placementId,
        );
        if (!room) return;
        void addSnapPoint({
          ...snapPointFromRoomWallHit(
            room,
            hit,
            defaultWallSnapLabel(activeSnapPoints, room.name),
          ),
        });
        return;
      }

      if (tool === "hallway") {
        const room = activePlacedRooms.find(
          (item) => item.placementId === hit.placementId,
        );
        if (!room) return;

        const wallSnap = nearestWallSnapOnWall(
          activeSnapPoints,
          hit.placementId,
          hit.wallIndex,
          hit.offsetMm,
        );
        const snapData = wallSnap ? wallSnapHitFromPoint(wallSnap) : null;
        const snappedHit = (() => {
          if (!snapData) return hit;
          const world = offsetToWorldOnWall(
            room,
            snapData.wallIndex,
            snapData.offsetMm,
          );
          return {
            ...hit,
            wallIndex: snapData.wallIndex,
            offsetMm: snapData.offsetMm,
            xMm: world.x,
            zMm: world.z,
          };
        })();
        const widthMm = snapData?.widthMm ?? hallwayDraft.widthMm;

        if (hallwayDraft.phase === "idle") {
          startWallPlacement(snappedHit, widthMm);
          return;
        }

        if (hallwayDraft.phase === "pick-end") {
          const startLink = hallwayDraft.links[0];
          if (!startLink) return;

          const endPlacement = createWallPlacementFromHit(
            room,
            snappedHit,
            widthMm,
            hallwayDraft.points[0],
          );

          if (wallLinkKey(startLink) === wallLinkKey(endPlacement.link)) {
            return;
          }

          logHallway("exit portal set — align path", {
            end: endPlacement.link,
          });

          setHallwayDraft({
            phase: "align-exit",
            widthMm,
            points: hallwayDraft.points,
            links: hallwayDraft.links,
            preview: null,
            wallPlacement: null,
            startPlacement: hallwayDraft.startPlacement,
            endPlacement,
          });
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
              snappedHit,
              widthMm,
              last,
            ),
            startPlacement: null,
          }));
        }
        return;
      }


      if (tool === "add-door") {
        void placeDoorFromWallHit(hit).then((doorId) => {
          if (!doorId) return;
          setDoorPreviewHit(null);
          setToolState("select");
          setSelectedSurfaceId(`${hit.placementId}:door:${doorId}`);
        });
        return;
      }

      if (tool === "add-window") {
        const room = activePlacedRooms.find(
          (item) => item.placementId === hit.placementId,
        );
        if (!room) return;
        const edge = wallSegmentByIndex(room, hit.wallIndex);
        if (!edge) return;
        const dims = defaultWindowDimensionsMm();
        const offsetFromCornerMm = clampOpeningOffset(
          edge.lengthMm,
          dims.widthMm,
          hit.offsetMm,
        );
        const candidate = {
          wallIndex: hit.wallIndex,
          widthMm: dims.widthMm,
          heightMm: dims.heightMm,
          sillHeightMm: dims.sillHeightMm,
          offsetFromCornerMm,
        };
        if (!validateWindowPlacement(room, candidate).valid) return;
        void addWindowToPlacement(
          hit.placementId,
          hit.wallIndex,
          offsetFromCornerMm,
        );
        return;
      }

      if (tool === "open-walls") {
        const room = activePlacedRooms.find(
          (item) => item.placementId === hit.placementId,
        );
        if (!room) return;
        if (offsetInOpening(room, hit.wallIndex, hit.offsetMm)) return;

        if (!openingAnchor) {
          setOpeningAnchor({
            placementId: hit.placementId,
            wallIndex: hit.wallIndex,
            offsetMm: hit.offsetMm,
          });
          return;
        }

        if (
          openingAnchor.placementId !== hit.placementId ||
          openingAnchor.wallIndex !== hit.wallIndex
        ) {
          setOpeningAnchor({
            placementId: hit.placementId,
            wallIndex: hit.wallIndex,
            offsetMm: hit.offsetMm,
          });
          return;
        }

        void addWallOpening(
          hit.placementId,
          hit.wallIndex,
          openingAnchor.offsetMm,
          hit.offsetMm,
        ).then(() => setOpeningAnchor(null));
      }
    },
    [
      activeHallways,
      activePlacedRooms,
      activeSnapPoints,
      addSnapPoint,
      addWallOpening,
      placeDoorFromWallHit,
      selectedSurfaceId,
      updateDoor,
      updateWindow,
      addWindowToPlacement,
      hallwayDraft.links,
      hallwayDraft.phase,
      hallwayDraft.points,
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
          startPlacement: null,
          endPlacement: null,
        });
        return;
      }

      if (hallwayDraft.phase === "pick-end") {
        const startLink = hallwayDraft.links[0];
        if (!startLink) return;

        const endPlacement = createWallPlacementFromHallwayHit(
          hit.hallway,
          hit,
          hallwayDraft.widthMm,
          hallwayDraft.points[0],
        );

        if (wallLinkKey(startLink) === wallLinkKey(endPlacement.link)) {
          return;
        }

        logHallway("exit portal set on hallway wall — align path", {
          end: endPlacement.link,
        });

        setHallwayDraft({
          phase: "align-exit",
          widthMm: hallwayDraft.widthMm,
          points: hallwayDraft.points,
          links: hallwayDraft.links,
          preview: null,
          wallPlacement: null,
          startPlacement: hallwayDraft.startPlacement,
          endPlacement,
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
          startPlacement: null,
        }));
      }
    },
    [
      activeHallways,
      activePlacedRooms,
      hallwayDraft.links,
      hallwayDraft.phase,
      hallwayDraft.points,
      hallwayDraft.widthMm,
      tool,
    ],
  );

  const handleRoomSelect = useCallback(
    (placementId: string) => {
      if (tool === "move" || tool === "select") {
        setSelectedPlacementId(placementId);
        setSelectedFurnishingId(null);
      }
    },
    [tool],
  );

  const clearSelection = useCallback(() => {
    setSelectedSurfaceId(null);
    setSelectedPlacementId(null);
    setSelectedFurnishingId(null);
    setDimensionEditTarget(null);
    setHoveredWallKey(null);
    setHoverMeasurement(null);
  }, [setHoverMeasurement, setSelectedSurfaceId]);

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
        if (contextMenu) {
          closeContextMenu();
          return;
        }
        if (dimensionEditTarget) {
          setDimensionEditTarget(null);
          return;
        }
        if (measureStart) {
          resetMeasure();
          if (tool === "measure") {
            exitMeasureTool();
          }
          return;
        }
        if (tool === "measure") {
          exitMeasureTool();
          return;
        }
        cancelTool();
        return;
      }

      if (
        event.key === "Enter" &&
        tool === "hallway" &&
        hallwayDraft.phase === "placing-start"
      ) {
        event.preventDefault();
        confirmStartEntrance();
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
        return;
      }

      if (
        (event.key === "r" || event.key === "R") &&
        (tool === "furnish" || tool === "select") &&
        selectedFurnishingId
      ) {
        event.preventDefault();
        rotateFurnishing();
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        (tool === "furnish" || tool === "select") &&
        selectedFurnishingId
      ) {
        event.preventDefault();
        const id = selectedFurnishingId;
        setSelectedFurnishingId(null);
        void deleteFurnishing(id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeHallways,
    activePlacedRooms,
    cancelTool,
    closeContextMenu,
    confirmStartEntrance,
    contextMenu,
    finishHallway,
    hallwayDraft,
    tool,
    undoHallwayStep,
    undoLastEditorAction,
    rotateFurnishing,
    selectedFurnishingId,
    deleteFurnishing,
    setSelectedFurnishingId,
    dimensionEditTarget,
    measureStart,
    measureEnd,
    resetMeasure,
    exitMeasureTool,
  ]);

  const value = useMemo(
    () => ({
      tool,
      setTool,
      hallwayDraft,
      wallHover,
      setWallHover,
      openingAnchor,
      doorPreviewHit,
      handleDoorWallHover,
      selectedPlacementId,
      roomFlash,
      hoveredWallKey,
      setHoveredWallKey,
      setHallwayWidthMm,
      updateWallPlacement,
      updateStartPullPreview,
      confirmEndWallPlacement,
      confirmStartEntrance,
      commitExitAlignmentSnap,
      updatePathPreview,
      commitPathSegment,
      finishPlacementDrag,
      undoHallwayStep,
      finishHallway,
      resetHallwayDraft,
      cancelTool,
      contextMenu,
      openContextMenu,
      closeContextMenu,
      beginToolAction,
      startHallwayFromWallHit,
      startOpenWallFromHit,
      startDoorFromWallHit,
      placeDoorFromWallHit,
      placeWindowFromWallHit,
      handleWallHit,
      handleHallwayWallHit,
      handleRoomSelect,
      clearSelection,
      focusRoomFromInventory,
      setHallwayOrbitEnabled,
      hallwayOrbitEnabled,
      hoverMeasurement,
      setHoverMeasurement,
      selectedPresetId,
      setSelectedPresetId,
      furnishMode,
      selectPlacementPreset,
      selectFurnishingForAdjust,
      consumeFurnishPlacementSuppression,
      suppressFurnishPlacement,
      selectedFurnishingId,
      setSelectedFurnishingId,
      furnishingRotation,
      rotateFurnishing,
      measureStart,
      measureEnd,
      measurePhase,
      measurePreview,
      setMeasurePreview,
      handleMeasureClick,
      moveMeasurePoint,
      finishMeasurePointDrag,
      measureGuides,
      snapMeasurePoint,
      resetMeasure,
      exitMeasureTool,
      snapPointPrompt,
      setSnapPointPrompt,
      dimensionEditTarget,
      startDimensionEdit,
      cancelDimensionEdit,
      roomDrawMode,
      setRoomDrawMode,
      roomAngleSnapMode,
      setRoomAngleSnapMode,
      hallwayAngleSnapMode,
      setHallwayAngleSnapMode,
      roomDrawSegmentLengthMm,
      setRoomDrawSegmentLengthMm,
      roomDrawInteriorAngleDeg,
      setRoomDrawInteriorAngleDeg,
      roomDrawWarnings,
      setRoomDrawWarnings,
    }),
    [
      tool,
      setTool,
      hallwayDraft,
      wallHover,
      openingAnchor,
      doorPreviewHit,
      handleDoorWallHover,
      selectedPlacementId,
      roomFlash,
      hoveredWallKey,
      setHallwayWidthMm,
      updateWallPlacement,
      updateStartPullPreview,
      confirmEndWallPlacement,
      confirmStartEntrance,
      commitExitAlignmentSnap,
      updatePathPreview,
      commitPathSegment,
      finishPlacementDrag,
      undoHallwayStep,
      finishHallway,
      resetHallwayDraft,
      cancelTool,
      contextMenu,
      openContextMenu,
      closeContextMenu,
      beginToolAction,
      startHallwayFromWallHit,
      startOpenWallFromHit,
      startDoorFromWallHit,
      placeDoorFromWallHit,
      placeWindowFromWallHit,
      handleWallHit,
      handleHallwayWallHit,
      handleRoomSelect,
      clearSelection,
      focusRoomFromInventory,
      setHallwayOrbitEnabled,
      hallwayOrbitEnabled,
      hoverMeasurement,
      setHoverMeasurement,
      selectedPresetId,
      furnishMode,
      selectPlacementPreset,
      selectFurnishingForAdjust,
      selectedFurnishingId,
      furnishingRotation,
      rotateFurnishing,
      measureStart,
      measureEnd,
      measurePhase,
      measurePreview,
      handleMeasureClick,
      moveMeasurePoint,
      finishMeasurePointDrag,
      measureGuides,
      snapMeasurePoint,
      resetMeasure,
      exitMeasureTool,
      snapPointPrompt,
      dimensionEditTarget,
      startDimensionEdit,
      cancelDimensionEdit,
      roomDrawMode,
      roomAngleSnapMode,
      hallwayAngleSnapMode,
      roomDrawSegmentLengthMm,
      roomDrawInteriorAngleDeg,
      roomDrawWarnings,
    ],
  );

  return (
    <UnitEditorContext.Provider value={value}>
      {children}
    </UnitEditorContext.Provider>
  );
}
