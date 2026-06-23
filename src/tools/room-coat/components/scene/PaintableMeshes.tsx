"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { Edges } from "@react-three/drei";
import {
  FrontSide,
  DoubleSide,
  Vector3,
  Shape,
  Path,
  ShapeGeometry,
  PlaneGeometry,
  type BufferGeometry,
  type Mesh,
  type Object3D,
} from "three";
import {
  buildSurfacesForHallway,
  buildSurfacesForPlacedRoom,
} from "@/tools/room-coat/lib/build-surfaces";
import { parseDoorSurfaceId } from "@/tools/room-coat/lib/door-draft";
import { parseWindowSurfaceId } from "@/tools/room-coat/lib/window-surfaces";
import type { EditorTool } from "@/tools/room-coat/lib/editor-surfaces";
import { clientPointFromPointerEvent, pointerEventToLocalMm } from "@/tools/room-coat/lib/editor-pointer";
import {
  parseHallwaySurfaceId,
  parseRoomWallSurfaceId,
  roomWallHitFromPointer,
} from "@/tools/room-coat/lib/editor-surfaces";
import { hallwayWallHitFromPointer } from "@/tools/room-coat/lib/hallway-wall-hit";
import type { HallwayWallHit } from "@/tools/room-coat/lib/hallway-wall-hit";
import { hallwayWallHighlightKey } from "@/tools/room-coat/lib/wall-links";
import type { SurfaceMeshSpec } from "@/tools/room-coat/lib/room-geometry";
import {
  measureFromMeshSpec,
  type EditorHoverMeasurement,
} from "@/tools/room-coat/lib/surface-measurements";
import { resolveSurfacePaint } from "@/tools/room-coat/lib/resolve-paint";
import { resolveFloorFinishForSpace } from "@/tools/room-coat/lib/resolve-floor-finish";
import { FloorFinishMaterial } from "@/tools/room-coat/components/scene/FloorFinishMaterial";
import { PaintSurfaceMaterial } from "@/tools/room-coat/components/scene/PaintSurfaceMaterial";
import { baseboardsSharePaintScope } from "@/tools/room-coat/lib/baseboard-paint";
import { darkenHex } from "@/tools/room-coat/lib/wall-label-color";
import {
  hallwayFloorGridRects,
  type HallwayFloorGridRect,
} from "@/tools/room-coat/lib/hallway-geometry";
import { FLOOR_SURFACE_Y_M, WALL_THICKNESS_M } from "@/tools/room-coat/lib/room-geometry";
import {
  createFloorGridOverlayMap,
  updateFloorGridOverlayMap,
} from "@/tools/room-coat/lib/floor-grid-texture";
import { useRoomWallFlash } from "@/tools/room-coat/components/editor/useRoomWallFlash";
import type { Hallway, Paint, PlacedRoom, RoomCoat, UnitPreference } from "@/tools/room-coat/types/state";

const MM_TO_M = 0.001;

const INSPECT_SELECT_COLOR = "#fde047";
const INSPECT_SELECT_EMISSIVE = "#ca8a04";
const INSPECT_SELECT_EMISSIVE_INTENSITY = 0.38;
const INSPECT_HOVER_EMISSIVE_INTENSITY = 0.18;
const SELECTION_OVERLAY_OFFSET_M = 0.002;
const FLOOR_SELECTION_OVERLAY_OFFSET_M = 0.008;

function polygonGeometryFromSpec(
  polygonLocalM: Array<[number, number]>,
): ShapeGeometry | null {
  if (polygonLocalM.length < 3) return null;
  const shape = new Shape();
  shape.moveTo(polygonLocalM[0][0], polygonLocalM[0][1]);
  for (let i = 1; i < polygonLocalM.length; i++) {
    shape.lineTo(polygonLocalM[i][0], polygonLocalM[i][1]);
  }
  shape.closePath();
  return new ShapeGeometry(shape);
}

function wallPlaneGeometryFromSpec(spec: SurfaceMeshSpec): BufferGeometry {
  const [w, h] = spec.size;
  if (!spec.wallRectHolesM?.length) {
    return new PlaneGeometry(w, h);
  }
  const shape = new Shape();
  const halfW = w / 2;
  const halfH = h / 2;
  shape.moveTo(-halfW, -halfH);
  shape.lineTo(halfW, -halfH);
  shape.lineTo(halfW, halfH);
  shape.lineTo(-halfW, halfH);
  shape.lineTo(-halfW, -halfH);
  for (const hole of spec.wallRectHolesM) {
    const x0 = hole.x - hole.width / 2;
    const x1 = hole.x + hole.width / 2;
    const y0 = hole.y - hole.height / 2;
    const y1 = hole.y + hole.height / 2;
    const cut = new Path();
    cut.moveTo(x0, y0);
    cut.lineTo(x1, y0);
    cut.lineTo(x1, y1);
    cut.lineTo(x0, y1);
    cut.lineTo(x0, y0);
    shape.holes.push(cut);
  }
  return new ShapeGeometry(shape);
}

