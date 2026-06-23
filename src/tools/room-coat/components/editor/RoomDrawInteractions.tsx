"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { FLOOR_SURFACE_Y_M } from "@/tools/room-coat/lib/room-geometry";
import { pointerEventToLocalMm } from "@/tools/room-coat/lib/editor-pointer";
import type { AxisBounds } from "@/tools/room-coat/lib/floor-utils";
import { canClosePolygon, roomRectFromDrag } from "@/tools/room-coat/lib/room-draw";
import {
  collectRoomDrawSnapTargets,
  interiorAngleDeg,
  segmentLengthMm,
  snapRoomDrawPoint,
  validateRoomShape,
  verticesEqual,
  type RoomAngleSnapMode,
} from "@/tools/room-coat/lib/room-shape";
import {
  RoomDrawPreview,
  RoomDrawMeasureLabel,
  SnapGuideVisual,
} from "@/tools/room-coat/components/scene/LayoutVisuals";
import { useFloorPointerDrag } from "@/tools/room-coat/components/editor/useFloorPointerDrag";
import { formatMm } from "@/tools/room-coat/lib/units";
import type {
  Hallway,
  PlacedRoom,
  RoomVertex,
  SnapPoint,
  UnitPreference,
} from "@/tools/room-coat/types/state";
import type { SnapGuideSegment } from "@/tools/room-coat/lib/snap-guides";

const MM_TO_M = 0.001;

export type RoomDrawMode = "polygon" | "rectangle" | "wall-chain";

interface RoomDrawInteractionsProps {
  gridBounds: AxisBounds;
  rooms: PlacedRoom[];
  hallways: Hallway[];
  snapPoints: SnapPoint[];
  unitPreference: UnitPreference;
  drawMode: RoomDrawMode;
  angleSnapMode: RoomAngleSnapMode;
  typedSegmentLengthMm: number | null;
  typedInteriorAngleDeg: number | null;
  onCreateRoom: (input: {
    verticesMm: RoomVertex[];
    closed: boolean;
    widthMm: number;
    lengthMm: number;
    originXMm: number;
    originZMm: number;
  }) => Promise<string[]>;
  onDrawWarning?: (message: string | null) => void;
  disableOrbit: () => void;
  enableOrbit: () => void;
}

