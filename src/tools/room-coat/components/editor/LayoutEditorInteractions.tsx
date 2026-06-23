"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { useThree } from "@react-three/fiber";
import { FLOOR_SURFACE_Y_M } from "@/tools/room-coat/lib/room-geometry";
import {
  clientPointFromPointerEvent,
  pointerEventToLocalMm,
} from "@/tools/room-coat/lib/editor-pointer";
import type { AxisBounds } from "@/tools/room-coat/lib/floor-utils";
import { furnishingPresetById, FURNISHING_PRESETS } from "@/tools/room-coat/lib/furnishing-presets";
import {
  nearestClearances,
  resolveSnap,
  walkwayWarning,
} from "@/tools/room-coat/lib/layout-snap";
import { measureSnapPreviewLabel, snapPinPreviewHint } from "@/tools/room-coat/lib/snap-pin-labels";
import { formatMm } from "@/tools/room-coat/lib/units";
import { findSnapPointAt } from "@/tools/room-coat/lib/snap-point-utils";
import { roomWallHitFromPointer } from "@/tools/room-coat/lib/editor-surfaces";
import { findWallHit } from "@/tools/room-coat/lib/wall-openings";
import {
  ClearanceLabel,
  MeasureDistanceLabel,
  MeasureLineVisual,
  MeasurePointHandle,
  MeasurePreviewPin,
  SnapPinPreview,
  SnapGhost,
  SnapGuideVisual,
} from "@/tools/room-coat/components/scene/LayoutVisuals";
import { useFloorPointerDrag } from "@/tools/room-coat/components/editor/useFloorPointerDrag";
import { useUnitEditor } from "@/tools/room-coat/components/editor/UnitEditorContext";
import type { SnapGuideSegment } from "@/tools/room-coat/lib/snap-guides";
import type {
  Furnishing,
  Hallway,
  PlacedRoom,
  SnapPoint,
  UnitFloor,
  UnitPreference,
} from "@/tools/room-coat/types/state";
import type { RoomCoatViewSettings } from "@/tools/room-coat/types/state";

const MM_TO_M = 0.001;

export interface SnapPointPrompt {
  furnishingId: string;
  furnishingLabel: string;
  snapPointId: string;
  snapPointLabel?: string;
}

interface LayoutEditorInteractionsProps {
  gridBounds: AxisBounds;
  floor: UnitFloor;
  rooms: PlacedRoom[];
  hallways: Hallway[];
  furnishings: Furnishing[];
  snapPoints: SnapPoint[];
  unitPreference: UnitPreference;
  viewSettings: RoomCoatViewSettings;
  selectedPresetId: string;
  selectedFurnishingId: string | null;
  furnishingRotation: 0 | 90 | 180 | 270;
  measureStart: { xMm: number; zMm: number; label?: string } | null;
  measureEnd: { xMm: number; zMm: number; label?: string } | null;
  measureGuides?: SnapGuideSegment[];
  snapMeasurePoint?: (
    xMm: number,
    zMm: number,
    anchor?: { xMm: number; zMm: number } | null,
  ) => {
    xMm: number;
    zMm: number;
    label?: string;
    guides?: SnapGuideSegment[];
  };
  draggingFurnishingId?: string | null;
  /** When set, drag move/end is handled outside this component (pointer capture on furnishing mesh). */
  furnishDragPreview?: {
    xMm: number;
    zMm: number;
    snapLabel?: string;
    guides?: SnapGuideSegment[];
  } | null;
  furnishDragManagedExternally?: boolean;
  onFinishFurnishingDrag?: (
    furnishingId: string,
    xMm: number,
    zMm: number,
  ) => Promise<void>;
  tool: "furnish" | "snap-point" | "measure" | string;
  onPlaceFurnishing: (
    centerXMm: number,
    centerZMm: number,
    snapPointId?: string | null,
  ) => Promise<void>;
  onMoveFurnishing: (
    furnishingId: string,
    centerXMm: number,
    centerZMm: number,
    snapPointId?: string | null,
  ) => Promise<void>;
  onSelectFurnishing: (furnishingId: string | null) => void;
  onPlaceSnapPoint: (
    xMm: number,
    zMm: number,
  ) => Promise<void>;
  onPlaceMeasureSnapPin?: (
    point: { xMm: number; zMm: number; label?: string },
  ) => Promise<void>;
  onMeasureClick: (xMm: number, zMm: number) => void;
  onMoveMeasurePoint?: (role: "start" | "end", xMm: number, zMm: number) => void;
  onFinishMeasurePointDrag?: () => void;
  onSnapPointPrompt: (prompt: SnapPointPrompt | null) => void;
  onClearSelection?: () => void;
  onEmptyFloorActionMenu?: (
    xMm: number,
    zMm: number,
    clientX: number,
    clientY: number,
  ) => void;
}