function SpecPlaneGeometry({ spec }: { spec: SurfaceMeshSpec }) {
  const geometry = useMemo(
    () => wallPlaneGeometryFromSpec(spec),
    [spec],
  );
  return <primitive object={geometry} attach="geometry" />;
}

function passThroughFloorPointer(tool: EditorTool): boolean {
  return tool === "furnish" || tool === "snap-point" || tool === "measure";
}

function inspectSelectionMaterial(isSelected: boolean) {
  if (!isSelected) return null;
  return {
    color: INSPECT_SELECT_COLOR,
    emissive: INSPECT_SELECT_EMISSIVE,
    emissiveIntensity: INSPECT_SELECT_EMISSIVE_INTENSITY,
  };
}

/** Front-facing overlay so selection is not visible through exterior wall perspectives. */
function SurfaceSelectionOverlay({
  size,
  geometry = null,
  offsetM = SELECTION_OVERLAY_OFFSET_M,
  renderOrder = 2,
}: {
  size: [number, number] | readonly [number, number];
  geometry?: BufferGeometry | null;
  offsetM?: number;
  renderOrder?: number;
}) {
  return (
    <mesh
      position={[0, 0, offsetM]}
      renderOrder={renderOrder}
      raycast={() => null}
    >
      {geometry ? (
        <primitive object={geometry} attach="geometry" />
      ) : (
        <planeGeometry args={size} />
      )}
      <meshStandardMaterial
        color={INSPECT_SELECT_COLOR}
        emissive={INSPECT_SELECT_EMISSIVE}
        emissiveIntensity={INSPECT_SELECT_EMISSIVE_INTENSITY}
        side={FrontSide}
        transparent
        opacity={0.96}
        depthWrite={false}
        depthTest
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
      <Edges threshold={15} color="#eab308" lineWidth={2} />
    </mesh>
  );
}

interface PaintableMeshesProps {
  specs: SurfaceMeshSpec[];
  space: PlacedRoom | Hallway;
  paints: Paint[];
  unitDefaultCoat?: RoomCoat;
  selectedSurfaceId: string | null;
  showCeilings: boolean;
  showFloorGrid?: boolean;
  editorTool?: EditorTool;
  hoveredWallKey?: string | null;
  highlightWallKeys?: Set<string>;
  raycastSuppressWallKey?: string | null;
  onSelectSurface: (id: string) => void;
  onRoomWallHit?: (hit: ReturnType<typeof roomWallHitFromPointer>) => void;
  onHallwayWallHit?: (hit: HallwayWallHit) => void;
  onRoomWallHover?: (
    hit: ReturnType<typeof roomWallHitFromPointer> | null,
  ) => void;
  onHallwayWallHover?: (hit: HallwayWallHit | null) => void;
  onRoomBodyClick?: () => void;
  onRoomBodyPointerDown?: (
    event: ThreeEvent<PointerEvent>,
    xMm: number,
    zMm: number,
  ) => void;
  /** Floor island group — pointer hits are converted to its local mm space. */
  floorLocalSpace?: Object3D | null;
  roomFloorHighlighted?: boolean;
  onRoomWallActionMenu?: (
    hit: ReturnType<typeof roomWallHitFromPointer>,
    clientX: number,
    clientY: number,
  ) => void;
  onSurfaceActionMenu?: (
    surfaceId: string,
    title: string,
    clientX: number,
    clientY: number,
  ) => void;
  onFloorActionMenu?: (clientX: number, clientY: number) => void;
  wallFlashKey?: number;
  unitPreference?: UnitPreference;
  onMeasureHover?: (
    measurement: EditorHoverMeasurement | null,
    surfaceId?: string,
  ) => void;
  onMeasureClick?: (xMm: number, zMm: number) => void;
  onMeasurePreview?: (xMm: number, zMm: number) => void;
}

const _gridWorldPos = new Vector3();

