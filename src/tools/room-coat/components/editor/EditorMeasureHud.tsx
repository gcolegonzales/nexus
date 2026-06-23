"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useMemo, useRef, useState, type RefObject } from "react";
import { Vector3, type Object3D } from "three";
import {
  EDITOR_MEASURE_HUD_SNAP,
  EDITOR_MEASURE_HUD_TAG,
  EDITOR_Z_MEASURE_OVERLAY,
} from "@/tools/room-coat/components/editor/editor-chrome";
import {
  clientToFloorMm,
  measureViewportBridge,
} from "@/tools/room-coat/lib/measure-viewport-bridge";
import { FLOOR_SURFACE_Y_M } from "@/tools/room-coat/lib/room-geometry";
import { formatMm } from "@/tools/room-coat/lib/units";
import type { UnitPreference } from "@/tools/room-coat/types/state";

const MM_TO_M = 0.001;

export interface MeasureHudMarker {
  id: string;
  screenX: number;
  screenY: number;
  visible: boolean;
  tone: "start" | "end" | "preview" | "distance";
  distanceText?: string;
  snapLabel?: string;
}

interface MeasurePoint {
  xMm: number;
  zMm: number;
  label?: string;
}

export function buildMeasureHudMarkers(input: {
  start: MeasurePoint | null;
  end: MeasurePoint | null;
  preview: MeasurePoint | null;
  unitPreference: UnitPreference;
  projections: Map<string, { screenX: number; screenY: number; visible: boolean }>;
}): MeasureHudMarker[] {
  const { start, end, preview, unitPreference, projections } = input;
  if (!start) return [];

  const activeEnd = end ?? preview;
  const distanceMm = activeEnd
    ? Math.round(
        Math.hypot(activeEnd.xMm - start.xMm, activeEnd.zMm - start.zMm),
      )
    : 0;
  const mid = activeEnd
    ? {
        xMm: Math.round((start.xMm + activeEnd.xMm) / 2),
        zMm: Math.round((start.zMm + activeEnd.zMm) / 2),
      }
    : null;

  const markers: MeasureHudMarker[] = [];

  function pushPoint(
    id: string,
    point: MeasurePoint,
    tone: MeasureHudMarker["tone"],
  ) {
    const projection = projections.get(id);
    if (!projection?.visible) return;
    markers.push({
      id,
      screenX: projection.screenX,
      screenY: projection.screenY,
      visible: true,
      tone,
      snapLabel: point.label,
    });
  }

  pushPoint("start", start, end ? "start" : "start");

  if (end) {
    pushPoint("end", end, "end");
  } else if (preview) {
    pushPoint("preview", preview, "preview");
  }

  if (mid && activeEnd && distanceMm > 0) {
    const projection = projections.get("distance");
    if (projection?.visible) {
      markers.push({
        id: "distance",
        screenX: projection.screenX,
        screenY: projection.screenY,
        visible: true,
        tone: "distance",
        distanceText: formatMm(distanceMm, unitPreference),
      });
    }
  }

  return markers;
}

