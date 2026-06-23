"use client";

import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { Group } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { buildHallwaySurfaceSpecs } from "@/tools/room-coat/lib/hallway-geometry";
import {
  allFloorsBounds,
  computeFloorDisplayLayout,
  floorDisplayOffsetFor,
  floorDisplayOffsetM,
  floorLocalGridBounds,
  furnishingsOnFloor,
  hallwaysOnFloor,
  maxRoomHeightMmOnFloor,
  placedRoomsOnFloor,
  snapPointsOnFloor,
  viewBoundsForFloorContent,
} from "@/tools/room-coat/lib/floor-utils";
import type { FurnishingFaceSnapPoint } from "@/tools/room-coat/lib/furnishing-snap-points";
import {
  findSnapPointAt,
  furnishSnapWorldMm,
  isWallSnapPoint,
  roomWallHitFromWallSnapPoint,
} from "@/tools/room-coat/lib/snap-point-utils";
import { furnishingPresetById, FURNISHING_PRESETS } from "@/tools/room-coat/lib/furnishing-presets";
import { resolveRoomMoveSnap, resolveSnap } from "@/tools/room-coat/lib/layout-snap";
import { nextFloorPinLabel } from "@/tools/room-coat/lib/snap-pin-labels";
import type { WallCenterLineSnap } from "@/tools/room-coat/lib/wall-center-line-snap";
import { contextMenuTargetFromSurface } from "@/tools/room-coat/lib/editor-context-menu";
import { defaultNewRoomName } from "@/tools/room-coat/lib/room-draw";
import { defaultRoomDimensionsMm } from "@/tools/room-coat/lib/units";
import {
  buildRoomSurfaceSpecs,
  cameraViewFromBounds,
  roomWorldOffsetM,
} from "@/tools/room-coat/lib/room-geometry";
import { FloorOrbitControls } from "@/tools/room-coat/components/scene/FloorOrbitControls";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { unitDefaultCoat } from "@/tools/room-coat/types/state";
import type { PlacedRoom, SnapPoint } from "@/tools/room-coat/types/state";
import {
  FloorGridClickPlane,
  FloorIslandGrid,
} from "@/tools/room-coat/components/scene/FloorIslandGrid";
import { PaintableMeshes } from "@/tools/room-coat/components/scene/PaintableMeshes";
import { FurnishingInspectableMesh } from "@/tools/room-coat/components/editor/FurnishingInspectableMesh";
import {
  isFurnishingSurfaceId,
  measurementForFurnishingSurfaceId,
} from "@/tools/room-coat/lib/furnishing-surfaces";
import {
  FloorIslandLabel,
  SnapPointMarker,
  WallSnapPointMarker,
} from "@/tools/room-coat/components/scene/LayoutMeshes";
import { LayoutEditorInteractions } from "@/tools/room-coat/components/editor/LayoutEditorInteractions";
import { useFloorPointerDrag } from "@/tools/room-coat/components/editor/useFloorPointerDrag";
import { RoomDrawInteractions } from "@/tools/room-coat/components/editor/RoomDrawInteractions";
import {
  getHighlightWallKeys,
  HallwayDrawVisuals,
  hallwaySuppressWallKey,
  OpenWallVisuals,
} from "@/tools/room-coat/components/editor/HallwayDraftVisuals";
import { useUnitEditor } from "@/tools/room-coat/components/editor/UnitEditorContext";
import { clientPointFromPointerEvent, pointerEventToLocalMm } from "@/tools/room-coat/lib/editor-pointer";
import {
  measurementForSurfaceId,
  type EditorHoverMeasurement,
} from "@/tools/room-coat/lib/surface-measurements";
import { SurfaceMeasurementLabel } from "@/tools/room-coat/components/editor/SurfaceMeasurementLabel";
import { WallSurfaceLabels } from "@/tools/room-coat/components/editor/WallSurfaceLabels";
import { RoomOpeningsVisuals, DoorDraftVisual } from "@/tools/room-coat/components/scene/RoomOpeningsVisuals";
import { doorDraftAsDoor, doorDraftFromWallHit } from "@/tools/room-coat/lib/door-draft";
import {
  HallwayFloorLabel,
  RoomFloorLabel,
} from "@/tools/room-coat/components/editor/FloorSpaceLabels";

const MM_TO_M = 0.001;