function FloorGridOverlay({
  widthM,
  depthM,
  centerXM,
  centerZM,
  yM,
  unitPreference,
  worldLocked = false,
}: {
  widthM: number;
  depthM: number;
  centerXM: number;
  centerZM: number;
  yM: number;
  unitPreference: UnitPreference;
  worldLocked?: boolean;
}) {
  const meshRef = useRef<Mesh>(null);
  const map = useMemo(
    () => createFloorGridOverlayMap(unitPreference),
    [unitPreference],
  );

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (worldLocked) {
      updateFloorGridOverlayMap(
        map,
        widthM,
        depthM,
        centerXM,
        centerZM,
        unitPreference,
      );
      return;
    }

    mesh.getWorldPosition(_gridWorldPos);
    updateFloorGridOverlayMap(
      map,
      widthM,
      depthM,
      _gridWorldPos.x,
      _gridWorldPos.z,
      unitPreference,
    );
  });

  return (
    <mesh
      ref={meshRef}
      position={[centerXM, yM + 0.001, centerZM]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={2}
      raycast={() => null}
    >
      <planeGeometry args={[widthM, depthM]} />
      <meshBasicMaterial
        map={map}
        transparent
        depthTest
        depthWrite={false}
        toneMapped={false}
        side={FrontSide}
      />
    </mesh>
  );
}

function HallwayFloorGridOverlay({
  rects,
  unitPreference,
}: {
  rects: readonly HallwayFloorGridRect[];
  unitPreference: UnitPreference;
}) {
  return (
    <>
      {rects.map((rect, index) => (
        <FloorGridOverlay
          key={`hallway-grid:${index}:${rect.centerXM}:${rect.centerZM}`}
          widthM={rect.widthM}
          depthM={rect.depthM}
          centerXM={rect.centerXM}
          centerZM={rect.centerZM}
          yM={FLOOR_SURFACE_Y_M}
          unitPreference={unitPreference}
          worldLocked
        />
      ))}
    </>
  );
}

