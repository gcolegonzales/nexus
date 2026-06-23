"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { Edges, Html } from "@react-three/drei";
import { DoubleSide, FrontSide } from "three";
import type { RefObject } from "react";
import type { Object3D } from "three";
import { furnishingRect } from "@/tools/room-coat/lib/layout-bounds";
import { darkenHex } from "@/tools/room-coat/lib/wall-label-color";
import { EDITOR_Z_FLOOR_LABEL } from "@/tools/room-coat/components/editor/editor-chrome";
import { useFloorPointerDrag } from "@/tools/room-coat/components/editor/useFloorPointerDrag";
import { FLOOR_SURFACE_Y_M } from "@/tools/room-coat/lib/room-geometry";
import type { AxisBounds } from "@/tools/room-coat/lib/floor-utils";
import { EditorScenePinCallout } from "@/tools/room-coat/components/editor/EditorScenePinCallout";
import type { Furnishing, PlacedRoom, SnapPoint } from "@/tools/room-coat/types/state";
import { snapPointPositionM } from "@/tools/room-coat/lib/snap-point-utils";

const MM_TO_M = 0.001;

export function furnishingSizeM(item: Furnishing): [number, number, number] {
  const rect = furnishingRect(item);
  const heightM = item.heightMm * MM_TO_M;
  return [rect.widthMm * MM_TO_M, heightM, rect.depthMm * MM_TO_M];
}

export function FurnishingVisual({
  item,
  widthM,
  heightM,
  depthM,
  selected,
  dimmed,
}: {
  item: Furnishing;
  widthM: number;
  heightM: number;
  depthM: number;
  selected: boolean;
  dimmed: boolean;
}) {
  const color = item.color ?? "#94a3b8";
  const isChair = item.presetId === "chair";
  const isCounter = item.presetId === "counter" || item.presetId === "bar";

  if (isChair) {
    return (
      <ChairFurnishingParts
        widthM={widthM}
        heightM={heightM}
        depthM={depthM}
        color={color}
        selected={selected}
        dimmed={dimmed}
      />
    );
  }

  if (isCounter) {
    return (
      <CounterFurnishingParts
        widthM={widthM}
        heightM={heightM}
        depthM={depthM}
        color={color}
        selected={selected}
        dimmed={dimmed}
        isBar={item.presetId === "bar"}
      />
    );
  }

  return (
    <mesh raycast={() => null}>
      <boxGeometry args={[widthM, heightM, depthM]} />
      {furnishingMaterial(color, selected, dimmed)}
      {!dimmed && <Edges threshold={15} color={darkenHex(color)} lineWidth={1} />}
    </mesh>
  );
}

function furnishingMaterial(
  color: string,
  selected: boolean,
  dimmed: boolean,
) {
  return (
    <meshStandardMaterial
      color={selected ? "#38bdf8" : color}
      transparent={dimmed}
      opacity={dimmed ? 0.35 : 1}
      roughness={0.85}
      metalness={0}
      emissive={selected ? "#0ea5e9" : "#000000"}
      emissiveIntensity={selected ? 0.2 : 0}
      side={FrontSide}
    />
  );
}

function ChairFurnishingParts({
  widthM,
  heightM,
  depthM,
  color,
  selected,
  dimmed,
}: {
  widthM: number;
  heightM: number;
  depthM: number;
  color: string;
  selected: boolean;
  dimmed: boolean;
}) {
  const seatH = heightM * 0.42;
  const backH = heightM * 0.58;
  const backD = depthM * 0.14;
  const seatD = depthM * 0.62;
  const edgeColor = darkenHex(selected ? "#38bdf8" : color);

  return (
    <group>
      <mesh position={[0, -heightM / 2 + seatH / 2, depthM * 0.1]} raycast={() => null}>
        <boxGeometry args={[widthM * 0.9, seatH, seatD]} />
        {furnishingMaterial(color, selected, dimmed)}
        {!dimmed && <Edges threshold={15} color={edgeColor} lineWidth={1} />}
      </mesh>
      <mesh position={[0, -heightM / 2 + seatH + backH / 2, -depthM / 2 + backD / 2]} raycast={() => null}>
        <boxGeometry args={[widthM * 0.9, backH, backD]} />
        {furnishingMaterial(color, selected, dimmed)}
        {!dimmed && <Edges threshold={15} color={edgeColor} lineWidth={1} />}
      </mesh>
    </group>
  );
}

function CounterFurnishingParts({
  widthM,
  heightM,
  depthM,
  color,
  selected,
  dimmed,
  isBar,
}: {
  widthM: number;
  heightM: number;
  depthM: number;
  color: string;
  selected: boolean;
  dimmed: boolean;
  isBar?: boolean;
}) {
  const topThick = Math.max(0.035, heightM * 0.08);
  const baseH = heightM - topThick;
  const edgeColor = darkenHex(selected ? "#38bdf8" : color);
  const topColor = selected ? "#7dd3fc" : isBar ? "#a8a29e" : "#d6d3d1";

  return (
    <group>
      <mesh position={[0, -heightM / 2 + baseH / 2, 0]} raycast={() => null}>
        <boxGeometry args={[widthM * 0.92, baseH, depthM * (isBar ? 0.55 : 0.82)]} />
        {furnishingMaterial(color, selected, dimmed)}
        {!dimmed && <Edges threshold={15} color={edgeColor} lineWidth={1} />}
      </mesh>
      <mesh position={[0, heightM / 2 - topThick / 2, 0]} raycast={() => null}>
        <boxGeometry args={[widthM, topThick, depthM]} />
        <meshStandardMaterial
          color={topColor}
          transparent={dimmed}
          opacity={dimmed ? 0.35 : 1}
          roughness={0.55}
          metalness={0.05}
          emissive={selected ? "#0ea5e9" : "#000000"}
          emissiveIntensity={selected ? 0.15 : 0}
          side={FrontSide}
        />
        {!dimmed && <Edges threshold={15} color={darkenHex(topColor)} lineWidth={1.5} />}
      </mesh>
    </group>
  );
}

