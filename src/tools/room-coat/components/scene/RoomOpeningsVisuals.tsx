"use client";

import { useMemo } from "react";
import { DoubleSide, Shape, ShapeGeometry } from "three";
import { Line } from "@react-three/drei";
import type { Door, Furnishing, PlacedRoom } from "@/tools/room-coat/types/state";
import {
  DOOR_SWING_FLOOR_Y_M,
} from "@/tools/room-coat/lib/openings-layout";
import {
  doorSwingTipLocalM,
  sampleDoorSwingArcLocalM,
  TARGET_DOOR_SWING_RAD,
} from "@/tools/room-coat/lib/door-swing-analysis";
import { WALL_THICKNESS_M } from "@/tools/room-coat/lib/room-geometry";
import {
  layoutDoorSwing,
  layoutDoorSwingPreview,
  layoutWindowPanel,
  type DoorSwingLayout,
  type OpeningPanelLayout,
} from "@/tools/room-coat/lib/openings-layout";

const PANEL_THICKNESS_M = 0.04;
const FRAME_WIDTH_M = 0.045;
const DOOR_COLOR = "#b8956a";
const DOOR_RECESS_COLOR = "#9a7b52";
const FRAME_COLOR = "#e8e0d4";
const HINGE_COLOR = "#64748b";
const KNOB_COLOR = "#cbd5e1";

function SwingFloorSector({
  hinge,
  closedDir,
  swingSign,
  radiusM,
  startSweepRad,
  endSweepRad,
  color,
  opacity,
}: {
  hinge: [number, number, number];
  closedDir: { x: number; z: number };
  swingSign: number;
  radiusM: number;
  startSweepRad: number;
  endSweepRad: number;
  color: string;
  opacity: number;
}) {
  const geometry = useMemo(() => {
    const arc = sampleDoorSwingArcLocalM(
      hinge[0],
      hinge[2],
      DOOR_SWING_FLOOR_Y_M,
      closedDir,
      swingSign,
      radiusM,
      startSweepRad,
      endSweepRad,
      36,
    );
    const shape = new Shape();
    shape.moveTo(hinge[0], hinge[2]);
    for (const [x, , z] of arc) {
      shape.lineTo(x, z);
    }
    shape.lineTo(hinge[0], hinge[2]);
    const geo = new ShapeGeometry(shape);
    geo.rotateX(Math.PI / 2);
    return geo;
  }, [closedDir, endSweepRad, hinge, radiusM, startSweepRad, swingSign]);

  return (
    <mesh
      position={[0, DOOR_SWING_FLOOR_Y_M, 0]}
      geometry={geometry}
      raycast={() => null}
      renderOrder={1}
    >
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        side={DoubleSide}
      />
    </mesh>
  );
}

function SwingArc({
  hinge,
  closedDir,
  swingSign,
  radiusM,
  startSweepRad,
  endSweepRad,
  color,
  opacity = 0.9,
  lineWidth = 2.5,
}: {
  hinge: [number, number, number];
  closedDir: { x: number; z: number };
  swingSign: number;
  radiusM: number;
  startSweepRad: number;
  endSweepRad: number;
  color: string;
  opacity?: number;
  lineWidth?: number;
}) {
  const points = useMemo(
    () =>
      sampleDoorSwingArcLocalM(
        hinge[0],
        hinge[2],
        DOOR_SWING_FLOOR_Y_M,
        closedDir,
        swingSign,
        radiusM,
        startSweepRad,
        endSweepRad,
        32,
      ),
    [closedDir, endSweepRad, hinge, radiusM, startSweepRad, swingSign],
  );
  if (points.length < 2) return null;
  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      renderOrder={4}
    />
  );
}

function SwingRadiusLine({
  hinge,
  closedDir,
  swingSign,
  radiusM,
  sweepRad,
  color,
  lineWidth = 2,
}: {
  hinge: [number, number, number];
  closedDir: { x: number; z: number };
  swingSign: number;
  radiusM: number;
  sweepRad: number;
  color: string;
  lineWidth?: number;
}) {
  const y = DOOR_SWING_FLOOR_Y_M;
  const [endX, endZ] = doorSwingTipLocalM(
    hinge[0],
    hinge[2],
    closedDir,
    swingSign,
    radiusM,
    sweepRad,
  );
  return (
    <Line
      points={[
        [hinge[0], y, hinge[2]],
        [endX, y, endZ],
      ]}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={0.85}
      renderOrder={5}
    />
  );
}