function pointerToFloorMm(
  event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>,
  localSpace: Group | null,
): {
  xMm: number;
  zMm: number;
} {
  if (!localSpace) {
    return {
      xMm: Math.round(event.point.x / MM_TO_M),
      zMm: Math.round(event.point.z / MM_TO_M),
    };
  }
  return pointerEventToLocalMm(event, localSpace);
}

export function LayoutEditorInteractions({
  gridBounds,
  floor,
  rooms,
  hallways,
  furnishings,
  snapPoints,
  unitPreference,
  viewSettings,
  selectedPresetId,
  selectedFurnishingId,
  furnishingRotation,
  measureStart,
  measureEnd,
  measureGuides = [],
  snapMeasurePoint,
  draggingFurnishingId = null,
  furnishDragPreview = null,
  furnishDragManagedExternally = false,
  onFinishFurnishingDrag,
  tool,
  onPlaceFurnishing,
  onMoveFurnishing,
  onSelectFurnishing,
  onPlaceSnapPoint,
  onPlaceMeasureSnapPin,
  onMeasureClick,
  onMoveMeasurePoint,
  onFinishMeasurePointDrag,
  onSnapPointPrompt,
  onClearSelection,
  onEmptyFloorActionMenu,
}: LayoutEditorInteractionsProps) {
  const { gl } = useThree();
  const localRootRef = useRef<Group>(null);
  const {
    handleDoorWallHover,
    measurePreview,
    setMeasurePreview,
    furnishMode,
    consumeFurnishPlacementSuppression,
    setHallwayOrbitEnabled,
    resetMeasure,
  } = useUnitEditor();
  const suppressNextClick = useRef(false);
  const suppressNextMeasureClick = useRef(false);
  const [draggingMeasureRole, setDraggingMeasureRole] = useState<
    "start" | "end" | null
  >(null);
  const [dragPreview, setDragPreview] = useState<{
    xMm: number;
    zMm: number;
    snapLabel?: string;
    guides?: SnapGuideSegment[];
  } | null>(null);
  const [placePreview, setPlacePreview] = useState<{
    xMm: number;
    zMm: number;
    snapLabel?: string;
    guides?: SnapGuideSegment[];
  } | null>(null);
  const [snapPointPreview, setSnapPointPreview] = useState<{
    xMm: number;
    zMm: number;
    hint?: string;
    guides?: SnapGuideSegment[];
  } | null>(null);
  const showMeasurePointLabels =
    tool === "measure" || draggingMeasureRole !== null;

  const preset = furnishingPresetById(selectedPresetId) ?? FURNISHING_PRESETS[0];

  const disableOrbit = () => setHallwayOrbitEnabled(false);
  const enableOrbit = () => setHallwayOrbitEnabled(true);
  const beginMeasureDrag = useFloorPointerDrag(
    disableOrbit,
    enableOrbit,
    localRootRef,
  );

  function beginMeasureHandleDrag(
    role: "start" | "end",
    event: ThreeEvent<PointerEvent>,
  ) {
    if (!onMoveMeasurePoint) return;
    suppressNextMeasureClick.current = true;
    setDraggingMeasureRole(role);
    document.body.style.cursor = "grabbing";
    beginMeasureDrag(event, {
      onMove: (xMm, zMm) => onMoveMeasurePoint(role, xMm, zMm),
      onEnd: () => {
        setDraggingMeasureRole(null);
        document.body.style.cursor = "";
        onFinishMeasurePointDrag?.();
      },
    });
  }

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

  useEffect(() => {
    if (tool !== "furnish") {
      setPlacePreview(null);
      setDragPreview(null);
    }
    if (tool !== "measure") {
      setMeasurePreview(null);
    }
    if (tool !== "snap-point") {
      setSnapPointPreview(null);
    }
  }, [setMeasurePreview, tool]);

  useEffect(() => {
    if (furnishMode === "adjust") {
      setPlacePreview(null);
    }
  }, [furnishMode]);

  useEffect(() => {
    if (!draggingFurnishingId || furnishDragManagedExternally) {
      setDragPreview(null);
    }
  }, [draggingFurnishingId, furnishDragManagedExternally]);

  const effectiveDragPreview = furnishDragManagedExternally
    ? furnishDragPreview
    : dragPreview;

  function snapForSnapPoint(xMm: number, zMm: number) {
    return resolveSnap({
      xMm,
      zMm,
      widthMm: 1,
      depthMm: 1,
      rotationDeg: 0,
      rooms,
      hallways,
      furnishings,
      snapPoints,
      unit: unitPreference,
      snapMode: viewSettings.snapMode,
      measureStart,
      measureEnd,
      freeWhenUnmatched: true,
    });
  }

  function snapAt(xMm: number, zMm: number, excludeFurnishingId?: string) {
    return resolveSnap({
      xMm,
      zMm,
      widthMm: preset.widthMm,
      depthMm: preset.depthMm,
      rotationDeg: furnishingRotation,
      rooms,
      hallways,
      furnishings,
      snapPoints,
      unit: unitPreference,
      snapMode: viewSettings.snapMode,
      excludeFurnishingId,
      freeWhenUnmatched:
        Boolean(excludeFurnishingId) || furnishMode === "adjust",
    });
  }

  function handleFloorPointerMove(event: ThreeEvent<PointerEvent>) {
    if (tool === "add-door") {
      const point = pointerToFloorMm(event, localRootRef.current);
      const wallHit = findWallHit(rooms, point.xMm, point.zMm, 560);
      if (!wallHit) {
        handleDoorWallHover(null);
        return;
      }
      const hit = roomWallHitFromPointer(
        wallHit.room,
        wallHit.wallIndex,
        point.xMm,
        point.zMm,
      );
      handleDoorWallHover(hit);
      return;
    }

    if (tool === "measure" && snapMeasurePoint) {
      if (measureStart && measureEnd) return;
      const point = pointerToFloorMm(event, localRootRef.current);
      setMeasurePreview(
        snapMeasurePoint(
          point.xMm,
          point.zMm,
          measureStart ?? undefined,
        ),
      );
      return;
    }

    if (tool === "snap-point") {
      const point = pointerToFloorMm(event, localRootRef.current);
      const snapped = snapForSnapPoint(point.xMm, point.zMm);
      setSnapPointPreview({
        xMm: snapped.xMm,
        zMm: snapped.zMm,
        hint: snapPinPreviewHint(snapped.source?.kind, snapped.source?.label),
        guides: snapped.guides,
      });
      return;
    }

    if (tool === "furnish" && !draggingFurnishingId && furnishMode === "place") {
      const point = pointerToFloorMm(event, localRootRef.current);
      const snapped = snapAt(point.xMm, point.zMm);
      setPlacePreview({
        xMm: snapped.xMm,
        zMm: snapped.zMm,
        snapLabel: snapped.source?.label,
        guides: snapped.guides,
      });
      return;
    }

    if (tool === "furnish" && draggingFurnishingId) {
      const point = pointerToFloorMm(event, localRootRef.current);
      const snapped = snapAt(point.xMm, point.zMm, draggingFurnishingId);
      setDragPreview({
        xMm: snapped.xMm,
        zMm: snapped.zMm,
        snapLabel: snapped.source?.label,
        guides: snapped.guides,
      });
    }
  }

  async function handleFloorPointerUp(event: ThreeEvent<PointerEvent>) {
    if (
      furnishDragManagedExternally ||
      tool !== "furnish" ||
      !draggingFurnishingId ||
      !onFinishFurnishingDrag
    ) {
      return;
    }
    event.stopPropagation();
    suppressNextClick.current = true;
    const point = pointerToFloorMm(event, localRootRef.current);
    const snapped = snapAt(point.xMm, point.zMm, draggingFurnishingId);
    await onFinishFurnishingDrag(
      draggingFurnishingId,
      snapped.xMm,
      snapped.zMm,
    );
  }

  async function handleFloorClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    if (suppressNextClick.current) {
      suppressNextClick.current = false;
      return;
    }
    if (suppressNextMeasureClick.current) {
      suppressNextMeasureClick.current = false;
      return;
    }
    const point = pointerToFloorMm(event, localRootRef.current);

    if (tool === "snap-point") {
      if (
        findSnapPointAt(point.xMm, point.zMm, snapPoints, rooms)
      ) {
        return;
      }
      const snapped = snapForSnapPoint(point.xMm, point.zMm);
      await onPlaceSnapPoint(snapped.xMm, snapped.zMm);
      return;
    }

    if (tool === "measure") {
      if (measureStart && measureEnd) return;
      if (snapMeasurePoint) {
        const snapped = snapMeasurePoint(
          point.xMm,
          point.zMm,
          measureStart ?? undefined,
        );
        onMeasureClick(snapped.xMm, snapped.zMm);
      } else {
        onMeasureClick(point.xMm, point.zMm);
      }
      return;
    }

    if (tool === "furnish" && !draggingFurnishingId) {
      if (furnishMode !== "place") return;
      if (consumeFurnishPlacementSuppression()) return;
      const snapped = snapAt(point.xMm, point.zMm);
      const snapPointId =
        snapped.source?.kind === "snap-point"
          ? findSnapPointAt(
              snapped.xMm,
              snapped.zMm,
              snapPoints,
              rooms,
            )?.id ?? null
          : null;
      await onPlaceFurnishing(snapped.xMm, snapped.zMm, snapPointId);
      return;
    }

    if (tool === "select" || tool === "move") {
      onClearSelection?.();
    }
  }

  const clearanceLabels = useMemo(() => {
    if (
      !viewSettings.showClearanceLabels ||
      !effectiveDragPreview ||
      !draggingFurnishingId
    ) {
      return [];
    }
    const item = furnishings.find((entry) => entry.id === draggingFurnishingId);
    if (!item) return [];
    return nearestClearances(
      {
        ...item,
        centerXMm: effectiveDragPreview.xMm,
        centerZMm: effectiveDragPreview.zMm,
      },
      rooms,
      furnishings,
      draggingFurnishingId,
    );
  }, [
    effectiveDragPreview,
    draggingFurnishingId,
    furnishings,
    rooms,
    viewSettings.showClearanceLabels,
  ]);

  return (
    <group ref={localRootRef}>
      {tool !== "add-room" && tool !== "hallway" && tool !== "paint" && (
      <mesh
        position={[planeSizeM.cx, FLOOR_SURFACE_Y_M - 0.001, planeSizeM.cz]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={handleFloorPointerMove}
        onPointerUp={handleFloorPointerUp}
        onClick={handleFloorClick}
        onDoubleClick={(event) => {
          if (!onEmptyFloorActionMenu) return;
          event.stopPropagation();
          const point = pointerToFloorMm(event, localRootRef.current);
          const { clientX, clientY } = clientPointFromPointerEvent(
            event,
            gl.domElement,
          );
          onEmptyFloorActionMenu(point.xMm, point.zMm, clientX, clientY);
        }}
        visible={false}
      >
        <planeGeometry args={[planeSizeM.width, planeSizeM.depth]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
      )}

      {tool === "furnish" && placePreview && !draggingFurnishingId && furnishMode === "place" && (
        <>
          <SnapGuideVisual guides={placePreview.guides ?? []} />
          <SnapGhost
            xMm={placePreview.xMm}
            zMm={placePreview.zMm}
            widthMm={preset.widthMm}
            depthMm={preset.depthMm}
            heightMm={preset.heightMm}
            rotationDeg={furnishingRotation}
            presetId={preset.id}
          />
        </>
      )}

      {(tool === "furnish" || tool === "move") &&
        effectiveDragPreview &&
        draggingFurnishingId && (
        <>
          <SnapGuideVisual guides={effectiveDragPreview.guides ?? []} />
          <SnapGhost
            xMm={effectiveDragPreview.xMm}
            zMm={effectiveDragPreview.zMm}
            widthMm={
              furnishings.find((item) => item.id === draggingFurnishingId)
                ?.widthMm ?? preset.widthMm
            }
            depthMm={
              furnishings.find((item) => item.id === draggingFurnishingId)
                ?.depthMm ?? preset.depthMm
            }
            heightMm={
              furnishings.find((item) => item.id === draggingFurnishingId)
                ?.heightMm ?? preset.heightMm
            }
            rotationDeg={
              furnishings.find((item) => item.id === draggingFurnishingId)
                ?.rotationDeg ?? furnishingRotation
            }
            presetId={
              furnishings.find((item) => item.id === draggingFurnishingId)
                ?.presetId ?? preset.id
            }
          />
          {clearanceLabels.map((entry, index) => (
            <ClearanceLabel
              key={`clearance:${index}:${entry.label}`}
              xMm={effectiveDragPreview.xMm}
              zMm={effectiveDragPreview.zMm + 0.45 * (index + 1)}
              text={`${formatMm(entry.distanceMm, unitPreference)} ${entry.label}`}
            />
          ))}
        </>
      )}

      {tool === "snap-point" && snapPointPreview && (
        <>
          {(snapPointPreview.guides?.length ?? 0) > 0 && (
            <SnapGuideVisual guides={snapPointPreview.guides!} />
          )}
          <SnapPinPreview
            xMm={snapPointPreview.xMm}
            zMm={snapPointPreview.zMm}
            hint={snapPointPreview.hint}
          />
        </>
      )}

      {measureStart && (
        <>
          {tool === "measure" && (measurePreview?.guides?.length ?? 0) > 0 && !measureEnd && (
            <SnapGuideVisual guides={measurePreview!.guides!} />
          )}
          {tool === "measure" && measureGuides.length > 0 && (
            <SnapGuideVisual guides={measureGuides} />
          )}
          <MeasureLineVisual
            start={measureStart}
            end={measureEnd}
            previewEnd={
              tool === "measure" && measurePreview && !measureEnd
                ? measurePreview
                : null
            }
          />
          {tool === "measure" && !measureEnd && measurePreview && (
            <MeasurePreviewPin
              xMm={measurePreview.xMm}
              zMm={measurePreview.zMm}
              role={measureStart ? "end" : "start"}
              label={measureSnapPreviewLabel(undefined, measurePreview.label)}
            />
          )}
          {measureStart && (
            <MeasurePointHandle
              xMm={measureStart.xMm}
              zMm={measureStart.zMm}
              role="start"
              label={
                showMeasurePointLabels
                  ? measureSnapPreviewLabel(undefined, measureStart.label)
                  : undefined
              }
              dragging={draggingMeasureRole === "start"}
              interactive={tool === "measure" || (tool === "snap-point" && Boolean(measureEnd))}
              pinMode={tool === "snap-point" && Boolean(measureEnd)}
              onPinClick={
                onPlaceMeasureSnapPin
                  ? () => onPlaceMeasureSnapPin(measureStart)
                  : undefined
              }
              onPointerDown={(event) => beginMeasureHandleDrag("start", event)}
            />
          )}
          {measureEnd && (
            <MeasurePointHandle
              xMm={measureEnd.xMm}
              zMm={measureEnd.zMm}
              role="end"
              label={
                showMeasurePointLabels
                  ? measureSnapPreviewLabel(undefined, measureEnd.label)
                  : undefined
              }
              dragging={draggingMeasureRole === "end"}
              interactive={tool === "measure" || (tool === "snap-point" && Boolean(measureEnd))}
              pinMode={tool === "snap-point" && Boolean(measureEnd)}
              onPinClick={
                onPlaceMeasureSnapPin
                  ? () => onPlaceMeasureSnapPin(measureEnd)
                  : undefined
              }
              onPointerDown={(event) => beginMeasureHandleDrag("end", event)}
            />
          )}
          {measureStart && measureEnd && (
            <MeasureDistanceLabel
              start={measureStart}
              end={measureEnd}
              unitPreference={unitPreference}
              onDismiss={resetMeasure}
            />
          )}
          {tool === "measure" && measureStart && !measureEnd && measurePreview && (
            <MeasureDistanceLabel
              start={measureStart}
              end={measurePreview}
              unitPreference={unitPreference}
            />
          )}
        </>
      )}
    </group>
  );
}
