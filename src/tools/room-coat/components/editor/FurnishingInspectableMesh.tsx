"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import { useMemo } from "react";
import { FrontSide } from "three";
import type { EditorHoverMeasurement } from "@/tools/room-coat/lib/surface-measurements";
import { furnishingBodySurfaceId } from "@/tools/room-coat/lib/furnishing-surfaces";
import {
  buildFurnishingFaceSnapPoints,
  furnishingFaceSnapLocalM,
  measureFurnishingFaceSnap,
  type FurnishingFaceSnapPoint,
  type MainFurnishingFaceId,
} from "@/tools/room-coat/lib/furnishing-snap-points";
import { FLOOR_SURFACE_Y_M } from "@/tools/room-coat/lib/room-geometry";
import {
  FurnishingVisual,
  furnishingSizeM,
} from "@/tools/room-coat/components/scene/LayoutMeshes";
import type { Furnishing, UnitPreference } from "@/tools/room-coat/types/state";

const MM_TO_M = 0.001;

function FurnishingFaceSnapMarker({
  face,
  widthM,
  heightM,
  depthM,
  item,
  unitPreference,
  hovered,
  active,
  onHover,
  onHoverEnd,
  onClick,
}: {
  face: MainFurnishingFaceId;
  widthM: number;
  heightM: number;
  depthM: number;
  item: Furnishing;
  unitPreference: UnitPreference;
  hovered: boolean;
  active: boolean;
  onHover: (measurement: EditorHoverMeasurement) => void;
  onHoverEnd: () => void;
  onClick: (snap: FurnishingFaceSnapPoint) => void;
}) {
  const position = furnishingFaceSnapLocalM(widthM, heightM, depthM, face);
  const snap = useMemo(
    () => buildFurnishingFaceSnapPoints(item).find((entry) => entry.face === face)!,
    [face, item],
  );

  if (!active) return null;

  return (
    <group position={position}>
      <mesh
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
          onHover(measureFurnishingFaceSnap(item, face, unitPreference));
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "";
          onHoverEnd();
        }}
        onClick={(event) => {
          event.stopPropagation();
          onClick(snap);
        }}
      >
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial
          color={hovered ? "#fde047" : "#94a3b8"}
          emissive={hovered ? "#ca8a04" : "#475569"}
          emissiveIntensity={hovered ? 0.35 : 0.15}
          transparent
          opacity={0.92}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function FurnishingInspectableMesh({
  item,
  unitPreference,
  selected = false,
  dimmed = false,
  hoveredSurfaceId = null,
  dimensionEditActive = false,
  showFaceSnapPoints = false,
  inspectable = true,
  onHoverMeasurement,
  onHoverEnd,
  onSelectFurnishing,
  onSelectSurface,
  onFaceSnapClick,
  onPointerDown,
  onDoubleClick,
  moveGrabbable = false,
}: {
  item: Furnishing;
  unitPreference: UnitPreference;
  selected?: boolean;
  dimmed?: boolean;
  hoveredSurfaceId?: string | null;
  dimensionEditActive?: boolean;
  showFaceSnapPoints?: boolean;
  inspectable?: boolean;
  onHoverMeasurement?: (measurement: EditorHoverMeasurement | null) => void;
  onHoverEnd?: (surfaceId: string) => void;
  onSelectFurnishing?: (furnishingId: string) => void;
  onSelectSurface?: (surfaceId: string) => void;
  onFaceSnapClick?: (snap: FurnishingFaceSnapPoint) => void;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void;
  moveGrabbable?: boolean;
}) {
  const [widthM, heightM, depthM] = furnishingSizeM(item);
  const y = FLOOR_SURFACE_Y_M + heightM / 2;

  const faceSnaps = useMemo(
    () => buildFurnishingFaceSnapPoints(item),
    [item],
  );

  return (
    <group
      position={[item.centerXMm * MM_TO_M, y, item.centerZMm * MM_TO_M]}
      rotation={[0, (item.rotationDeg * Math.PI) / 180, 0]}
    >
      <FurnishingVisual
        item={item}
        widthM={widthM}
        heightM={heightM}
        depthM={depthM}
        selected={selected || dimensionEditActive}
        dimmed={dimmed}
      />

      {dimensionEditActive && (
        <mesh raycast={() => null}>
          <boxGeometry args={[widthM, heightM, depthM]} />
          <meshStandardMaterial transparent opacity={0} depthWrite={false} />
          <Edges threshold={15} color="#fde047" lineWidth={2} />
        </mesh>
      )}

      {showFaceSnapPoints &&
        !dimmed &&
        faceSnaps.map((snap) => (
          <FurnishingFaceSnapMarker
            key={snap.surfaceId}
            face={snap.face}
            widthM={widthM}
            heightM={heightM}
            depthM={depthM}
            item={item}
            unitPreference={unitPreference}
            hovered={hoveredSurfaceId === snap.surfaceId}
            active={showFaceSnapPoints}
            onHover={(measurement) => onHoverMeasurement?.(measurement)}
            onHoverEnd={() => onHoverEnd?.(snap.surfaceId)}
            onClick={(target) => onFaceSnapClick?.(target)}
          />
        ))}

      <mesh
        onPointerDown={(event) => {
          if (moveGrabbable) {
            document.body.style.cursor = "grabbing";
          }
          onPointerDown?.(event);
        }}
        onPointerOver={(event) => {
          if (!moveGrabbable || dimmed) return;
          event.stopPropagation();
          document.body.style.cursor = "grab";
        }}
        onPointerOut={() => {
          if (!moveGrabbable) return;
          document.body.style.cursor = "";
        }}
        onDoubleClick={onDoubleClick}
        onClick={(event) => {
          if (!inspectable || dimmed) return;
          event.stopPropagation();
          onSelectFurnishing?.(item.id);
          onSelectSurface?.(furnishingBodySurfaceId(item.id));
        }}
        raycast={dimmed ? () => null : undefined}
        visible={false}
      >
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshStandardMaterial transparent opacity={0} depthWrite={false} side={FrontSide} />
      </mesh>
    </group>
  );
}