function SwingFloorMarking({
  hinge,
  closedDir,
  swingSign,
  radiusM,
  startSweepRad,
  endSweepRad,
  fillColor,
  strokeColor,
  fillOpacity,
  strokeWidth = 2.5,
}: {
  hinge: [number, number, number];
  closedDir: { x: number; z: number };
  swingSign: number;
  radiusM: number;
  startSweepRad: number;
  endSweepRad: number;
  fillColor: string;
  strokeColor: string;
  fillOpacity: number;
  strokeWidth?: number;
}) {
  const floorHinge: [number, number, number] = [
    hinge[0],
    DOOR_SWING_FLOOR_Y_M,
    hinge[2],
  ];
  return (
    <>
      <SwingFloorSector
        hinge={floorHinge}
        closedDir={closedDir}
        swingSign={swingSign}
        radiusM={radiusM}
        startSweepRad={startSweepRad}
        endSweepRad={endSweepRad}
        color={fillColor}
        opacity={fillOpacity}
      />
      <SwingArc
        hinge={floorHinge}
        closedDir={closedDir}
        swingSign={swingSign}
        radiusM={radiusM}
        startSweepRad={startSweepRad}
        endSweepRad={endSweepRad}
        color={strokeColor}
        opacity={0.95}
        lineWidth={strokeWidth}
      />
    </>
  );
}

function DoorKnob({ x, y }: { x: number; y: number }) {
  const halfT = PANEL_THICKNESS_M / 2;
  return (
    <group position={[x, y, 0]}>
      <mesh position={[0, 0, halfT + 0.012]} raycast={() => null}>
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshStandardMaterial color={KNOB_COLOR} roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0, -(halfT + 0.012)]} raycast={() => null}>
        <sphereGeometry args={[0.032, 16, 16]} />
        <meshStandardMaterial color={KNOB_COLOR} roughness={0.2} metalness={0.6} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.02, 0.02, PANEL_THICKNESS_M + 0.024, 12]} />
        <meshStandardMaterial color={KNOB_COLOR} roughness={0.25} metalness={0.55} />
      </mesh>
    </group>
  );
}

function DoorHingeAt({ y }: { y: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh raycast={() => null}>
        <boxGeometry args={[0.018, 0.088, WALL_THICKNESS_M + 0.014]} />
        <meshStandardMaterial color={HINGE_COLOR} roughness={0.35} metalness={0.65} />
      </mesh>
      <mesh position={[0, 0, PANEL_THICKNESS_M / 2 + 0.006]} raycast={() => null}>
        <cylinderGeometry args={[0.007, 0.007, 0.022, 10]} />
        <meshStandardMaterial color={HINGE_COLOR} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0, -(PANEL_THICKNESS_M / 2 + 0.006)]} raycast={() => null}>
        <cylinderGeometry args={[0.007, 0.007, 0.022, 10]} />
        <meshStandardMaterial color={HINGE_COLOR} roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
}

function DoorHinges({ heightM }: { heightM: number }) {
  const heights = [heightM * 0.22, heightM * 0.5, heightM * 0.78];
  return (
    <>
      {heights.map((y, index) => (
        <DoorHingeAt key={index} y={y} />
      ))}
    </>
  );
}

