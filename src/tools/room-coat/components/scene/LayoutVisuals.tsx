"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMemo, useState } from "react";
import { Html, Line } from "@react-three/drei";
import { DoubleSide } from "three";
import { formatMm } from "@/tools/room-coat/lib/units";
import {
  floorSegmentMeasureLabelSizeM,
  measurementLabelTexture,
  wallMeasurementLabelSizeM,
} from "@/tools/room-coat/lib/wall-label-texture";
import { FLOOR_SURFACE_Y_M } from "@/tools/room-coat/lib/room-geometry";
import type { UnitPreference } from "@/tools/room-coat/types/state";
import type { SnapGuideSegment } from "@/tools/room-coat/lib/snap-guides";
import {
  EDITOR_CHROME_BUTTON_DANGER,
  EDITOR_CHROME_MEASUREMENT,
  EDITOR_SCENE_MEASURE_HINT,
  EDITOR_Z_SCENE_HTML,
} from "@/tools/room-coat/components/editor/editor-chrome";
import { EditorScenePinCallout } from "@/tools/room-coat/components/editor/EditorScenePinCallout";

const MM_TO_M = 0.001;

export function ClearanceLabel({
  xMm,
  zMm,
  text,
}: {
  xMm: number;
  zMm: number;
  text: string;
}) {
  const { texture, aspect } = useMemo(
    () => measurementLabelTexture(text),
    [text],
  );
  const [planeWidth, planeHeight] = useMemo(
    () => wallMeasurementLabelSizeM(2, 1, aspect),
    [aspect],
  );

  return (
    <mesh
      position={[xMm * MM_TO_M, FLOOR_SURFACE_Y_M + 0.08, zMm * MM_TO_M]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={960}
      raycast={() => null}
    >
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.08}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Measurement tag flat on the floor, rotated to sit inline with a wall segment. */
export function RoomSegmentMeasureLabel({
  x1Mm,
  z1Mm,
  x2Mm,
  z2Mm,
  text,
  yM = FLOOR_SURFACE_Y_M + 0.08,
}: {
  x1Mm: number;
  z1Mm: number;
  x2Mm: number;
  z2Mm: number;
  text: string;
  yM?: number;
}) {
  const midXMm = (x1Mm + x2Mm) / 2;
  const midZMm = (z1Mm + z2Mm) / 2;
  const dxM = (x2Mm - x1Mm) * MM_TO_M;
  const dzM = (z2Mm - z1Mm) * MM_TO_M;
  const segLenM = Math.hypot(dxM, dzM);
  const angle = Math.atan2(dzM, dxM);

  const { texture, aspect } = useMemo(
    () => measurementLabelTexture(text),
    [text],
  );
  const [planeWidth, planeHeight] = useMemo(
    () => floorSegmentMeasureLabelSizeM(segLenM, aspect),
    [segLenM, aspect],
  );

  return (
    <mesh
      position={[midXMm * MM_TO_M, yM, midZMm * MM_TO_M]}
      rotation={[-Math.PI / 2, 0, -angle]}
      renderOrder={960}
      raycast={() => null}
    >
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial
        map={texture}
        transparent
        alphaTest={0.08}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Large screen-space label while drawing room walls. */
export function RoomDrawMeasureLabel({
  x1Mm,
  z1Mm,
  x2Mm,
  z2Mm,
  text,
}: {
  x1Mm: number;
  z1Mm: number;
  x2Mm: number;
  z2Mm: number;
  text: string;
}) {
  const midXMm = (x1Mm + x2Mm) / 2;
  const midZMm = (z1Mm + z2Mm) / 2;

  return (
    <Html
      position={[midXMm * MM_TO_M, FLOOR_SURFACE_Y_M + 0.22, midZMm * MM_TO_M]}
      center
      zIndexRange={[EDITOR_Z_SCENE_HTML, 0]}
      style={{ pointerEvents: "none" }}
    >
      <div className="whitespace-nowrap select-none rounded-xl border-2 border-sky-400/80 bg-slate-950/95 px-5 py-2.5 text-xl font-bold tabular-nums tracking-tight text-white shadow-2xl shadow-black/60">
        {text}
      </div>
    </Html>
  );
}

export function SnapGuideVisual({
  guides,
}: {
  guides: SnapGuideSegment[];
}) {
  if (guides.length === 0) return null;

  return (
    <group>
      {guides.map((guide, index) => (
        <Line
          key={`guide:${index}:${guide.x1Mm}:${guide.z1Mm}`}
          points={[
            [
              guide.x1Mm * MM_TO_M,
              FLOOR_SURFACE_Y_M + 0.015,
              guide.z1Mm * MM_TO_M,
            ],
            [
              guide.x2Mm * MM_TO_M,
              FLOOR_SURFACE_Y_M + 0.015,
              guide.z2Mm * MM_TO_M,
            ],
          ]}
          color="#fbbf24"
          lineWidth={1.5}
          dashed
          dashSize={0.08}
          gapSize={0.06}
          depthTest={false}
          renderOrder={9998}
          transparent
          opacity={0.85}
        />
      ))}
    </group>
  );
}

export function MeasureLineVisual({
  start,
  end,
  previewEnd,
}: {
  start: { xMm: number; zMm: number; label?: string } | null;
  end: { xMm: number; zMm: number; label?: string } | null;
  previewEnd?: { xMm: number; zMm: number; label?: string } | null;
  unitPreference?: UnitPreference;
}) {
  const activeEnd = end ?? previewEnd;

  // Hooks must run unconditionally — keep this memo above the early returns and
  // guard the null-start case inside it.
  const linePoints = useMemo(() => {
    if (!start || !activeEnd) return null;
    return [
      [start.xMm * MM_TO_M, FLOOR_SURFACE_Y_M + 0.03, start.zMm * MM_TO_M] as [
        number,
        number,
        number,
      ],
      [activeEnd.xMm * MM_TO_M, FLOOR_SURFACE_Y_M + 0.03, activeEnd.zMm * MM_TO_M] as [
        number,
        number,
        number,
      ],
    ];
  }, [activeEnd, start]);

  if (!start) return null;
  if (!linePoints) return null;

  return (
    <Line
      points={linePoints}
      color={end ? "#38bdf8" : "#7dd3fc"}
      lineWidth={end ? 3 : 2}
      dashed={!end}
      dashSize={0.12}
      gapSize={0.08}
      depthTest={false}
      renderOrder={10000}
      transparent
    />
  );
}

/** Snap / placement label shown above measure pins. */
function MeasureSnapNameLabel({
  text,
  tone = "snap",
}: {
  text: string;
  tone?: "snap" | "hint";
}) {
  return (
    <EditorScenePinCallout
      label={text}
      variant={tone === "snap" ? "measure" : "hint"}
      offsetY={0.34}
    />
  );
}

/** Preview marker while placing a floor snap pin. */
export function SnapPinPreview({
  xMm,
  zMm,
  hint,
}: {
  xMm: number;
  zMm: number;
  hint?: string;
}) {
  const y = FLOOR_SURFACE_Y_M + 0.02;

  return (
    <group position={[xMm * MM_TO_M, y, zMm * MM_TO_M]} renderOrder={10001}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={10001}>
        <ringGeometry args={[0.1, 0.15, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.55}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={10002}>
        <circleGeometry args={[0.035, 24]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.9} depthWrite={false} />
      </mesh>
      <EditorScenePinCallout
        label={hint ?? "Place pin"}
        variant="hint"
        offsetY={0.34}
      />
    </group>
  );
}

/** Draggable floor marker — matches snap-point / room-draw handle styling. */
export function MeasurePointHandle({
  xMm,
  zMm,
  role,
  label,
  dragging = false,
  pinMode = false,
  interactive = true,
  onPointerDown,
  onPinClick,
}: {
  xMm: number;
  zMm: number;
  role: "start" | "end";
  label?: string;
  dragging?: boolean;
  pinMode?: boolean;
  interactive?: boolean;
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void;
  onPinClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const y = FLOOR_SURFACE_Y_M + 0.02;
  const ringColor = role === "start" ? "#fbbf24" : "#38bdf8";
  const dotColor = role === "start" ? "#f59e0b" : "#0ea5e9";
  const emissive = role === "start" ? "#d97706" : "#0284c7";
  const active = (hovered || dragging) && interactive;
  const scale = active ? 1.28 : 1;

  return (
    <group position={[xMm * MM_TO_M, y, zMm * MM_TO_M]} renderOrder={10001}>
      {active && !dragging && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={10001}>
          <ringGeometry args={[0.13, 0.2, 32]} />
          <meshBasicMaterial
            color={ringColor}
            transparent
            opacity={0.45}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[scale, scale, 1]}
        raycast={interactive ? undefined : () => null}
        onPointerDown={(event) => {
          if (!interactive) return;
          event.stopPropagation();
          if (pinMode && onPinClick) {
            onPinClick();
            return;
          }
          onPointerDown?.(event);
        }}
        onPointerOver={(event) => {
          if (!interactive || dragging) return;
          event.stopPropagation();
          setHovered(true);
          document.body.style.cursor = pinMode ? "pointer" : "grab";
        }}
        onPointerOut={() => {
          if (!interactive || dragging) return;
          setHovered(false);
          document.body.style.cursor = "";
        }}
        renderOrder={10002}
      >
        <circleGeometry args={[pinMode ? 0.24 : 0.2, 24]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[scale, scale, 1]}
        raycast={() => null}
        renderOrder={10003}
      >
        <ringGeometry args={[0.08, 0.14, 32]} />
        <meshBasicMaterial
          color={active ? "#ffffff" : ringColor}
          transparent
          opacity={active ? 1 : pinMode ? 0.85 : 0.95}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[scale, scale, 1]}
        raycast={() => null}
        renderOrder={10004}
      >
        <circleGeometry args={[0.04, 24]} />
        <meshStandardMaterial
          color={dotColor}
          emissive={emissive}
          emissiveIntensity={active ? 0.65 : pinMode ? 0.35 : 0.2}
          transparent
          opacity={1}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {label && <MeasureSnapNameLabel text={label} tone="snap" />}
      {pinMode && hovered && (
        <Html
          position={[0, 0.32, 0]}
          center
          zIndexRange={[EDITOR_Z_SCENE_HTML, 0]}
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          <div className={EDITOR_SCENE_MEASURE_HINT}>Place pin</div>
        </Html>
      )}
    </group>
  );
}

/** Live preview pin while picking start or end — matches handle styling. */
export function MeasurePreviewPin({
  xMm,
  zMm,
  role,
  label,
}: {
  xMm: number;
  zMm: number;
  role: "start" | "end";
  label?: string;
}) {
  const y = FLOOR_SURFACE_Y_M + 0.02;
  const ringColor = role === "start" ? "#fbbf24" : "#38bdf8";
  const dotColor = role === "start" ? "#f59e0b" : "#0ea5e9";
  const emissive = role === "start" ? "#d97706" : "#0284c7";
  const hint = role === "start" ? "Click to set start" : "Click to set end";

  return (
    <group position={[xMm * MM_TO_M, y, zMm * MM_TO_M]} renderOrder={10001}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={10001}>
        <ringGeometry args={[0.13, 0.19, 32]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={0.35}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={10002}>
        <ringGeometry args={[0.08, 0.14, 32]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={0.75}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} raycast={() => null} renderOrder={10003}>
        <circleGeometry args={[0.04, 24]} />
        <meshStandardMaterial
          color={dotColor}
          emissive={emissive}
          emissiveIntensity={0.45}
          transparent
          opacity={0.88}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <MeasureSnapNameLabel
        text={label ?? hint}
        tone={label ? "snap" : "hint"}
      />
    </group>
  );
}

/** @deprecated Use MeasurePreviewPin */
export function MeasurePreviewDot({
  xMm,
  zMm,
  snapped,
}: {
  xMm: number;
  zMm: number;
  snapped: boolean;
}) {
  return (
    <mesh
      position={[xMm * MM_TO_M, FLOOR_SURFACE_Y_M + 0.05, zMm * MM_TO_M]}
      renderOrder={10000}
      raycast={() => null}
    >
      <sphereGeometry args={[snapped ? 0.07 : 0.045, 12, 12]} />
      <meshStandardMaterial
        color={snapped ? "#38bdf8" : "#86efac"}
        emissive={snapped ? "#0284c7" : "#000000"}
        emissiveIntensity={snapped ? 0.35 : 0}
        depthWrite={false}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}

/** Distance readout centered on the measure segment. */
export function MeasureDistanceLabel({
  start,
  end,
  unitPreference,
  onDismiss,
}: {
  start: { xMm: number; zMm: number };
  end: { xMm: number; zMm: number };
  unitPreference: UnitPreference;
  onDismiss?: () => void;
}) {
  const distanceMm = Math.round(
    Math.hypot(end.xMm - start.xMm, end.zMm - start.zMm),
  );
  if (distanceMm <= 0) return null;

  const midXMm = (start.xMm + end.xMm) / 2;
  const midZMm = (start.zMm + end.zMm) / 2;

  return (
    <Html
      position={[midXMm * MM_TO_M, FLOOR_SURFACE_Y_M + 0.22, midZMm * MM_TO_M]}
      center
      zIndexRange={[EDITOR_Z_SCENE_HTML, 0]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div className="flex items-center gap-1.5">
        <div className={EDITOR_CHROME_MEASUREMENT}>
          {formatMm(distanceMm, unitPreference)}
        </div>
        {onDismiss && (
          <button
            type="button"
            aria-label="Clear measure"
            title="Clear measure"
            className={`pointer-events-auto flex h-7 w-7 items-center justify-center rounded-md border border-zinc-500/40 bg-zinc-950/95 text-base leading-none text-zinc-300 shadow-lg shadow-black/50 ${EDITOR_CHROME_BUTTON_DANGER}`}
            onClick={(event) => {
              event.stopPropagation();
              onDismiss();
            }}
          >
            ×
          </button>
        )}
      </div>
    </Html>
  );
}

export function SnapGhost({
  xMm,
  zMm,
  widthMm,
  depthMm,
  rotationDeg,
  label,
  presetId,
  heightMm,
}: {
  xMm: number;
  zMm: number;
  widthMm: number;
  depthMm: number;
  rotationDeg: 0 | 90 | 180 | 270;
  label?: string;
  presetId?: string;
  heightMm?: number;
}) {
  const swap = rotationDeg === 90 || rotationDeg === 270;
  const widthM = (swap ? depthMm : widthMm) * MM_TO_M;
  const depthM = (swap ? widthMm : depthMm) * MM_TO_M;
  const heightM =
    presetId === "chair" ? (heightMm ?? 914) * MM_TO_M : 0.04;
  const ghostMat = (
    <meshStandardMaterial
      color="#38bdf8"
      transparent
      opacity={0.35}
      depthWrite={false}
    />
  );

  return (
    <group
      position={[xMm * MM_TO_M, FLOOR_SURFACE_Y_M + heightM / 2, zMm * MM_TO_M]}
      rotation={[0, (rotationDeg * Math.PI) / 180, 0]}
    >
      {presetId === "chair" ? (
        <>
          <mesh position={[0, -heightM / 2 + heightM * 0.21, depthM * 0.1]}>
            <boxGeometry args={[widthM * 0.9, heightM * 0.42, depthM * 0.62]} />
            {ghostMat}
          </mesh>
          <mesh
            position={[
              0,
              -heightM / 2 + heightM * 0.42 + heightM * 0.29,
              -depthM / 2 + depthM * 0.07,
            ]}
          >
            <boxGeometry args={[widthM * 0.9, heightM * 0.58, depthM * 0.14]} />
            {ghostMat}
          </mesh>
        </>
      ) : presetId === "counter" || presetId === "bar" ? (
        <>
          <mesh position={[0, -heightM / 2 + (heightM * 0.92) / 2, 0]}>
            <boxGeometry args={[widthM * 0.92, heightM * 0.84, depthM * 0.7]} />
            {ghostMat}
          </mesh>
          <mesh position={[0, heightM / 2 - heightM * 0.04, 0]}>
            <boxGeometry args={[widthM, heightM * 0.08, depthM]} />
            {ghostMat}
          </mesh>
        </>
      ) : (
        <mesh>
          <boxGeometry args={[widthM, heightM, depthM]} />
          {ghostMat}
        </mesh>
      )}
    </group>
  );
}

export function RoomDrawPreview({
  originXMm,
  originZMm,
  widthMm,
  lengthMm,
  unitPreference,
}: {
  originXMm: number;
  originZMm: number;
  widthMm: number;
  lengthMm: number;
  unitPreference: UnitPreference;
}) {
  const widthM = widthMm * MM_TO_M;
  const depthM = lengthMm * MM_TO_M;
  const heightM = 0.05;
  const label = `${formatMm(widthMm, unitPreference)} × ${formatMm(lengthMm, unitPreference)}`;

  const outline = useMemo(
    () =>
      [
        [-widthM / 2, -depthM / 2],
        [widthM / 2, -depthM / 2],
        [widthM / 2, depthM / 2],
        [-widthM / 2, depthM / 2],
        [-widthM / 2, -depthM / 2],
      ] as [number, number][],
    [depthM, widthM],
  );

  return (
    <group
      position={[
        originXMm * MM_TO_M,
        FLOOR_SURFACE_Y_M + heightM / 2,
        originZMm * MM_TO_M,
      ]}
    >
      <mesh>
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshStandardMaterial
          color="#22c55e"
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>
      <Line
        points={outline.map(([x, z]) => [x, heightM / 2 + 0.01, z])}
        color="#4ade80"
        lineWidth={2}
        renderOrder={900}
      />
      <ClearanceLabel xMm={0} zMm={0} text={label} />
    </group>
  );
}