export function EditorMeasureHudOverlay({
  markers,
  onMoveMeasurePoint,
  onMeasurePointDragEnd,
}: {
  markers: MeasureHudMarker[];
  onMoveMeasurePoint: (role: "start" | "end", xMm: number, zMm: number) => void;
  onMeasurePointDragEnd: () => void;
}) {
  const [draggingHandle, setDraggingHandle] = useState<
    "start" | "end" | "preview" | null
  >(null);

  const beginHandleDrag = useCallback(
    (role: "start" | "end", event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setDraggingHandle(role);
      measureViewportBridge.setOrbitEnabled?.(false);

      const target = event.currentTarget;
      target.setPointerCapture(event.pointerId);

      const onPointerMove = (nativeEvent: PointerEvent) => {
        nativeEvent.preventDefault();
        nativeEvent.stopPropagation();
        const floor = clientToFloorMm(nativeEvent.clientX, nativeEvent.clientY);
        if (floor) onMoveMeasurePoint(role, floor.xMm, floor.zMm);
      };

      const endDrag = (nativeEvent: PointerEvent) => {
        nativeEvent.preventDefault();
        nativeEvent.stopPropagation();
        if (target.hasPointerCapture(nativeEvent.pointerId)) {
          target.releasePointerCapture(nativeEvent.pointerId);
        }
        target.removeEventListener("pointermove", onPointerMove);
        target.removeEventListener("pointerup", endDrag);
        target.removeEventListener("pointercancel", endDrag);
        measureViewportBridge.setOrbitEnabled?.(true);
        setDraggingHandle(null);
        onMeasurePointDragEnd();
      };

      target.addEventListener("pointermove", onPointerMove);
      target.addEventListener("pointerup", endDrag);
      target.addEventListener("pointercancel", endDrag);
    },
    [onMeasurePointDragEnd, onMoveMeasurePoint],
  );

  if (markers.length === 0) return null;

  const startLabel = markers.find((marker) => marker.id === "start")?.snapLabel;
  const endLabel = markers.find((marker) => marker.id === "end")?.snapLabel;
  const duplicateSnapLabels = Boolean(
    startLabel && endLabel && startLabel === endLabel,
  );

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: EDITOR_Z_MEASURE_OVERLAY }}
    >
      {markers.map((marker) => {
        const isDraggableHandle =
          marker.tone === "start" || marker.tone === "end";
        const isPointMarker = marker.tone !== "distance";
        const showSnapLabel =
          marker.snapLabel &&
          (!duplicateSnapLabels ||
            draggingHandle === marker.tone ||
            draggingHandle === marker.id);

        return (
          <div
            key={marker.id}
            className={`absolute flex flex-col items-center ${
              isDraggableHandle ? "pointer-events-auto" : "pointer-events-none"
            }`}
            style={{
              left: marker.screenX,
              top: marker.screenY,
              transform: "translate(-50%, -50%)",
            }}
          >
            {isPointMarker &&
              (isDraggableHandle ? (
                <div
                  role="button"
                  aria-label={
                    marker.tone === "start"
                      ? "Move measure start point"
                      : "Move measure end point"
                  }
                  className={`flex cursor-grab items-center justify-center rounded-full p-2 active:cursor-grabbing ${
                    draggingHandle === marker.tone ? "cursor-grabbing" : ""
                  }`}
                  onPointerDown={(event) =>
                    beginHandleDrag(marker.tone as "start" | "end", event)
                  }
                >
                  <div className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white bg-sky-400 shadow-md shadow-black/40" />
                </div>
              ) : (
                <div className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-white bg-sky-300/90 shadow-md shadow-black/40" />
              ))}
            {marker.distanceText && (
              <div className={EDITOR_MEASURE_HUD_TAG}>{marker.distanceText}</div>
            )}
            {showSnapLabel && (
              <div
                className={`${EDITOR_MEASURE_HUD_SNAP} ${
                  marker.tone === "start" ? "mt-1" : "mb-1"
                }`}
              >
                {marker.snapLabel}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MeasureScreenProjector({
  start,
  end,
  preview,
  unitPreference,
  onMarkersChange,
  floorLocalSpaceRef = null,
}: {
  start: MeasurePoint | null;
  end: MeasurePoint | null;
  preview: MeasurePoint | null;
  unitPreference: UnitPreference;
  onMarkersChange: (markers: MeasureHudMarker[]) => void;
  floorLocalSpaceRef?: RefObject<Object3D | null> | null;
}) {
  const { camera, gl } = useThree();
  const world = useMemo(() => new Vector3(), []);
  const lastKey = useRef("");

  useFrame(() => {
    const floorLocalSpace = floorLocalSpaceRef?.current ?? null;
    measureViewportBridge.camera = camera;
    measureViewportBridge.canvas = gl.domElement;
    measureViewportBridge.floorLocalSpace = floorLocalSpace;

    if (!start) {
      if (lastKey.current !== "") {
        lastKey.current = "";
        onMarkersChange([]);
      }
      return;
    }

    const activeEnd = end ?? preview;
    const mid = activeEnd
      ? {
          xMm: (start.xMm + activeEnd.xMm) / 2,
          zMm: (start.zMm + activeEnd.zMm) / 2,
        }
      : null;

    const worldPoints: Array<{ id: string; xMm: number; zMm: number }> = [
      { id: "start", xMm: start.xMm, zMm: start.zMm },
    ];
    if (end) {
      worldPoints.push({ id: "end", xMm: end.xMm, zMm: end.zMm });
    } else if (preview) {
      worldPoints.push({ id: "preview", xMm: preview.xMm, zMm: preview.zMm });
    }
    if (mid) {
      worldPoints.push({ id: "distance", xMm: mid.xMm, zMm: mid.zMm });
    }

    const rect = gl.domElement.getBoundingClientRect();
    const projections = new Map<
      string,
      { screenX: number; screenY: number; visible: boolean }
    >();

    for (const point of worldPoints) {
      world.set(
        point.xMm * MM_TO_M,
        FLOOR_SURFACE_Y_M + 0.04,
        point.zMm * MM_TO_M,
      );
      if (floorLocalSpace) {
        floorLocalSpace.localToWorld(world);
      }
      world.project(camera);
      const visible =
        world.z >= -1 &&
        world.z <= 1 &&
        Number.isFinite(world.x) &&
        Number.isFinite(world.y);
      projections.set(point.id, {
        screenX: (world.x * 0.5 + 0.5) * rect.width,
        screenY: (-world.y * 0.5 + 0.5) * rect.height,
        visible,
      });
    }

    const markers = buildMeasureHudMarkers({
      start,
      end,
      preview,
      unitPreference,
      projections,
    });

    const key = markers
      .map(
        (marker) =>
          `${marker.id}:${Math.round(marker.screenX)}:${Math.round(marker.screenY)}:${marker.distanceText ?? ""}:${marker.snapLabel ?? ""}`,
      )
      .join("|");

    if (key !== lastKey.current) {
      lastKey.current = key;
      onMarkersChange(markers);
    }
  });

  return null;
}