export function FurnishingMesh({
  item,
  selected = false,
  dimmed = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onClick,
  onDoubleClick,
}: {
  item: Furnishing;
  selected?: boolean;
  dimmed?: boolean;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove?: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onDoubleClick?: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const [widthM, heightM, depthM] = furnishingSizeM(item);
  const y = FLOOR_SURFACE_Y_M + heightM / 2;
  const pointerHandlers = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onClick,
    onDoubleClick,
    raycast: dimmed ? () => null : undefined,
  };

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
        selected={selected}
        dimmed={dimmed}
      />
      <mesh {...pointerHandlers}>
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshStandardMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function SnapPointMarker({
  label,
  xMm,
  zMm,
  selected = false,
  dimmed = false,
  onClick,
  onDrag,
  onDragStart,
  onDragEnd,
  variant = "floor",
  floorLocalSpaceRef,
}: {
  label?: string;
  xMm: number;
  zMm: number;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
  onDrag?: (xMm: number, zMm: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  variant?: "floor" | "wall";
  floorLocalSpaceRef?: RefObject<Object3D | null>;
}) {
  const y = FLOOR_SURFACE_Y_M + 0.02;
  const ringColor = variant === "wall" ? "#fb923c" : selected ? "#fbbf24" : "#38bdf8";
  const dotColor = variant === "wall" ? "#f97316" : selected ? "#f59e0b" : "#0ea5e9";
  const beginDrag = useFloorPointerDrag(
    onDragStart ?? (() => {}),
    onDragEnd ?? (() => {}),
    floorLocalSpaceRef,
    onClick && onDrag ? 6 : 0,
  );

  return (
    <group position={[xMm * MM_TO_M, y, zMm * MM_TO_M]}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(event) => {
          event.stopPropagation();
          onClick?.(event);
        }}
        onPointerOver={
          onClick
            ? () => {
                document.body.style.cursor = "pointer";
              }
            : undefined
        }
        onPointerOut={
          onClick
            ? () => {
                document.body.style.cursor = "";
              }
            : undefined
        }
        onPointerDown={
          onDrag
            ? (event) => {
                event.stopPropagation();
                beginDrag(event, {
                  onMove: onDrag,
                  onEnd: onDragEnd ?? (() => {}),
                });
              }
            : undefined
        }
        raycast={dimmed ? () => null : undefined}
      >
        <ringGeometry args={[0.08, 0.14, 32]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={dimmed ? 0.35 : 0.95}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.035, 24]} />
        <meshBasicMaterial
          color={dotColor}
          transparent
          opacity={dimmed ? 0.35 : 1}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {label && !dimmed && (
        <EditorScenePinCallout label={label} variant="snap" offsetY={0.34} />
      )}
    </group>
  );
}

export function WallSnapPointMarker({
  room,
  point,
  dimmed = false,
  onClick,
}: {
  room: PlacedRoom;
  point: SnapPoint;
  dimmed?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const [xM, yM, zM] = snapPointPositionM(room, point);

  return (
    <group position={[xM, yM, zM]}>
      <mesh
        onClick={onClick}
        onPointerOver={
          onClick
            ? () => {
                document.body.style.cursor = "pointer";
              }
            : undefined
        }
        onPointerOut={
          onClick
            ? () => {
                document.body.style.cursor = "";
              }
            : undefined
        }
        raycast={dimmed ? () => null : undefined}
      >
        <boxGeometry args={[0.42, 0.5, 0.28]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh raycast={() => null}>
        <boxGeometry args={[0.12, 0.18, 0.04]} />
        <meshStandardMaterial
          color="#fb923c"
          transparent
          opacity={dimmed ? 0.35 : 0.92}
          emissive="#ea580c"
          emissiveIntensity={dimmed ? 0 : 0.25}
        />
      </mesh>
      {point.label && !dimmed && (
        <EditorScenePinCallout
          label={point.label}
          variant="wall"
          offsetY={0.48}
        />
      )}
    </group>
  );
}

const FLOOR_LABEL_EDGE_OUTSET_MM = 700;

export function FloorIslandLabel({
  name,
  gridBounds,
  active,
}: {
  name: string;
  gridBounds: AxisBounds;
  active: boolean;
}) {
  const centerXMm = (gridBounds.minX + gridBounds.maxX) / 2;
  const edgeZMm = gridBounds.minZ - FLOOR_LABEL_EDGE_OUTSET_MM;

  return (
    <Html
      position={[centerXMm * MM_TO_M, 0.15, edgeZMm * MM_TO_M]}
      center
      zIndexRange={[EDITOR_Z_FLOOR_LABEL, 0]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${
          active
            ? "bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/40"
            : "bg-slate-900/75 text-slate-200 ring-1 ring-white/10"
        }`}
      >
        {name}
      </div>
    </Html>
  );
}