function DoorPanelSlab({
  widthM,
  heightM,
  preview,
}: {
  widthM: number;
  heightM: number;
  preview: boolean;
}) {
  const stileW = Math.min(widthM * 0.14, 0.11);
  const railH = Math.min(heightM * 0.1, 0.16);
  const panelW = (widthM - stileW * 3) / 2;
  const panelH = (heightM - railH * 3) / 2;
  const recessZ = PANEL_THICKNESS_M / 2 - 0.006;
  const faceColor = preview ? "#c9b896" : DOOR_COLOR;
  // Hinge at local origin; leaf always extends along +X (closedDir is baked into panelRotY).
  const centerX = widthM / 2;

  const panelCenters: Array<[number, number]> = [
    [stileW + panelW / 2, railH + panelH / 2],
    [stileW * 2 + panelW + panelW / 2, railH + panelH / 2],
    [stileW + panelW / 2, railH * 2 + panelH + panelH / 2],
    [stileW * 2 + panelW + panelW / 2, railH * 2 + panelH + panelH / 2],
  ];

  return (
    <group position={[centerX, heightM / 2, 0]}>
      <mesh raycast={() => null}>
        <boxGeometry args={[widthM, heightM, PANEL_THICKNESS_M]} />
        <meshStandardMaterial
          color={faceColor}
          roughness={0.5}
          metalness={0.04}
          transparent={preview}
          opacity={preview ? 0.88 : 1}
        />
      </mesh>
      <mesh position={[0, heightM / 2 - railH / 2, recessZ]} raycast={() => null}>
        <boxGeometry args={[widthM - stileW * 0.4, railH * 0.75, 0.012]} />
        <meshStandardMaterial color={faceColor} roughness={0.42} metalness={0.03} />
      </mesh>
      <mesh position={[0, -(heightM / 2 - railH / 2), recessZ]} raycast={() => null}>
        <boxGeometry args={[widthM - stileW * 0.4, railH * 0.75, 0.012]} />
        <meshStandardMaterial color={faceColor} roughness={0.42} metalness={0.03} />
      </mesh>
      <mesh position={[-(widthM / 2 - stileW / 2), 0, recessZ]} raycast={() => null}>
        <boxGeometry args={[stileW * 0.75, heightM - railH * 0.4, 0.012]} />
        <meshStandardMaterial color={faceColor} roughness={0.42} metalness={0.03} />
      </mesh>
      <mesh position={[widthM / 2 - stileW / 2, 0, recessZ]} raycast={() => null}>
        <boxGeometry args={[stileW * 0.75, heightM - railH * 0.4, 0.012]} />
        <meshStandardMaterial color={faceColor} roughness={0.42} metalness={0.03} />
      </mesh>
      {panelCenters.map(([px, py], index) => (
        <mesh
          key={index}
          position={[px - widthM / 2, py - heightM / 2, recessZ - 0.004]}
          raycast={() => null}
        >
          <boxGeometry args={[panelW * 0.92, panelH * 0.9, 0.01]} />
          <meshStandardMaterial
            color={preview ? "#b8a684" : DOOR_RECESS_COLOR}
            roughness={0.58}
            metalness={0.02}
            transparent={preview}
            opacity={preview ? 0.9 : 1}
          />
        </mesh>
      ))}
    </group>
  );
}

function DoorAssembly({
  swing,
  preview = false,
}: {
  swing: DoorSwingLayout;
  preview?: boolean;
}) {
  const [hx, , hz] = swing.hinge;
  const panelRotY = swing.panelRotationY;
  const [widthM, heightM] = swing.panel.size;
  const knobY = Math.min(Math.max(heightM * 0.46, 0.78), heightM - 0.14);
  const displaySweepRad = Math.min(swing.clearSweepRad, TARGET_DOOR_SWING_RAD);

  return (
    <group>
      {/* Hinge at origin; +local X is closedDir (flips with hinge side via panelRotY). */}
      <group position={[hx, 0, hz]} rotation={[0, panelRotY, 0]}>
        <mesh position={[FRAME_WIDTH_M / 2, heightM / 2, 0]} raycast={() => null}>
          <boxGeometry args={[FRAME_WIDTH_M, heightM, WALL_THICKNESS_M]} />
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.55} metalness={0.02} />
        </mesh>
        <mesh position={[widthM - FRAME_WIDTH_M / 2, heightM / 2, 0]} raycast={() => null}>
          <boxGeometry args={[FRAME_WIDTH_M, heightM, WALL_THICKNESS_M]} />
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.55} metalness={0.02} />
        </mesh>
        <mesh position={[widthM / 2, heightM - FRAME_WIDTH_M / 2, 0]} raycast={() => null}>
          <boxGeometry args={[widthM, FRAME_WIDTH_M, WALL_THICKNESS_M]} />
          <meshStandardMaterial color={FRAME_COLOR} roughness={0.55} metalness={0.02} />
        </mesh>

        <group position={[0, 0, 0]}>
          <DoorHinges heightM={heightM} />
          <DoorPanelSlab widthM={widthM} heightM={heightM} preview={preview} />
          <DoorKnob x={widthM - 0.1} y={knobY} />
        </group>
      </group>

      <SwingFloorMarking
        hinge={swing.hinge}
        closedDir={swing.closedDirLocal}
        swingSign={swing.swingSign}
        radiusM={swing.radiusM}
        startSweepRad={0}
        endSweepRad={displaySweepRad}
        fillColor={preview ? "#0ea5e9" : "#94a3b8"}
        strokeColor={preview ? "#38bdf8" : "#475569"}
        fillOpacity={preview ? 0.22 : 0.16}
      />
      {swing.obstructed ? (
        <SwingFloorMarking
          hinge={swing.hinge}
          closedDir={swing.closedDirLocal}
          swingSign={swing.swingSign}
          radiusM={swing.radiusM}
          startSweepRad={displaySweepRad}
          endSweepRad={Math.min(swing.maxSweepRad, TARGET_DOOR_SWING_RAD)}
          fillColor="#ef4444"
          strokeColor="#dc2626"
          fillOpacity={0.24}
          strokeWidth={3}
        />
      ) : null}
      <SwingRadiusLine
        hinge={swing.hinge}
        closedDir={swing.closedDirLocal}
        swingSign={swing.swingSign}
        radiusM={swing.radiusM}
        sweepRad={displaySweepRad}
        color={preview ? "#38bdf8" : "#475569"}
        lineWidth={2.5}
      />
    </group>
  );
}