export function RoomDrawInteractions({
  gridBounds,
  rooms,
  hallways,
  snapPoints,
  unitPreference,
  drawMode,
  angleSnapMode,
  typedSegmentLengthMm,
  typedInteriorAngleDeg,
  onCreateRoom,
  onDrawWarning,
  disableOrbit,
  enableOrbit,
}: RoomDrawInteractionsProps) {
  const localRootRef = useRef<Group>(null);
  const startFloorPointerDrag = useFloorPointerDrag(
    disableOrbit,
    enableOrbit,
    localRootRef,
  );
  const dragStart = useRef({ xMm: 0, zMm: 0 });
  const previewRectRef = useRef<{
    originXMm: number;
    originZMm: number;
    widthMm: number;
    lengthMm: number;
  } | null>(null);
  const [vertices, setVertices] = useState<RoomVertex[]>([]);
  const [cursor, setCursor] = useState<RoomVertex | null>(null);
  const [cursorSnapped, setCursorSnapped] = useState(false);
  const [snapGuides, setSnapGuides] = useState<SnapGuideSegment[]>([]);
  const [rectPreview, setRectPreview] = useState<{
    originXMm: number;
    originZMm: number;
    widthMm: number;
    lengthMm: number;
  } | null>(null);

  useEffect(() => {
    setVertices([]);
    setCursor(null);
    setRectPreview(null);
  }, [drawMode]);

  const snapTargets = useMemo(
    () =>
      collectRoomDrawSnapTargets({
        rooms,
        hallways,
        snapPoints,
        draftVertices: vertices,
      }),
    [rooms, hallways, snapPoints, vertices],
  );

  const planeSizeM = useMemo(() => {
    const cx = ((gridBounds.minX + gridBounds.maxX) / 2) * MM_TO_M;
    const cz = ((gridBounds.minZ + gridBounds.maxZ) / 2) * MM_TO_M;
    return {
      width: (gridBounds.maxX - gridBounds.minX) * MM_TO_M,
      depth: (gridBounds.maxZ - gridBounds.minZ) * MM_TO_M,
      cx,
      cz,
    };
  }, [gridBounds]);

  function pointerToLocalMm(event: ThreeEvent<PointerEvent>) {
    const localSpace = localRootRef.current;
    if (!localSpace) {
      return {
        xMm: Math.round(event.point.x / MM_TO_M),
        zMm: Math.round(event.point.z / MM_TO_M),
      };
    }
    return pointerEventToLocalMm(event, localSpace);
  }

  function snapPointer(xMm: number, zMm: number): RoomVertex {
    const last = vertices[vertices.length - 1] ?? null;
    const prev = vertices[vertices.length - 2] ?? null;
    const snapped = snapRoomDrawPoint({
      cursorXMm: xMm,
      cursorZMm: zMm,
      lastVertex: last,
      prevVertex: prev,
      angleSnapMode,
      snapTargets,
      draftVertices: vertices,
      typedLengthMm: typedSegmentLengthMm,
      typedInteriorAngleDeg: typedInteriorAngleDeg,
    });
    setCursorSnapped(snapped.snappedVertex);
    setSnapGuides(snapped.guides);
    return { xMm: snapped.xMm, zMm: snapped.zMm };
  }

  const closingToStart =
    drawMode === "polygon" &&
    vertices.length >= 3 &&
    cursor !== null &&
    verticesEqual(cursor, vertices[0]);

  async function commitPolygon(closed: boolean, finalVertices: RoomVertex[]) {
    const validation = validateRoomShape(finalVertices, closed);
    if (!validation.ok) {
      onDrawWarning?.(validation.reason ?? "Could not create room.");
      return;
    }

    onDrawWarning?.(null);
    let minX = finalVertices[0].xMm;
    let maxX = finalVertices[0].xMm;
    let minZ = finalVertices[0].zMm;
    let maxZ = finalVertices[0].zMm;
    for (const vertex of finalVertices) {
      minX = Math.min(minX, vertex.xMm);
      maxX = Math.max(maxX, vertex.xMm);
      minZ = Math.min(minZ, vertex.zMm);
      maxZ = Math.max(maxZ, vertex.zMm);
    }

    await onCreateRoom({
      verticesMm: finalVertices,
      closed,
      originXMm: (minX + maxX) / 2,
      originZMm: (minZ + maxZ) / 2,
      widthMm: maxX - minX,
      lengthMm: maxZ - minZ,
    });
    setVertices([]);
    setCursor(null);
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (drawMode === "rectangle") return;
    const { xMm, zMm } = pointerToLocalMm(event);
    setCursor(snapPointer(xMm, zMm));
  }

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (event.button !== 0) return;

    event.stopPropagation();

    if (drawMode === "rectangle") {
      const { xMm, zMm } = pointerToLocalMm(event);
      dragStart.current = { xMm, zMm };
      setRectPreview(null);

      startFloorPointerDrag(event, {
        onMove: (moveXMm, moveZMm) => {
          const rect = roomRectFromDrag(
            dragStart.current.xMm,
            dragStart.current.zMm,
            moveXMm,
            moveZMm,
            unitPreference,
          );
          previewRectRef.current = rect;
          setRectPreview(rect);
        },
        onEnd: async () => {
          const rect = previewRectRef.current;
          previewRectRef.current = null;
          setRectPreview(null);
          if (!rect) return;
          const hw = rect.widthMm / 2;
          const hl = rect.lengthMm / 2;
          await onCreateRoom({
            verticesMm: [
              { xMm: rect.originXMm - hw, zMm: rect.originZMm + hl },
              { xMm: rect.originXMm + hw, zMm: rect.originZMm + hl },
              { xMm: rect.originXMm + hw, zMm: rect.originZMm - hl },
              { xMm: rect.originXMm - hw, zMm: rect.originZMm - hl },
            ],
            closed: true,
            ...rect,
          });
        },
      });
      return;
    }

    const { xMm, zMm } = pointerToLocalMm(event);
    const point = snapPointer(xMm, zMm);

    if (drawMode === "polygon" && canClosePolygon(vertices, point)) {
      void commitPolygon(true, vertices);
      return;
    }

    setVertices((current) => [...current, point]);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" && event.key !== "Escape") return;
      if (drawMode === "rectangle") return;
      if (vertices.length < 2) {
        if (event.key === "Escape") {
          setVertices([]);
          setCursor(null);
        }
        return;
      }

      if (event.key === "Escape") {
        setVertices([]);
        setCursor(null);
        return;
      }

      const closed = drawMode === "polygon" && vertices.length >= 3;
      void commitPolygon(closed, vertices);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawMode, vertices]);

  const drawSegments = useMemo(() => {
    const segments: Array<{
      a: RoomVertex;
      b: RoomVertex;
      dashed: boolean;
      lengthMm: number;
    }> = [];

    for (let i = 1; i < vertices.length; i++) {
      const a = vertices[i - 1];
      const b = vertices[i];
      segments.push({
        a,
        b,
        dashed: false,
        lengthMm: segmentLengthMm(a, b),
      });
    }

    if (cursor && vertices.length > 0) {
      const a = vertices[vertices.length - 1];
      segments.push({
        a,
        b: cursor,
        dashed: true,
        lengthMm: segmentLengthMm(a, cursor),
      });
    }

    return segments;
  }, [cursor, vertices]);

  const pivotAngle =
    vertices.length >= 2 && cursor
      ? interiorAngleDeg(vertices[vertices.length - 2], vertices[vertices.length - 1], cursor)
      : null;

  return (
    <group ref={localRootRef}>
      <mesh
        position={[planeSizeM.cx, FLOOR_SURFACE_Y_M + 0.004, planeSizeM.cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        visible={false}
      >
        <planeGeometry args={[planeSizeM.width, planeSizeM.depth]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {rectPreview && (
        <RoomDrawPreview
          originXMm={rectPreview.originXMm}
          originZMm={rectPreview.originZMm}
          widthMm={rectPreview.widthMm}
          lengthMm={rectPreview.lengthMm}
          unitPreference={unitPreference}
        />
      )}

      {vertices.map((vertex, index) => (
        <mesh
          key={`${vertex.xMm}-${vertex.zMm}-${index}`}
          position={[vertex.xMm * MM_TO_M, FLOOR_SURFACE_Y_M + 0.04, vertex.zMm * MM_TO_M]}
        >
          <sphereGeometry args={[index === 0 ? 0.08 : 0.06, 12, 12]} />
          <meshStandardMaterial
            color={
              closingToStart && index === 0
                ? "#fde047"
                : index === 0
                  ? "#fbbf24"
                  : "#4ade80"
            }
            emissive={closingToStart && index === 0 ? "#ca8a04" : "#000000"}
            emissiveIntensity={closingToStart && index === 0 ? 0.45 : 0}
          />
        </mesh>
      ))}

      {cursor && (
        <mesh
          position={[cursor.xMm * MM_TO_M, FLOOR_SURFACE_Y_M + 0.05, cursor.zMm * MM_TO_M]}
        >
          <sphereGeometry args={[cursorSnapped ? 0.07 : 0.045, 12, 12]} />
          <meshStandardMaterial
            color={cursorSnapped ? "#38bdf8" : "#86efac"}
            emissive={cursorSnapped ? "#0284c7" : "#000000"}
            emissiveIntensity={cursorSnapped ? 0.35 : 0}
          />
        </mesh>
      )}

      {snapGuides.length > 0 && <SnapGuideVisual guides={snapGuides} />}

      {drawSegments.map((segment, index) => (
        <group key={`seg-${index}`}>
          <Line
            points={[
              [segment.a.xMm * MM_TO_M, FLOOR_SURFACE_Y_M + 0.05, segment.a.zMm * MM_TO_M],
              [segment.b.xMm * MM_TO_M, FLOOR_SURFACE_Y_M + 0.05, segment.b.zMm * MM_TO_M],
            ]}
            color={segment.dashed ? "#86efac" : "#4ade80"}
            lineWidth={2}
            dashed={segment.dashed}
            dashSize={segment.dashed ? 0.12 : undefined}
            gapSize={segment.dashed ? 0.08 : undefined}
          />
          <RoomDrawMeasureLabel
            x1Mm={segment.a.xMm}
            z1Mm={segment.a.zMm}
            x2Mm={segment.b.xMm}
            z2Mm={segment.b.zMm}
            text={formatMm(segment.lengthMm, unitPreference)}
          />
        </group>
      ))}

      {pivotAngle !== null && vertices.length >= 1 && cursor && (
        <Html
          position={[
            vertices[vertices.length - 1].xMm * MM_TO_M,
            FLOOR_SURFACE_Y_M + 0.35,
            vertices[vertices.length - 1].zMm * MM_TO_M,
          ]}
          center
          style={{ pointerEvents: "none" }}
        >
          <span className="whitespace-nowrap rounded-md bg-sky-900/90 px-2 py-1 text-[11px] font-medium tabular-nums text-sky-100">
            {pivotAngle}°
          </span>
        </Html>
      )}
    </group>
  );
}
