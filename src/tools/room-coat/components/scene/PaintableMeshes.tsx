"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { Edges } from "@react-three/drei";
import { FrontSide, DoubleSide } from "three";
import {
  buildSurfacesForHallway,
  buildSurfacesForPlacedRoom,
} from "@/tools/room-coat/lib/build-surfaces";
import type { EditorTool } from "@/tools/room-coat/lib/editor-surfaces";
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
import { useRoomWallFlash } from "@/tools/room-coat/components/editor/useRoomWallFlash";
import type { Hallway, Paint, PlacedRoom, RoomCoat, UnitPreference } from "@/tools/room-coat/types/state";

interface PaintableMeshesProps {
  specs: SurfaceMeshSpec[];
  space: PlacedRoom | Hallway;
  paints: Paint[];
  unitDefaultCoat?: RoomCoat;
  selectedSurfaceId: string | null;
  showCeilings: boolean;
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
  onRoomBodyPointerDown?: (worldXM: number, worldZM: number) => void;
  onRoomBodyMove?: (worldXM: number, worldZM: number) => void;
  onRoomBodyMoveEnd?: (worldXM: number, worldZM: number) => void;
  roomMoveSelected?: boolean;
  wallFlashKey?: number;
  unitPreference?: UnitPreference;
  onMeasureHover?: (
    measurement: EditorHoverMeasurement | null,
    surfaceId?: string,
  ) => void;
}