export function PaintableMeshes({
  specs,
  space,
  paints,
  unitDefaultCoat,
  selectedSurfaceId,
  showCeilings,
  showFloorGrid = false,
  editorTool = "paint",
  hoveredWallKey = null,
  highlightWallKeys = new Set(),
  raycastSuppressWallKey = null,
  onSelectSurface,
  onRoomWallHit,
  onHallwayWallHit,
  onRoomWallHover,
  onHallwayWallHover,
  onRoomBodyClick,
  onRoomBodyPointerDown,
  roomFloorHighlighted = false,
  onRoomWallActionMenu,
  onSurfaceActionMenu,
  onFloorActionMenu,
  wallFlashKey,
  unitPreference = "imperial",
  onMeasureHover,
  onMeasureClick,
  onMeasurePreview,
  floorLocalSpace = null,
}: PaintableMeshesProps) {
  const { gl } = useThree();
  const isPlacedRoom = "placementId" in space;
  const room = isPlacedRoom ? space : null;
  const hallway = isPlacedRoom ? null : space;
  const wallFlashIntensity = useRoomWallFlash(wallFlashKey);
  const [hoveredPaintSurfaceId, setHoveredPaintSurfaceId] = useState<
    string | null
  >(null);

  const surfaces = useMemo(
    () =>
      isPlacedRoom
        ? buildSurfacesForPlacedRoom(space)
        : buildSurfacesForHallway(space),
    [space, isPlacedRoom],
  );

  const surfaceMap = useMemo(
    () => new Map(surfaces.map((surface) => [surface.id, surface])),
    [surfaces],
  );

  const hallwayGridRects = useMemo(
    () => (hallway && showFloorGrid ? hallwayFloorGridRects(hallway) : []),
    [hallway, showFloorGrid],
  );

  // Interior-facing walls + FrontSide: exterior back faces cull for dollhouse view.
  // Paint mode keeps DoubleSide so every face is pickable from the orbit camera.
  const wallSide =
    editorTool === "paint" || !showCeilings ? DoubleSide : FrontSide;
  const openingRelocateActive =
    (editorTool === "select" || editorTool === "move") &&
    Boolean(
      selectedSurfaceId &&
        (parseDoorSurfaceId(selectedSurfaceId) ||
          parseWindowSurfaceId(selectedSurfaceId)),
    );
  const moveGrabbable = editorTool === "move";
  const wallToolActive =
    editorTool === "hallway" ||
    editorTool === "open-walls" ||
    editorTool === "add-door" ||
    editorTool === "add-window" ||
    editorTool === "snap-point" ||
    openingRelocateActive;
  const measureToolActive = editorTool === "measure";

  function wallKey(placementId: string, wallIndex: number) {
    return `${placementId}:${wallIndex}`;
  }

  function pointerToFloorMm(
    event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>,
  ): { xMm: number; zMm: number } {
    if (floorLocalSpace) {
      return pointerEventToLocalMm(event, floorLocalSpace);
    }
    return {
      xMm: Math.round(event.point.x / MM_TO_M),
      zMm: Math.round(event.point.z / MM_TO_M),
    };
  }

  function reportMeasureHover(
    spec: SurfaceMeshSpec,
    event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>,
  ) {
    if (!onMeasureHover) return;
    const surface = surfaceMap.get(spec.surfaceId);
    const measurement = measureFromMeshSpec(
      spec,
      space,
      unitPreference,
      surface?.label,
      [event.point.x, event.point.y, event.point.z],
    );

    onMeasureHover(measurement);
  }

  function clearMeasureHover(surfaceId: string) {
    onMeasureHover?.(null, surfaceId);
  }

  function handleMeasureWallClick(
    spec: SurfaceMeshSpec,
    event: ThreeEvent<MouseEvent>,
  ): boolean {
    if (!measureToolActive || !onMeasureClick || !room) return false;
    const parsed = parseRoomWallSurfaceId(spec.surfaceId);
    if (!parsed || spec.category !== "wall") return false;

    let faceNormalX = 0;
    let faceNormalZ = 0;
    if (event.face?.normal) {
      const normal = event.face.normal.clone();
      normal.transformDirection(event.object.matrixWorld);
      faceNormalX = normal.x;
      faceNormalZ = normal.z;
    }

    const floorPoint = pointerToFloorMm(event);

    const hit = roomWallHitFromPointer(
      room,
      parsed.wallIndex,
      floorPoint.xMm,
      floorPoint.zMm,
      faceNormalX,
      faceNormalZ,
    );
    if (!hit) return false;

    event.stopPropagation();
    onMeasureClick(hit.xMm, hit.zMm);
    return true;
  }

  function handleWallPointer(
    spec: SurfaceMeshSpec,
    event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>,
    phase: "over" | "out" | "click",
  ) {
    if (!room || !wallToolActive) return;
    const parsed = parseRoomWallSurfaceId(spec.surfaceId);
    if (!parsed) return;

    let faceNormalX = 0;
    let faceNormalZ = 0;
    if (event.face?.normal) {
      const normal = event.face.normal.clone();
      normal.transformDirection(event.object.matrixWorld);
      faceNormalX = normal.x;
      faceNormalZ = normal.z;
    }

    const floorPoint = pointerToFloorMm(event);

    const hit = roomWallHitFromPointer(
      room,
      parsed.wallIndex,
      floorPoint.xMm,
      floorPoint.zMm,
      faceNormalX,
      faceNormalZ,
    );
    if (!hit) return;
    hit.segIndex = parsed.segIndex;

    if (phase === "click") {
      event.stopPropagation();
      onRoomWallHit?.(hit);
      return;
    }

    if (phase === "over") {
      event.stopPropagation();
      onRoomWallHover?.(hit);
      return;
    }

    onRoomWallHover?.(null);
  }

  function handleHallwayWallPointer(
    spec: SurfaceMeshSpec,
    event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>,
    phase: "over" | "out" | "click",
  ) {
    if (!hallway || !wallToolActive) return;
    const parsed = parseHallwaySurfaceId(spec.surfaceId);
    if (!parsed || parsed.category !== "wall") return;

    let faceNormalX = 0;
    let faceNormalZ = 0;
    if (event.face?.normal) {
      const normal = event.face.normal.clone();
      normal.transformDirection(event.object.matrixWorld);
      faceNormalX = normal.x;
      faceNormalZ = normal.z;
    }

    const floorPoint = pointerToFloorMm(event);

    const hit = hallwayWallHitFromPointer(
      hallway,
      parsed.segIndex,
      parsed.sideIndex as 0 | 1,
      floorPoint.xMm,
      floorPoint.zMm,
      faceNormalX,
      faceNormalZ,
    );
    if (!hit) return;

    if (phase === "click") {
      event.stopPropagation();
      onHallwayWallHit?.(hit);
      return;
    }

    if (phase === "over") {
      event.stopPropagation();
      onHallwayWallHover?.(hit);
      return;
    }

    onHallwayWallHover?.(null);
  }

  function handleWallActionMenu(
    spec: SurfaceMeshSpec,
    event: ThreeEvent<MouseEvent>,
  ) {
    if (!room || !onRoomWallActionMenu) return;
    const parsed = parseRoomWallSurfaceId(spec.surfaceId);
    if (!parsed) return;

    let faceNormalX = 0;
    let faceNormalZ = 0;
    if (event.face?.normal) {
      const normal = event.face.normal.clone();
      normal.transformDirection(event.object.matrixWorld);
      faceNormalX = normal.x;
      faceNormalZ = normal.z;
    }

    const floorPoint = pointerToFloorMm(event);

    const hit = roomWallHitFromPointer(
      room,
      parsed.wallIndex,
      floorPoint.xMm,
      floorPoint.zMm,
      faceNormalX,
      faceNormalZ,
    );
    if (!hit) return;
    hit.segIndex = parsed.segIndex;
    event.stopPropagation();
    const { clientX, clientY } = clientPointFromPointerEvent(
      event,
      gl.domElement,
    );
    onRoomWallActionMenu(hit, clientX, clientY);
  }

  function handleInspectSelect(spec: SurfaceMeshSpec, event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onSelectSurface(spec.surfaceId);
  }

  function reportMeasurePointer(
    spec: SurfaceMeshSpec,
    event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>,
  ) {
    if (measureToolActive && onMeasurePreview) {
      const floorPoint = pointerToFloorMm(event);
      onMeasurePreview(floorPoint.xMm, floorPoint.zMm);
    }
    if (!measureToolActive) {
      reportMeasureHover(spec, event);
    }
  }

  function handleMeasurePointerOver(
    spec: SurfaceMeshSpec,
    event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>,
  ) {
    event.stopPropagation();
    reportMeasurePointer(spec, event);
  }

  function handleMeasurePointerMove(
    spec: SurfaceMeshSpec,
    event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>,
  ) {
    if (!onMeasureHover && !onMeasurePreview) return;
    event.stopPropagation();
    reportMeasurePointer(spec, event);
  }

  function handleMeasurePointerOut(spec: SurfaceMeshSpec) {
    clearMeasureHover(spec.surfaceId);
  }

  return (
    <>
      {specs.map((spec) => {
        if (spec.category === "floor" || spec.category === "ceiling") {
          const isFloor = spec.category === "floor";
          const isCeiling = spec.category === "ceiling";
          const surface = surfaceMap.get(spec.surfaceId);
          const polygonGeometry = spec.polygonLocalM
            ? polygonGeometryFromSpec(spec.polygonLocalM)
            : null;
          const resolvedPaint =
            isCeiling && surface
              ? resolveSurfacePaint(space, surface, paints, unitDefaultCoat)
              : null;
          const resolvedFloor =
            isFloor && surface
              ? resolveFloorFinishForSpace(space, surface.id, unitDefaultCoat)
              : null;
          const isSelected = selectedSurfaceId === spec.surfaceId;
          const isPaintHovered = hoveredPaintSurfaceId === spec.surfaceId;
          const floorClickable =
            isFloor &&
            (editorTool === "move" || editorTool === "select") &&
            Boolean(onRoomBodyClick);
          const floorPointerPassthrough =
            isFloor && passThroughFloorPointer(editorTool);
          const useFloorSelectionOverlay = false;
          const useCeilingSelectionOverlay = isCeiling && isSelected;
          const useSelectionOverlay =
            useFloorSelectionOverlay || useCeilingSelectionOverlay;
          const floorSelected = isFloor && isSelected;
          const inspectMat =
            useSelectionOverlay || floorSelected
              ? null
              : isSelected
                ? inspectSelectionMaterial(true)
                : null;
          const floorHighlighted =
            isFloor &&
            roomFloorHighlighted &&
            (editorTool === "move" || editorTool === "select");
          const materialSide = isCeiling
            ? DoubleSide
            : polygonGeometry
              ? DoubleSide
              : FrontSide;
          const materialColor =
            inspectMat?.color ??
            (isFloor
              ? (resolvedFloor?.hex ?? spec.color ?? "#64748b")
              : isPaintHovered
                ? "#fef9c3"
                : (resolvedPaint?.hex ?? "#64748b"));
          const floorEmissive = floorSelected
            ? INSPECT_SELECT_EMISSIVE
            : floorHighlighted
              ? "#38a3db"
              : isPaintHovered
                ? INSPECT_SELECT_EMISSIVE
                : "#000000";
          const floorEmissiveIntensity = floorSelected
            ? INSPECT_SELECT_EMISSIVE_INTENSITY
            : floorHighlighted
              ? 0.12
              : isPaintHovered
                ? INSPECT_HOVER_EMISSIVE_INTENSITY
                : 0;
          return (
            <group key={spec.surfaceId}>
              <mesh
                position={spec.position}
                rotation={spec.rotation}
                renderOrder={useSelectionOverlay ? 0 : undefined}
                raycast={floorPointerPassthrough ? () => null : undefined}
                onClick={(event) => {
                  handleInspectSelect(spec, event);
                  if (floorClickable) {
                    onRoomBodyClick?.();
                  }
                }}
                onDoubleClick={(event) => {
                  if (!onFloorActionMenu || !isFloor) return;
                  event.stopPropagation();
                  const { clientX, clientY } = clientPointFromPointerEvent(
                    event,
                    gl.domElement,
                  );
                  onFloorActionMenu(clientX, clientY);
                }}
                onPointerOver={(event) => {
                  handleMeasurePointerOver(spec, event);
                  if (isFloor || isCeiling) {
                    setHoveredPaintSurfaceId(spec.surfaceId);
                    document.body.style.cursor =
                      isFloor && moveGrabbable ? "grab" : "pointer";
                  }
                }}
                onPointerOut={() => {
                  handleMeasurePointerOut(spec);
                  setHoveredPaintSurfaceId((current) =>
                    current === spec.surfaceId ? null : current,
                  );
                  if (isFloor || isCeiling) {
                    document.body.style.cursor = "";
                  }
                }}
                onPointerDown={(event) => {
                  if (
                    !isFloor ||
                    editorTool !== "move" ||
                    !roomFloorHighlighted ||
                    !onRoomBodyPointerDown
                  ) {
                    return;
                  }
                  event.stopPropagation();
                  document.body.style.cursor = "grabbing";
                  const floorPoint = pointerToFloorMm(event);
                  onRoomBodyPointerDown(event, floorPoint.xMm, floorPoint.zMm);
                }}
                onPointerMove={(event) => {
                  handleMeasurePointerMove(spec, event);
                }}
              >
                {polygonGeometry ? (
                  <primitive object={polygonGeometry} attach="geometry" />
                ) : (
                  <planeGeometry args={spec.size} />
                )}
                {isFloor && resolvedFloor ? (
                  <FloorFinishMaterial
                    finish={resolvedFloor}
                    side={materialSide}
                    emissive={floorEmissive}
                    emissiveIntensity={floorEmissiveIntensity}
                    widthM={spec.size[0]}
                    depthM={spec.size[1]}
                  />
                ) : (
                  <meshStandardMaterial
                    color={materialColor}
                    side={materialSide}
                    roughness={0.9}
                    metalness={0}
                    emissive={
                      inspectMat?.emissive ??
                      (floorHighlighted
                        ? "#38a3db"
                        : isPaintHovered
                          ? INSPECT_SELECT_EMISSIVE
                          : "#000000")
                    }
                    emissiveIntensity={
                      inspectMat?.emissiveIntensity ??
                      (floorHighlighted
                        ? 0.12
                        : isPaintHovered
                          ? INSPECT_HOVER_EMISSIVE_INTENSITY
                          : 0)
                    }
                  />
                )}
                {floorSelected ? (
                  <Edges threshold={15} color="#eab308" lineWidth={2} />
                ) : null}
                {useSelectionOverlay && (
                  <SurfaceSelectionOverlay
                    size={spec.size}
                    geometry={polygonGeometry}
                    offsetM={
                      isFloor
                        ? FLOOR_SELECTION_OVERLAY_OFFSET_M
                        : SELECTION_OVERLAY_OFFSET_M
                    }
                    renderOrder={12}
                  />
                )}
              </mesh>
              {showFloorGrid && isPlacedRoom && isFloor && (
                <FloorGridOverlay
                  widthM={spec.size[0]}
                  depthM={spec.size[1]}
                  centerXM={spec.position[0]}
                  centerZM={spec.position[2]}
                  yM={spec.position[1]}
                  unitPreference={unitPreference}
                />
              )}
            </group>
          );
        }

        const surface = surfaceMap.get(spec.surfaceId);
        if (!surface) return null;

        const parsedWall = parseRoomWallSurfaceId(spec.surfaceId);
        const parsedHallwayWall =
          !isPlacedRoom && spec.category === "wall"
            ? parseHallwaySurfaceId(spec.surfaceId)
            : null;
        const isRoomWallTarget = Boolean(
          wallToolActive && parsedWall && spec.category === "wall",
        );
        const isHallwayWallTarget = Boolean(
          wallToolActive &&
            parsedHallwayWall &&
            parsedHallwayWall.category === "wall",
        );
        const isWallTarget = isRoomWallTarget || isHallwayWallTarget;
        const isOpeningPick =
          spec.category === "door" || spec.category === "window";
        const isInspectable = Boolean(surface) && !isOpeningPick;
        const key = parsedWall
          ? wallKey(parsedWall.placementId, parsedWall.wallIndex)
          : parsedHallwayWall
            ? hallwayWallHighlightKey(
                parsedHallwayWall.hallwayId,
                parsedHallwayWall.segIndex,
                parsedHallwayWall.sideIndex as 0 | 1,
              )
            : null;
        const isSelectedWall = key ? highlightWallKeys.has(key) : false;
        const isHovered =
          isWallTarget && key && hoveredWallKey === key;
        const isPaintHovered =
          isInspectable && hoveredPaintSurfaceId === spec.surfaceId;
        const isFlashingWall =
          spec.category === "wall" && wallFlashIntensity > 0;
        const selected =
          selectedSurfaceId === spec.surfaceId ||
          (spec.category === "baseboard" &&
            baseboardsSharePaintScope(selectedSurfaceId, spec.surfaceId));
        const useSelectionOverlay = selected;
        const inspectMat = useSelectionOverlay
          ? null
          : inspectSelectionMaterial(selected);
        const suppressRaycast =
          Boolean(key && raycastSuppressWallKey && key === raycastSuppressWallKey);
        const resolved = surface
          ? resolveSurfacePaint(space, surface, paints, unitDefaultCoat)
          : { hex: "#64748b", paint: null, source: "unset" as const };
        const showHighlightEdge =
          selected ||
          isHovered ||
          isSelectedWall ||
          isPaintHovered ||
          isFlashingWall;
        const wallEdgeColor =
          spec.category === "wall"
            ? showHighlightEdge
              ? isFlashingWall
                ? "#7dd3fc"
                : selected
                  ? "#eab308"
                  : isHovered || isSelectedWall
                    ? "#fdba74"
                    : isPaintHovered
                      ? "#fde68a"
                      : darkenHex(resolved.hex)
              : darkenHex(resolved.hex)
            : null;
        const materialColor =
          inspectMat?.color ??
          (isHovered
            ? "#f97316"
            : isSelectedWall
              ? "#fb923c"
              : isWallTarget
                ? "#94a3b8"
                : isPaintHovered
                  ? "#fef9c3"
                  : resolved.hex);
        const materialEmissive =
          inspectMat?.emissive ??
          (isFlashingWall
            ? "#38bdf8"
            : isHovered
              ? "#ea580c"
              : isSelectedWall
                ? "#ea580c"
                : isWallTarget
                  ? "#334155"
                  : isPaintHovered
                    ? INSPECT_SELECT_EMISSIVE
                    : "#000000");
        const materialEmissiveIntensity =
          inspectMat?.emissiveIntensity ??
          (isFlashingWall
            ? wallFlashIntensity
            : isHovered
              ? 0.4
              : isSelectedWall
                ? 0.25
                : isWallTarget
                  ? 0.1
                  : isPaintHovered
                    ? INSPECT_HOVER_EMISSIVE_INTENSITY
                    : 0);
        const usePaintTexture =
          spec.category === "wall" &&
          !inspectMat &&
          !isPaintHovered &&
          !isHovered &&
          !isSelectedWall &&
          !isWallTarget &&
          !isFlashingWall &&
          Boolean(resolved.paint?.surfaceTexture) &&
          resolved.paint?.surfaceTexture !== "smooth";

        if (isOpeningPick) {
          const openingSelected = selectedSurfaceId === spec.surfaceId;
          const pickDepthM = WALL_THICKNESS_M + 0.04;
          return (
            <mesh
              key={spec.surfaceId}
              position={spec.position}
              rotation={spec.rotation}
              onClick={(event) => {
                if (handleMeasureWallClick(spec, event)) return;
                handleInspectSelect(spec, event);
              }}
              onDoubleClick={(event) => {
                if (!surface || !onSurfaceActionMenu) return;
                event.stopPropagation();
                const { clientX, clientY } = clientPointFromPointerEvent(
                  event,
                  gl.domElement,
                );
                onSurfaceActionMenu(
                  spec.surfaceId,
                  surface.label,
                  clientX,
                  clientY,
                );
              }}
              onPointerOver={(event) => {
                handleMeasurePointerOver(spec, event);
                setHoveredPaintSurfaceId(spec.surfaceId);
                document.body.style.cursor = moveGrabbable ? "grab" : "pointer";
              }}
              onPointerDown={(event) => {
                if (moveGrabbable) {
                  document.body.style.cursor = "grabbing";
                }
                event.stopPropagation();
              }}
              onPointerUp={() => {
                if (moveGrabbable) {
                  document.body.style.cursor = "grab";
                }
              }}
              onPointerMove={(event) => {
                handleMeasurePointerMove(spec, event);
              }}
              onPointerOut={() => {
                handleMeasurePointerOut(spec);
                setHoveredPaintSurfaceId((current) =>
                  current === spec.surfaceId ? null : current,
                );
                document.body.style.cursor = "";
              }}
            >
              <boxGeometry args={[spec.size[0], spec.size[1], pickDepthM]} />
              <meshBasicMaterial visible={false} />
              {openingSelected ? (
                <Edges threshold={15} color="#eab308" lineWidth={2} />
              ) : null}
            </mesh>
          );
        }

        return (
          <mesh
            key={spec.surfaceId}
            position={spec.position}
            rotation={spec.rotation}
            raycast={suppressRaycast ? () => null : undefined}
            onClick={(event) => {
              if (handleMeasureWallClick(spec, event)) {
                return;
              }
              if (isRoomWallTarget) {
                handleWallPointer(spec, event, "click");
                return;
              }
              if (isHallwayWallTarget) {
                handleHallwayWallPointer(spec, event, "click");
                return;
              }
              handleInspectSelect(spec, event);
            }}
            onDoubleClick={(event) => {
              const parsedWall = parseRoomWallSurfaceId(spec.surfaceId);
              if (
                parsedWall &&
                spec.category === "wall" &&
                room &&
                onRoomWallActionMenu
              ) {
                handleWallActionMenu(spec, event);
                return;
              }
              if (!surface || !onSurfaceActionMenu) return;
              event.stopPropagation();
              const { clientX, clientY } = clientPointFromPointerEvent(
                event,
                gl.domElement,
              );
              onSurfaceActionMenu(
                spec.surfaceId,
                surface.label,
                clientX,
                clientY,
              );
            }}
            onPointerOver={(event) => {
              handleMeasurePointerOver(spec, event);
              if (isRoomWallTarget) {
                handleWallPointer(spec, event, "over");
                document.body.style.cursor = "pointer";
                return;
              }
              if (isHallwayWallTarget) {
                handleHallwayWallPointer(spec, event, "over");
                document.body.style.cursor = "pointer";
                return;
              }
              if (isInspectable) {
                setHoveredPaintSurfaceId(spec.surfaceId);
                document.body.style.cursor = "pointer";
              }
            }}
            onPointerMove={(event) => {
              handleMeasurePointerMove(spec, event);
              if (isRoomWallTarget) {
                handleWallPointer(spec, event, "over");
              }
              if (isHallwayWallTarget) {
                handleHallwayWallPointer(spec, event, "over");
              }
            }}
            onPointerOut={() => {
              handleMeasurePointerOut(spec);
              if (isRoomWallTarget) {
                onRoomWallHover?.(null);
                document.body.style.cursor = "";
                return;
              }
              if (isHallwayWallTarget) {
                onHallwayWallHover?.(null);
                document.body.style.cursor = "";
                return;
              }
              if (isInspectable) {
                setHoveredPaintSurfaceId((current) =>
                  current === spec.surfaceId ? null : current,
                );
                document.body.style.cursor = "";
              }
            }}
          >
            <SpecPlaneGeometry spec={spec} />
            {usePaintTexture ? (
              <PaintSurfaceMaterial
                color={resolved.hex}
                paint={resolved.paint}
                side={wallSide}
                emissive={materialEmissive}
                emissiveIntensity={materialEmissiveIntensity}
              />
            ) : (
              <meshStandardMaterial
                color={materialColor}
                side={wallSide}
                emissive={materialEmissive}
                emissiveIntensity={materialEmissiveIntensity}
              />
            )}
            {(wallEdgeColor &&
              !useSelectionOverlay &&
              !spec.wallRectHolesM?.length) && (
              <Edges
                threshold={15}
                color={wallEdgeColor}
                lineWidth={showHighlightEdge ? 2 : 1}
              />
            )}
            {wallEdgeColor && showHighlightEdge && spec.wallRectHolesM?.length ? (
              <Edges threshold={15} color={wallEdgeColor} lineWidth={2} />
            ) : null}
            {useSelectionOverlay && (
              <SurfaceSelectionOverlay size={spec.size} />
            )}
          </mesh>
        );
      })}
      {showFloorGrid && hallway && (
        <HallwayFloorGridOverlay
          rects={hallwayGridRects}
          unitPreference={unitPreference}
        />
      )}
    </>
  );
}