function WindowPanel({
  layout,
  preview = false,
}: {
  layout: OpeningPanelLayout;
  preview?: boolean;
}) {
  const [widthM, heightM] = layout.size;
  const frameW = 0.042;
  const sillH = 0.035;
  const glassColor = preview ? "#dbeafe" : "#bfdbfe";

  return (
    <group position={layout.position} rotation={layout.rotation}>
      <mesh position={[-widthM / 2 + frameW / 2, 0, 0]} raycast={() => null}>
        <boxGeometry args={[frameW, heightM, WALL_THICKNESS_M]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.55} metalness={0.02} />
      </mesh>
      <mesh position={[widthM / 2 - frameW / 2, 0, 0]} raycast={() => null}>
        <boxGeometry args={[frameW, heightM, WALL_THICKNESS_M]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.55} metalness={0.02} />
      </mesh>
      <mesh position={[0, heightM / 2 - frameW / 2, 0]} raycast={() => null}>
        <boxGeometry args={[widthM, frameW, WALL_THICKNESS_M]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.55} metalness={0.02} />
      </mesh>
      <mesh position={[0, -heightM / 2 + sillH / 2, 0]} raycast={() => null}>
        <boxGeometry args={[widthM + frameW * 0.4, sillH, WALL_THICKNESS_M + 0.02]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.45} metalness={0.03} />
      </mesh>
      <mesh raycast={() => null}>
        <boxGeometry args={[widthM - frameW * 1.6, heightM - frameW - sillH, 0.006]} />
        <meshStandardMaterial
          color={glassColor}
          roughness={0.08}
          metalness={0.12}
          transparent
          opacity={preview ? 0.55 : 0.42}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, frameW * 0.1, 0]} raycast={() => null}>
        <boxGeometry args={[widthM - frameW * 2.2, 0.012, 0.008]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.5} metalness={0.02} />
      </mesh>
    </group>
  );
}

export function RoomOpeningsVisuals({
  room,
  furnishings = [],
  allRooms,
}: {
  room: PlacedRoom;
  furnishings?: Furnishing[];
  allRooms?: PlacedRoom[];
}) {
  const roomsForSwing = allRooms ?? [room];
  const doorSwings = useMemo(
    () =>
      room.doors
        .map((door) => layoutDoorSwing(room, door, furnishings, roomsForSwing))
        .filter(Boolean),
    [room, furnishings, roomsForSwing],
  );
  const windows = useMemo(
    () =>
      (room.windows ?? [])
        .map((window) => layoutWindowPanel(room, window))
        .filter(Boolean),
    [room],
  );

  return (
    <>
      {doorSwings.map((swing) =>
        swing ? (
          <DoorAssembly key={`door:${swing.doorId}`} swing={swing} />
        ) : null,
      )}
      {windows.map((layout) =>
        layout ? (
          <WindowPanel key={`window:${layout.id}`} layout={layout} />
        ) : null,
      )}
    </>
  );
}

export function DoorDraftVisual({
  room,
  door,
  furnishings = [],
  allRooms,
}: {
  room: PlacedRoom;
  door: Omit<Door, "id" | "overridePaintId">;
  furnishings?: Furnishing[];
  allRooms?: PlacedRoom[];
}) {
  const swing = useMemo(
    () => layoutDoorSwingPreview(room, door, furnishings, allRooms ?? [room]),
    [allRooms, door, furnishings, room],
  );
  if (!swing) return null;
  return <DoorAssembly swing={swing} preview />;
}