function UnitEditorSceneInner() {
  const {
    state,
    activeUnit,
    activeFloor,
    unitFloors,
    allPlacedRooms,
    activePlacedRooms,
    allHallways,
    activeHallways,
    activeFurnishings,
    activeSnapPoints,
    activePaints,
    selectedSurfaceId,
    setSelectedSurfaceId,
    moveRoom,
    addFurnishing,
    updateFurnishing,
    addSnapPoint,
    updateSnapPoint,
    addRoom,
  } = useRoomCoat();

  const {
    tool,
    hallwayDraft,
    wallHover,
    setWallHover,
    openingAnchor,
    doorPreviewHit,
    handleDoorWallHover,
    hoveredWallKey,
    setHoveredWallKey,
    selectedPlacementId,
    roomFlash,
    handleWallHit,
    handleHallwayWallHit,
    handleRoomSelect,
    clearSelection,
    updateWallPlacement,
    updateStartPullPreview,
    confirmEndWallPlacement,
    confirmStartEntrance,
    commitExitAlignmentSnap,
    updatePathPreview,
    commitPathSegment,
    finishPlacementDrag,
    setHallwayOrbitEnabled,
    hallwayOrbitEnabled,
    setHoverMeasurement,
    hoverMeasurement,
    selectedPresetId,
    selectedFurnishingId,
    setSelectedFurnishingId,
    selectFurnishingForAdjust,
    suppressFurnishPlacement,
    furnishMode,
    furnishingRotation,
    measureStart,
    measureEnd,
    measurePreview,
    setMeasurePreview,
    snapMeasurePoint,
    handleMeasureClick,
    moveMeasurePoint,
    finishMeasurePointDrag,
    measureGuides,
    setSnapPointPrompt,
    openContextMenu,
    dimensionEditTarget,
    roomDrawMode,
    roomAngleSnapMode,
    hallwayAngleSnapMode,
    roomDrawSegmentLengthMm,
    roomDrawInteriorAngleDeg,
    setRoomDrawWarnings,
  } = useUnitEditor();

  const [movePreview, setMovePreview] = useState<
    Record<string, { xMm: number; zMm: number }>
  >({});
  const [draggingFurnishingId, setDraggingFurnishingId] = useState<string | null>(
    null,
  );
  const [furnishDragPreview, setFurnishDragPreview] = useState<{
    xMm: number;
    zMm: number;
    snapLabel?: string;
    guides?: import("@/tools/room-coat/lib/snap-guides").SnapGuideSegment[];
  } | null>(null);
  const furnishDragPreviewRef = useRef(furnishDragPreview);
  furnishDragPreviewRef.current = furnishDragPreview;
  const stickyWallCenterLineRef = useRef<WallCenterLineSnap | null>(null);
  const grabOffset = useRef({ xMm: 0, zMm: 0 });
  const furnishGrabOffset = useRef({ xMm: 0, zMm: 0 });
  const floorGroupRefs = useRef(new Map<string, Group>());
  const activeFloorGroupRef = useRef<Group | null>(null);
  const orbit = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    if (orbit) orbit.enabled = hallwayOrbitEnabled;
  }, [hallwayOrbitEnabled, orbit]);

  useEffect(() => {
    if (state.viewSettings.snapMode === "off") {
      stickyWallCenterLineRef.current = null;
    }
  }, [state.viewSettings.snapMode]);

  useEffect(() => {
    activeFloorGroupRef.current = activeFloor?.id
      ? floorGroupRefs.current.get(activeFloor.id) ?? null
      : null;
  }, [activeFloor?.id]);

  const registerFloorGroup = useCallback((floorId: string, node: Group | null) => {
    if (node) floorGroupRefs.current.set(floorId, node);
    else floorGroupRefs.current.delete(floorId);
  }, []);

  function selectSurface(surfaceId: string) {
    setSelectedSurfaceId(surfaceId);
    if (!isFurnishingSurfaceId(surfaceId)) {
      setSelectedFurnishingId(null);
    }
  }

  const meshOptions = { showCeiling: state.viewSettings.showCeilings };
  const floorLayout = useMemo(
    () =>
      computeFloorDisplayLayout(
        activeUnit.id,
        unitFloors,
        allPlacedRooms,
        allHallways,
      ),
    [activeUnit.id, unitFloors, allPlacedRooms, allHallways],
  );
  const floorCameraView = useMemo(() => {
    if (!activeFloor) {
      const bounds = allFloorsBounds(
        activeUnit.id,
        unitFloors,
        allPlacedRooms,
        allHallways,
      );
      return cameraViewFromBounds(
        bounds,
        Math.max(...allPlacedRooms.map((room) => room.heightMm), 2438),
      );
    }
    return cameraViewFromBounds(
      viewBoundsForFloorContent(
        activeUnit.id,
        activeFloor.id,
        unitFloors,
        allPlacedRooms,
        allHallways,
      ),
      maxRoomHeightMmOnFloor(allPlacedRooms, activeFloor.id),
    );
  }, [activeFloor, activeUnit.id, allHallways, allPlacedRooms, unitFloors]);

  const highlightWalls = useMemo(
    () => getHighlightWallKeys(hoveredWallKey),
    [hoveredWallKey],
  );

  const doorPreview = useMemo(() => {
    if (tool !== "add-door" || !doorPreviewHit) return null;
    const room = activePlacedRooms.find(
      (item) => item.placementId === doorPreviewHit.placementId,
    );
    if (!room) return null;
    const draft = doorDraftFromWallHit(room, doorPreviewHit);
    return draft ? { room, door: doorDraftAsDoor(draft), draft } : null;
  }, [activePlacedRooms, doorPreviewHit, tool]);

  const selectedMeasurement = useMemo(() => {
    if (!selectedSurfaceId) return null;
    if (isFurnishingSurfaceId(selectedSurfaceId)) {
      return measurementForFurnishingSurfaceId(
        activeFurnishings,
        selectedSurfaceId,
        state.unitPreference,
      );
    }
    return measurementForSurfaceId(
      allPlacedRooms,
      allHallways,
      selectedSurfaceId,
      state.unitPreference,
      meshOptions,
    );
  }, [
    activeFurnishings,
    allHallways,
    allPlacedRooms,
    selectedSurfaceId,
    state.unitPreference,
    meshOptions.showCeiling,
  ]);

  const sceneMeasurementLabel = useMemo((): {
    measurement: EditorHoverMeasurement;
    emphasis: "hover" | "selected";
    anchorM: [number, number, number];
  } | null => {
    if (tool === "measure") return null;
    if (!hoverMeasurement?.anchorM) return null;

    const onSelectedSurface =
      selectedMeasurement?.surfaceId === hoverMeasurement.surfaceId;

    return {
      measurement: onSelectedSurface ? selectedMeasurement : hoverMeasurement,
      emphasis: onSelectedSurface ? "selected" : "hover",
      anchorM: hoverMeasurement.anchorM,
    };
  }, [hoverMeasurement, selectedMeasurement, tool]);

  function updateMeasurePreview(xMm: number, zMm: number) {
    if (tool !== "measure") return;
    if (measureStart && measureEnd) return;
    setMeasurePreview(
      snapMeasurePoint(xMm, zMm, measureStart ?? undefined),
    );
  }

  const hallwayVisualsActive =
    tool === "hallway" && hallwayDraft.phase !== "idle";
  const suppressWallKey = hallwaySuppressWallKey(hallwayDraft);

  const disableOrbit = () => {
    if (orbit) orbit.enabled = false;
    setHallwayOrbitEnabled(false);
  };
  const enableOrbit = () => {
    if (orbit) orbit.enabled = true;
    setHallwayOrbitEnabled(true);
  };

  const beginFurnishDrag = useFloorPointerDrag(
    disableOrbit,
    enableOrbit,
    activeFloorGroupRef,
  );

  function snapFurnishDrag(
    furnishingId: string,
    xMm: number,
    zMm: number,
  ): {
    xMm: number;
    zMm: number;
    snapLabel?: string;
    guides?: import("@/tools/room-coat/lib/snap-guides").SnapGuideSegment[];
  } {
    const item = activeFurnishings.find((entry) => entry.id === furnishingId);
    if (!item || !activeFloor) {
      return { xMm, zMm };
    }
    const floorRooms = placedRoomsOnFloor(allPlacedRooms, activeFloor.id);
    const floorFurnishings = furnishingsOnFloor(state.furnishings, activeFloor.id);
    const floorSnapPoints = snapPointsOnFloor(state.snapPoints, activeFloor.id);
    const floorHallways = hallwaysOnFloor(allHallways, activeFloor.id);
    const snapped = resolveSnap({
      xMm,
      zMm,
      widthMm: item.widthMm,
      depthMm: item.depthMm,
      rotationDeg: item.rotationDeg,
      rooms: floorRooms,
      hallways: floorHallways,
      furnishings: floorFurnishings,
      snapPoints: floorSnapPoints,
      unit: state.unitPreference,
      snapMode: state.viewSettings.snapMode,
      excludeFurnishingId: furnishingId,
      freeWhenUnmatched: true,
      stickyWallCenterLine: stickyWallCenterLineRef.current,
    });
    stickyWallCenterLineRef.current = snapped.stickyWallCenterLine ?? null;
    return {
      xMm: snapped.xMm,
      zMm: snapped.zMm,
      snapLabel: snapped.source?.label,
      guides: snapped.guides,
    };
  }

  function roomOffset(
    placementId: string,
    base: [number, number, number],
  ): [number, number, number] {
    const preview = movePreview[placementId];
    if (!preview) return base;
    return [preview.xMm * MM_TO_M, base[1], preview.zMm * MM_TO_M];
  }

  async function handlePlaceFurnishing(
    centerXMm: number,
    centerZMm: number,
    snapPointId?: string | null,
  ) {
    if (!activeFloor) return;
    const preset = furnishingPresetById(selectedPresetId) ?? FURNISHING_PRESETS[0];
    const id = await addFurnishing({
      label: preset.label,
      presetId: preset.id,
      widthMm: preset.widthMm,
      depthMm: preset.depthMm,
      heightMm: preset.heightMm,
      centerXMm,
      centerZMm,
      rotationDeg: furnishingRotation,
      color: preset.color,
      floorId: activeFloor.id,
      snapPointId: snapPointId ?? null,
    });
    setSelectedFurnishingId(id);
    if (snapPointId) {
      const point = activeSnapPoints.find((entry) => entry.id === snapPointId);
      if (point?.consumeOnPlace) {
        setSnapPointPrompt({
          furnishingId: id,
          furnishingLabel: preset.label,
          snapPointId,
          snapPointLabel: point.label,
        });
      }
    }
  }

  async function handleMoveFurnishing(
    furnishingId: string,
    centerXMm: number,
    centerZMm: number,
    snapPointId?: string | null,
  ) {
    await updateFurnishing(furnishingId, {
      centerXMm,
      centerZMm,
      snapPointId: snapPointId ?? null,
    });
  }

  async function handleFurnishingFaceSnapClick(snap: FurnishingFaceSnapPoint) {
    if (!activeFloor) return;

    if (tool === "snap-point") {
      await addSnapPoint({
        kind: "floor",
        xMm: snap.xMm,
        zMm: snap.zMm,
        label: snap.label,
        consumeOnPlace: false,
        floorId: activeFloor.id,
      });
      return;
    }

    if (tool === "measure") {
      handleMeasureClick(snap.xMm, snap.zMm);
      return;
    }

    if (tool === "furnish") {
      if (selectedFurnishingId && draggingFurnishingId) {
        await handleMoveFurnishing(selectedFurnishingId, snap.xMm, snap.zMm);
        setFurnishDragPreview(null);
        setDraggingFurnishingId(null);
        if (orbit) orbit.enabled = true;
        return;
      }
      await handlePlaceFurnishing(snap.xMm, snap.zMm);
      return;
    }
  }

  async function handleFinishFurnishingDrag(
    furnishingId: string,
    centerXMm: number,
    centerZMm: number,
  ) {
    const item = activeFurnishings.find((entry) => entry.id === furnishingId);
    if (!item || !activeFloor) return;

    const floorRooms = placedRoomsOnFloor(allPlacedRooms, activeFloor.id);
    const floorSnapPoints = snapPointsOnFloor(state.snapPoints, activeFloor.id);

    const snapPointId =
      findSnapPointAt(centerXMm, centerZMm, floorSnapPoints, floorRooms)?.id ??
      null;

    setDraggingFurnishingId(null);
    if (orbit) orbit.enabled = true;

    await handleMoveFurnishing(
      furnishingId,
      centerXMm,
      centerZMm,
      snapPointId,
    );

    if (snapPointId) {
      const point = floorSnapPoints.find((entry) => entry.id === snapPointId);
      if (point?.consumeOnPlace) {
        setSnapPointPrompt({
          furnishingId,
          furnishingLabel: item.label,
          snapPointId,
          snapPointLabel: point.label,
        });
      }
    }
  }

  async function handleWallSnapPointClick(
    point: SnapPoint,
    room: PlacedRoom,
    event: ThreeEvent<MouseEvent>,
  ) {
    if (!activeFloor) return;
    event.stopPropagation();

    if (tool === "snap-point") {
      openSnapPointContextMenu(point, event);
      return;
    }

    suppressFurnishPlacement();

    const floorRooms = placedRoomsOnFloor(allPlacedRooms, activeFloor.id);
    const floorFurnishings = furnishingsOnFloor(state.furnishings, activeFloor.id);
    const floorSnapPoints = snapPointsOnFloor(state.snapPoints, activeFloor.id);
    const floorHallways = hallwaysOnFloor(allHallways, activeFloor.id);

    if (tool === "hallway") {
      const hit = roomWallHitFromWallSnapPoint(room, point);
      if (hit) handleWallHit(hit);
      return;
    }

    if (tool === "measure" && snapMeasurePoint) {
      const anchor = furnishSnapWorldMm(point, floorRooms, 200);
      const snapped = snapMeasurePoint(anchor.xMm, anchor.zMm);
      handleMeasureClick(snapped.xMm, snapped.zMm);
      return;
    }

    if (tool === "furnish") {
      const preset = furnishingPresetById(selectedPresetId) ?? FURNISHING_PRESETS[0];
      const item = selectedFurnishingId
        ? activeFurnishings.find((entry) => entry.id === selectedFurnishingId)
        : null;
      const insetMm = Math.max((item?.depthMm ?? preset.depthMm) / 2, 200);
      const anchor = furnishSnapWorldMm(point, floorRooms, insetMm);
      const snapped = resolveSnap({
        xMm: anchor.xMm,
        zMm: anchor.zMm,
        widthMm: item?.widthMm ?? preset.widthMm,
        depthMm: item?.depthMm ?? preset.depthMm,
        rotationDeg: item?.rotationDeg ?? furnishingRotation,
        rooms: floorRooms,
        hallways: floorHallways,
        furnishings: floorFurnishings,
        snapPoints: floorSnapPoints,
        unit: state.unitPreference,
        snapMode: state.viewSettings.snapMode,
        excludeFurnishingId: selectedFurnishingId ?? undefined,
        freeWhenUnmatched:
          furnishMode === "adjust" || Boolean(selectedFurnishingId),
      });

      if (furnishMode === "place") {
        await handlePlaceFurnishing(snapped.xMm, snapped.zMm, point.id);
      } else if (selectedFurnishingId) {
        await handleMoveFurnishing(
          selectedFurnishingId,
          snapped.xMm,
          snapped.zMm,
          point.id,
        );
      }
    }
  }

  function openSnapPointContextMenu(
    point: SnapPoint,
    event: ThreeEvent<MouseEvent>,
  ) {
    event.stopPropagation();
    const { clientX, clientY } = clientPointFromPointerEvent(
      event,
      gl.domElement,
    );
    openContextMenu({
      clientX,
      clientY,
      target: {
        kind: "snap-point",
        snapPointId: point.id,
        label: point.label ?? "Snap pin",
      },
    });
  }

  async function handleDrawCreateRoom(input: {
    verticesMm: Array<{ xMm: number; zMm: number }>;
    closed: boolean;
    originXMm: number;
    originZMm: number;
    widthMm: number;
    lengthMm: number;
  }): Promise<string[]> {
    if (!activeFloor) {
      setRoomDrawWarnings(["Add a floor before drawing rooms."]);
      return ["Add a floor before drawing rooms."];
    }
    const defaults = defaultRoomDimensionsMm();
    const warnings: string[] = [];
    const { placementId } = await addRoom({
      name: input.closed
        ? defaultNewRoomName(state.rooms)
        : `Walls ${state.placements.filter((p) => !p.closed).length + 1}`,
      widthMm: input.widthMm,
      lengthMm: input.lengthMm,
      heightMm: defaults.heightMm,
      originXMm: input.originXMm,
      originZMm: input.originZMm,
      verticesMm: input.verticesMm,
      closed: input.closed,
      floorId: activeFloor.id,
    });
    if (!placementId) return warnings;
    setRoomDrawWarnings(warnings);
    return warnings;
  }

  function renderSurfaceMeasurementLabel(
    specs: ReturnType<typeof buildRoomSurfaceSpecs>,
    surfaceIdPrefix: string,
  ) {
    if (!sceneMeasurementLabel) return null;
    const { measurement, emphasis, anchorM } = sceneMeasurementLabel;
    if (!measurement.surfaceId.startsWith(surfaceIdPrefix)) return null;
    const spec = specs.find((item) => item.surfaceId === measurement.surfaceId);
    if (!spec) return null;
    return (
      <SurfaceMeasurementLabel
        spec={spec}
        text={measurement.dimensions}
        anchorWorldM={anchorM}
        emphasis={emphasis}
      />
    );
  }

  const furnishingInspectable =
    tool === "select" ||
    tool === "furnish" ||
    tool === "move" ||
    tool === "measure";

  const showFurnishingFaceSnaps =
    state.viewSettings.showSnapPoints &&
    (tool === "furnish" ||
      tool === "snap-point" ||
      tool === "measure" ||
      tool === "hallway");

  const showWallEntranceMarkers =
    state.viewSettings.showSnapPoints &&
    (tool === "furnish" ||
      tool === "snap-point" ||
      tool === "measure" ||
      tool === "hallway");

  return (
    <>
      <color attach="background" args={["#0f172a"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} />

      {unitFloors.map((floor) => {
        const [offsetXM, offsetZM] = floorDisplayOffsetM(floor.id, floorLayout);
        const isActive = floor.id === activeFloor?.id;
        const floorRooms = placedRoomsOnFloor(allPlacedRooms, floor.id);
        const floorHallways = hallwaysOnFloor(allHallways, floor.id);
        const floorFurnishings = furnishingsOnFloor(state.furnishings, floor.id);
        const floorSnapPoints = snapPointsOnFloor(state.snapPoints, floor.id);
        const gridBounds = floorLocalGridBounds(
          floor.id,
          allPlacedRooms,
          allHallways,
        );
        const deselectOnBackgroundClick =
          tool === "select" || tool === "move";

        return (
          <group
            key={floor.id}
            ref={(node) => {
              registerFloorGroup(floor.id, node);
              if (isActive) activeFloorGroupRef.current = node;
            }}
            position={[offsetXM, 0, offsetZM]}
          >
            <FloorIslandGrid bounds={gridBounds} />
            <FloorGridClickPlane
              bounds={gridBounds}
              enabled={deselectOnBackgroundClick}
              onClick={clearSelection}
            />
            {unitFloors.length > 1 && (
              <FloorIslandLabel
                name={floor.name}
                gridBounds={gridBounds}
                active={isActive}
              />
            )}
            {floorRooms.map((room) => {
              const offset = roomWorldOffsetM(room);
              const displayOffset = roomOffset(room.placementId, offset);
              const specs = buildRoomSurfaceSpecs(room, meshOptions);
              const selected = selectedPlacementId === room.placementId;
              const wallFlashKey =
                roomFlash?.placementId === room.placementId
                  ? roomFlash.key
                  : undefined;

              return (
                <group key={room.placementId} position={displayOffset}>
                  <PaintableMeshes
                    specs={specs}
                    space={room}
                    floorLocalSpace={floorGroupRefs.current.get(floor.id) ?? null}
                    paints={activePaints}
                    unitDefaultCoat={unitDefaultCoat(activeUnit)}
                    selectedSurfaceId={selectedSurfaceId}
                    showCeilings={state.viewSettings.showCeilings}
                    showFloorGrid={state.viewSettings.showFloorGrid}
                    editorTool={tool}
                    hoveredWallKey={hoveredWallKey}
                    highlightWallKeys={highlightWalls}
                    raycastSuppressWallKey={suppressWallKey}
                    roomFloorHighlighted={
                      (tool === "move" || tool === "select") &&
                      selected &&
                      isActive
                    }
                    wallFlashKey={wallFlashKey}
                    unitPreference={state.unitPreference}
                    onMeasureHover={isActive ? setHoverMeasurement : undefined}
                    onMeasurePreview={
                      tool === "measure" && isActive
                        ? updateMeasurePreview
                        : undefined
                    }
                    onMeasureClick={
                      tool === "measure" && isActive
                        ? handleMeasureClick
                        : undefined
                    }
                    onSelectSurface={selectSurface}
                    onRoomWallHit={(hit) => {
                      if (!hit || !isActive) return;
                      setHoveredWallKey(`${hit.placementId}:${hit.wallIndex}`);
                      handleWallHit(hit);
                    }}
                    onRoomWallHover={(hit) => {
                      if (!isActive) return;
                      setHoveredWallKey(
                        hit ? `${hit.placementId}:${hit.wallIndex}` : null,
                      );
                      if (tool === "add-door") {
                        handleDoorWallHover(hit);
                        return;
                      }
                      setWallHover(hit ? { xMm: hit.xMm, zMm: hit.zMm } : null);
                    }}
                    onRoomWallActionMenu={
                      isActive
                        ? (hit, clientX, clientY) => {
                            if (!hit) return;
                            openContextMenu({
                              clientX,
                              clientY,
                              target: {
                                kind: "room-wall",
                                hit,
                                roomName: room.name,
                              },
                            });
                          }
                        : undefined
                    }
                    onSurfaceActionMenu={
                      isActive
                        ? (surfaceId, title, clientX, clientY) =>
                            openContextMenu({
                              clientX,
                              clientY,
                              target: contextMenuTargetFromSurface(
                                surfaceId,
                                title,
                                floorRooms,
                              ),
                            })
                        : undefined
                    }
                    onFloorActionMenu={
                      isActive
                        ? (clientX, clientY) =>
                            openContextMenu({
                              clientX,
                              clientY,
                              target: {
                                kind: "room",
                                placementId: room.placementId,
                                name: room.name,
                              },
                            })
                        : undefined
                    }
                    onRoomBodyClick={
                      (tool === "move" || tool === "select") && isActive
                        ? () => handleRoomSelect(room.placementId)
                        : undefined
                    }
                    onRoomBodyPointerDown={
                      tool === "move" && selected && isActive
                        ? (event, xMm, zMm) => {
                            const originXMm =
                              movePreview[room.placementId]?.xMm ??
                              room.originXMm;
                            const originZMm =
                              movePreview[room.placementId]?.zMm ??
                              room.originZMm;
                            grabOffset.current = {
                              xMm: originXMm - xMm,
                              zMm: originZMm - zMm,
                            };
                            const placementId = room.placementId;
                            let lastPreview: { xMm: number; zMm: number } | null =
                              null;
                            beginFurnishDrag(event, {
                              onMove: (pointerXMm, pointerZMm) => {
                                const rawX = Math.round(
                                  pointerXMm + grabOffset.current.xMm,
                                );
                                const rawZ = Math.round(
                                  pointerZMm + grabOffset.current.zMm,
                                );
                                const snapped = resolveRoomMoveSnap({
                                  placementId,
                                  originXMm: rawX,
                                  originZMm: rawZ,
                                  room,
                                  otherRooms: floorRooms,
                                  unit: state.unitPreference,
                                  snapMode: state.viewSettings.snapMode,
                                });
                                lastPreview = {
                                  xMm: snapped.xMm,
                                  zMm: snapped.zMm,
                                };
                                setMovePreview((current) => ({
                                  ...current,
                                  [placementId]: lastPreview!,
                                }));
                              },
                              onEnd: () => {
                                document.body.style.cursor = "grab";
                                setMovePreview((current) => {
                                  const { [placementId]: _, ...rest } = current;
                                  return rest;
                                });
                                if (lastPreview) {
                                  void moveRoom(
                                    placementId,
                                    lastPreview.xMm,
                                    lastPreview.zMm,
                                  );
                                }
                              },
                            });
                          }
                        : undefined
                    }
                  />
                  {state.viewSettings.showRoomLabels && (
                    <RoomFloorLabel room={room} />
                  )}
                  {renderSurfaceMeasurementLabel(specs, `${room.placementId}:`)}
                  {state.viewSettings.showWallLabels && (
                    <WallSurfaceLabels
                      specs={specs}
                      space={room}
                      paints={activePaints}
                      unitDefaultCoat={unitDefaultCoat(activeUnit)}
                      interiorFaceOnly={
                        state.viewSettings.showCeilings && tool !== "paint"
                      }
                    />
                  )}
                  <RoomOpeningsVisuals
                    room={room}
                    furnishings={floorFurnishings}
                    allRooms={floorRooms}
                  />
                </group>
              );
            })}

            {isActive && doorPreview ? (
              <group position={roomWorldOffsetM(doorPreview.room)}>
                <DoorDraftVisual
                  room={doorPreview.room}
                  door={doorPreview.door}
                  furnishings={floorFurnishings}
                  allRooms={floorRooms}
                />
              </group>
            ) : null}

            {floorHallways.map((hallway) => {
              const specs = buildHallwaySurfaceSpecs(hallway, meshOptions);
              return (
                <group key={hallway.id}>
                  <PaintableMeshes
                    specs={specs}
                    space={hallway}
                    floorLocalSpace={floorGroupRefs.current.get(floor.id) ?? null}
                    paints={activePaints}
                    unitDefaultCoat={unitDefaultCoat(activeUnit)}
                    selectedSurfaceId={selectedSurfaceId}
                    showCeilings={state.viewSettings.showCeilings}
                    showFloorGrid={state.viewSettings.showFloorGrid}
                    editorTool={tool}
                    hoveredWallKey={hoveredWallKey}
                    highlightWallKeys={highlightWalls}
                    raycastSuppressWallKey={suppressWallKey}
                    unitPreference={state.unitPreference}
                    onMeasureHover={isActive ? setHoverMeasurement : undefined}
                    onMeasurePreview={
                      tool === "measure" && isActive
                        ? updateMeasurePreview
                        : undefined
                    }
                    onSelectSurface={selectSurface}
                    onHallwayWallHit={(hit) => {
                      if (!isActive) return;
                      setHoveredWallKey(
                        `${hit.hallway.id}:${hit.segIndex}:${hit.side}`,
                      );
                      handleHallwayWallHit(hit);
                    }}
                    onHallwayWallHover={(hit) => {
                      if (!isActive) return;
                      setHoveredWallKey(
                        hit
                          ? `${hit.hallway.id}:${hit.segIndex}:${hit.side}`
                          : null,
                      );
                      setWallHover(
                        hit ? { xMm: hit.xMm, zMm: hit.zMm } : null,
                      );
                    }}
                  />
                  <HallwayFloorLabel hallway={hallway} />
                  {renderSurfaceMeasurementLabel(specs, `${hallway.id}:`)}
                  {state.viewSettings.showWallLabels && (
                    <WallSurfaceLabels
                      specs={specs}
                      space={hallway}
                      paints={activePaints}
                      unitDefaultCoat={unitDefaultCoat(activeUnit)}
                      interiorFaceOnly={
                        state.viewSettings.showCeilings && tool !== "paint"
                      }
                    />
                  )}
                </group>
              );
            })}

            {state.viewSettings.showFurnishings &&
              floorFurnishings.map((item) =>
                draggingFurnishingId === item.id ? null : (
                <FurnishingInspectableMesh
                  key={item.id}
                  item={item}
                  unitPreference={state.unitPreference}
                  selected={selectedFurnishingId === item.id}
                  dimmed={!isActive}
                  hoveredSurfaceId={hoverMeasurement?.surfaceId ?? null}
                  dimensionEditActive={
                    dimensionEditTarget?.kind === "furnishing" &&
                    dimensionEditTarget.furnishingId === item.id
                  }
                  inspectable={furnishingInspectable && isActive}
                  showFaceSnapPoints={showFurnishingFaceSnaps && isActive}
                  onHoverMeasurement={
                    (furnishingInspectable || showFurnishingFaceSnaps) && isActive
                      ? setHoverMeasurement
                      : undefined
                  }
                  onHoverEnd={(surfaceId) => setHoverMeasurement(null, surfaceId)}
                  onSelectFurnishing={selectFurnishingForAdjust}
                  onSelectSurface={selectSurface}
                  onFaceSnapClick={handleFurnishingFaceSnapClick}
                  moveGrabbable={tool === "move" && isActive}
                  onPointerDown={(event) => {
                    if (!isActive || (tool !== "furnish" && tool !== "move")) return;
                    event.stopPropagation();
                    selectFurnishingForAdjust(item.id);
                    setDraggingFurnishingId(item.id);
                    document.body.style.cursor = "grabbing";
                    stickyWallCenterLineRef.current = null;
                    const floorGroup = floorGroupRefs.current.get(floor.id);
                    const pointer = floorGroup
                      ? pointerEventToLocalMm(event, floorGroup)
                      : {
                          xMm: Math.round(event.point.x / MM_TO_M),
                          zMm: Math.round(event.point.z / MM_TO_M),
                        };
                    furnishGrabOffset.current = {
                      xMm: item.centerXMm - pointer.xMm,
                      zMm: item.centerZMm - pointer.zMm,
                    };
                    setFurnishDragPreview(
                      snapFurnishDrag(
                        item.id,
                        item.centerXMm,
                        item.centerZMm,
                      ),
                    );
                    beginFurnishDrag(event, {
                      onMove: (xMm, zMm) => {
                        const preview = snapFurnishDrag(
                          item.id,
                          xMm + furnishGrabOffset.current.xMm,
                          zMm + furnishGrabOffset.current.zMm,
                        );
                        setFurnishDragPreview(preview);
                      },
                      onEnd: async () => {
                        const preview = furnishDragPreviewRef.current;
                        if (preview) {
                          await handleFinishFurnishingDrag(
                            item.id,
                            preview.xMm,
                            preview.zMm,
                          );
                        }
                        setFurnishDragPreview(null);
                        setDraggingFurnishingId(null);
                        stickyWallCenterLineRef.current = null;
                        document.body.style.cursor = "";
                        if (tool === "furnish") {
                          suppressFurnishPlacement();
                        }
                      },
                    });
                  }}
                  onDoubleClick={(event) => {
                    if (!isActive) return;
                    event.stopPropagation();
                    const { clientX, clientY } = clientPointFromPointerEvent(
                      event,
                      gl.domElement,
                    );
                    openContextMenu({
                      clientX,
                      clientY,
                      target: {
                        kind: "furnishing",
                        furnishingId: item.id,
                        label: item.label,
                      },
                    });
                  }}
                />
                ),
              )}

            {showWallEntranceMarkers &&
              floorSnapPoints.map((point) => {
                if (isWallSnapPoint(point)) {
                  const room = floorRooms.find(
                    (entry) => entry.placementId === point.roomPlacementId,
                  );
                  if (!room) return null;
                  const interactive =
                    isActive &&
                    (tool === "furnish" ||
                      tool === "measure" ||
                      tool === "hallway" ||
                      tool === "snap-point");
                  return (
                    <WallSnapPointMarker
                      key={point.id}
                      room={room}
                      point={point}
                      dimmed={!isActive}
                      onClick={
                        interactive
                          ? (event) =>
                              void handleWallSnapPointClick(point, room, event)
                          : undefined
                      }
                    />
                  );
                }
                if (tool === "hallway") return null;
                return (
                  <SnapPointMarker
                    key={point.id}
                    label={point.label}
                    xMm={point.xMm}
                    zMm={point.zMm}
                    dimmed={!isActive}
                    variant="floor"
                    floorLocalSpaceRef={isActive ? activeFloorGroupRef : undefined}
                    onClick={
                      tool === "snap-point" && isActive
                        ? (event) => openSnapPointContextMenu(point, event)
                        : undefined
                    }
                    onDrag={
                      tool === "snap-point" && isActive
                        ? (xMm, zMm) => {
                            void updateSnapPoint(point.id, { xMm, zMm });
                          }
                        : undefined
                    }
                    onDragStart={disableOrbit}
                    onDragEnd={enableOrbit}
                  />
                );
              })}

            {isActive && (
              <LayoutEditorInteractions
                gridBounds={gridBounds}
                floor={floor}
                rooms={floorRooms}
                hallways={floorHallways}
                furnishings={floorFurnishings}
                snapPoints={floorSnapPoints}
                unitPreference={state.unitPreference}
                viewSettings={state.viewSettings}
                selectedPresetId={selectedPresetId}
                selectedFurnishingId={selectedFurnishingId}
                furnishingRotation={furnishingRotation}
                measureStart={measureStart}
                measureEnd={measureEnd}
                measureGuides={measureGuides}
                snapMeasurePoint={snapMeasurePoint}
                draggingFurnishingId={draggingFurnishingId}
                furnishDragPreview={furnishDragPreview}
                furnishDragManagedExternally
                onFinishFurnishingDrag={handleFinishFurnishingDrag}
                tool={tool}
                onPlaceFurnishing={handlePlaceFurnishing}
                onMoveFurnishing={handleMoveFurnishing}
                onSelectFurnishing={(id) => {
                  if (id) selectFurnishingForAdjust(id);
                }}
                onPlaceSnapPoint={async (xMm, zMm) => {
                  await addSnapPoint({
                    kind: "floor",
                    xMm,
                    zMm,
                    label: nextFloorPinLabel(floorSnapPoints),
                    consumeOnPlace: true,
                    floorId: floor.id,
                  });
                }}
                onPlaceMeasureSnapPin={async (point) => {
                  await addSnapPoint({
                    kind: "floor",
                    xMm: point.xMm,
                    zMm: point.zMm,
                    label: nextFloorPinLabel(floorSnapPoints),
                    consumeOnPlace: true,
                    floorId: floor.id,
                  });
                }}
                onMeasureClick={handleMeasureClick}
                onMoveMeasurePoint={moveMeasurePoint}
                onFinishMeasurePointDrag={finishMeasurePointDrag}
                onSnapPointPrompt={setSnapPointPrompt}
                onClearSelection={clearSelection}
                onEmptyFloorActionMenu={
                  tool === "select"
                    ? (xMm, zMm, clientX, clientY) =>
                        openContextMenu({
                          clientX,
                          clientY,
                          target: { kind: "empty-floor", xMm, zMm },
                        })
                    : undefined
                }
              />
            )}

            {isActive && tool === "add-room" && (
              <RoomDrawInteractions
                gridBounds={gridBounds}
                rooms={floorRooms}
                hallways={floorHallways}
                snapPoints={floorSnapPoints}
                unitPreference={state.unitPreference}
                drawMode={roomDrawMode}
                angleSnapMode={roomAngleSnapMode}
                typedSegmentLengthMm={roomDrawSegmentLengthMm}
                typedInteriorAngleDeg={roomDrawInteriorAngleDeg}
                onCreateRoom={handleDrawCreateRoom}
                onDrawWarning={(message) =>
                  setRoomDrawWarnings(message ? [message] : [])
                }
                disableOrbit={disableOrbit}
                enableOrbit={enableOrbit}
              />
            )}

          </group>
        );
      })}

      {hallwayVisualsActive && activeFloor && (
        <group
          position={[
            floorDisplayOffsetFor(activeFloor.id, floorLayout).displayOffsetXMm *
              MM_TO_M,
            0,
            floorDisplayOffsetFor(activeFloor.id, floorLayout).displayOffsetZMm *
              MM_TO_M,
          ]}
        >
          <HallwayDrawVisuals
            rooms={activePlacedRooms}
            hallways={activeHallways}
            draft={hallwayDraft}
            angleSnapMode={hallwayAngleSnapMode}
            snapPoints={activeSnapPoints}
            unitPreference={state.unitPreference}
            showCeilings={state.viewSettings.showCeilings}
            onPlacementChange={updateWallPlacement}
            onStartPullOut={updateStartPullPreview}
            onConfirmEndPlacement={confirmEndWallPlacement}
            onConfirmStartEntrance={confirmStartEntrance}
            onAlignSnapCommit={commitExitAlignmentSnap}
            onPathPreview={updatePathPreview}
            onPathCommit={commitPathSegment}
            onPlacementDragEnd={finishPlacementDrag}
            onPathDragEnd={() => {}}
            disableOrbit={disableOrbit}
            enableOrbit={enableOrbit}
          />
        </group>
      )}

      {tool === "open-walls" && activeFloor && (
        <group
          position={[
            floorDisplayOffsetFor(activeFloor.id, floorLayout).displayOffsetXMm *
              MM_TO_M,
            0,
            floorDisplayOffsetFor(activeFloor.id, floorLayout).displayOffsetZMm *
              MM_TO_M,
          ]}
        >
          <OpenWallVisuals
            rooms={activePlacedRooms}
            hover={wallHover}
            openingAnchor={openingAnchor}
            openingPreviewEnd={
              openingAnchor &&
              wallHover &&
              hoveredWallKey ===
                `${openingAnchor.placementId}:${openingAnchor.wallIndex}`
                ? wallHover
                : null
            }
          />
        </group>
      )}

      <FloorOrbitControls
        enabled={hallwayOrbitEnabled}
        initialView={floorCameraView}
        resetKey={activeFloor?.id ?? "__all__"}
      />
    </>
  );
}

export function UnitEditorScene() {
  const { setSelectedSurfaceId } = useRoomCoat();
  const { clearSelection, tool } = useUnitEditor();

  function handlePointerMissed(event: MouseEvent) {
    if (event.type !== "click") return;
    if (tool === "select" || tool === "move") {
      clearSelection();
      return;
    }
    if (tool === "paint") {
      setSelectedSurfaceId(null);
    }
  }

  return (
    <Canvas
      onPointerMissed={handlePointerMissed}
      camera={{
        fov: 50,
        near: 0.1,
        far: 300,
      }}
      className="h-full w-full bg-background"
    >
      <UnitEditorSceneInner />
    </Canvas>
  );
}