export function PaintableMeshes({
  specs,
  space,
  paints,
  unitDefaultCoat,
  selectedSurfaceId,
  showCeilings,
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
  onRoomBodyMove,
  onRoomBodyMoveEnd,
  roomMoveSelected = false,
  wallFlashKey,
  unitPreference = "imperial",
  onMeasureHover,
}: PaintableMeshesProps) {
  const isPlacedRoom = "placementId" in space;
  const room = isPlacedRoom ? space : null;
  const hallway = isPlacedRoom ? null : space;
  const dragging = useRef(false);
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

  const wallSide = showCeilings ? FrontSide : DoubleSide;
  const wallToolActive =
    editorTool === "hallway" || editorTool === "open-walls";

  function wallKey(placementId: string, wall: string) {
    return `${placementId}:${wall}`;
  }

  function reportMeasureHover(spec: SurfaceMeshSpec) {
    if (!onMeasureHover) return;
    const surface = surfaceMap.get(spec.surfaceId);
    onMeasureHover(
      measureFromMeshSpec(spec, space, unitPreference, surface?.label),
    );
  }

  function clearMeasureHover(surfaceId: string) {
    onMeasureHover?.(null, surfaceId);
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

    const hit = roomWallHitFromPointer(
      room,
      parsed.wall,
      event.point.x,
      event.point.z,
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

    const hit = hallwayWallHitFromPointer(
      hallway,
      parsed.segIndex,
      parsed.sideIndex as 0 | 1,
      event.point.x,
      event.point.z,
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

  function handlePaintClick(spec: SurfaceMeshSpec, event: ThreeEvent<MouseEvent>) {
    if (editorTool !== "paint") return;
    event.stopPropagation();
    onSelectSurface(spec.surfaceId);
  }

  function handleMeasurePointerOver(
    spec: SurfaceMeshSpec,
    event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>,
  ) {
    event.stopPropagation();
    reportMeasureHover(spec);
  }

  function handleMeasurePointerOut(spec: SurfaceMeshSpec) {
    clearMeasureHover(spec.surfaceId);
  }

  return (
    <>
      {specs.map((spec) => {
        if (spec.category === "floor") {
          const floorClickable =
            editorTool === "move" && Boolean(onRoomBodyClick);
          return (
            <mesh
              key={spec.surfaceId}
              position={spec.position}
              rotation={spec.rotation}
              onClick={(event) => {
                if (floorClickable) {
                  event.stopPropagation();
                  onRoomBodyClick?.();
                }
              }}
              onPointerOver={(event) => {
                handleMeasurePointerOver(spec, event);
                if (floorClickable) document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                handleMeasurePointerOut(spec);
                if (floorClickable) document.body.style.cursor = "";
              }}
              onPointerDown={(event) => {
                if (
                  editorTool !== "move" ||
                  !roomMoveSelected ||
                  !onRoomBodyMove
                ) {
                  return;
                }
                event.stopPropagation();
                dragging.current = true;
                onRoomBodyPointerDown?.(event.point.x, event.point.z);
              }}
              onPointerMove={(event) => {
                if (!dragging.current || !onRoomBodyMove) return;
                event.stopPropagation();
                onRoomBodyMove(event.point.x, event.point.z);
              }}
              onPointerUp={(event) => {
                if (!dragging.current || !onRoomBodyMoveEnd) return;
                dragging.current = false;
                event.stopPropagation();
                onRoomBodyMoveEnd(event.point.x, event.point.z);
              }}
            >
              <planeGeometry args={spec.size} />
              <meshStandardMaterial
                color={
                  roomMoveSelected && editorTool === "move"
                    ? "#475569"
                    : (spec.color ?? "#64748b")
                }
                side={wallSide}
                emissive={
                  roomMoveSelected && editorTool === "move" ? "#38a3db" : "#000000"
                }
                emissiveIntensity={
                  roomMoveSelected && editorTool === "move" ? 0.12 : 0
                }
              />
            </mesh>
          );
        }

        const surface = surfaceMap.get(spec.surfaceId);
        if (!surface && spec.category !== "ceiling") return null;

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
        const isPaintTarget = editorTool === "paint" && Boolean(surface);
        const key = parsedWall
          ? wallKey(parsedWall.placementId, parsedWall.wall)
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
        const isPaintHovered = isPaintTarget && hoveredPaintSurfaceId === spec.surfaceId;
        const isFlashingWall =
          spec.category === "wall" && wallFlashIntensity > 0;
        const suppressRaycast =
          Boolean(key && raycastSuppressWallKey && key === raycastSuppressWallKey);
        const resolved = surface
          ? resolveSurfacePaint(space, surface, paints, unitDefaultCoat)
          : { hex: "#64748b" };
        const selected = selectedSurfaceId === spec.surfaceId;

        return (
          <mesh
            key={spec.surfaceId}
            position={spec.position}
            rotation={spec.rotation}
            raycast={suppressRaycast ? () => null : undefined}
            onClick={(event) => {
              if (isRoomWallTarget) {
                handleWallPointer(spec, event, "click");
                return;
              }
              if (isHallwayWallTarget) {
                handleHallwayWallPointer(spec, event, "click");
                return;
              }
              handlePaintClick(spec, event);
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
              if (isPaintTarget) {
                setHoveredPaintSurfaceId(spec.surfaceId);
                document.body.style.cursor = "pointer";
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
              if (isPaintTarget) {
                setHoveredPaintSurfaceId((current) =>
                  current === spec.surfaceId ? null : current,
                );
                document.body.style.cursor = "";
              }
            }}
          >
            <planeGeometry args={spec.size} />
            <meshStandardMaterial
              color={
                isHovered
                  ? "#f97316"
                  : isSelectedWall
                    ? "#fb923c"
                    : isWallTarget
                      ? "#94a3b8"
                      : isPaintHovered
                        ? "#cbd5e1"
                        : resolved.hex
              }
              side={wallSide}
              emissive={
                isFlashingWall
                  ? "#38bdf8"
                  : selected
                    ? "#38a3db"
                    : isHovered
                      ? "#ea580c"
                      : isSelectedWall
                        ? "#ea580c"
                        : isWallTarget
                          ? "#334155"
                          : isPaintHovered
                            ? "#38a3db"
                            : "#000000"
              }
              emissiveIntensity={
                isFlashingWall
                  ? wallFlashIntensity
                  : selected
                    ? 0.25
                    : isHovered
                      ? 0.4
                      : isSelectedWall
                        ? 0.25
                        : isWallTarget
                          ? 0.1
                          : isPaintHovered
                            ? 0.18
                            : 0
              }
            />
            {(selected || isHovered || isSelectedWall || isPaintHovered || isFlashingWall) && (
              <Edges
                threshold={15}
                color={
                  isFlashingWall
                    ? "#7dd3fc"
                    : isHovered || isSelectedWall
                      ? "#fdba74"
                      : isPaintHovered
                        ? "#7ec8f0"
                        : "#7ec8f0"
                }
                lineWidth={2}
              />
            )}
          </mesh>
        );
      })}
    </>
  );
}
