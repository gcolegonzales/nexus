"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { FrontSide, Vector3 } from "three";
import {
  hallwayLabelAnchor,
  hallwayLabelFloorSizeM,
  hallwayPathLengthMm,
} from "@/tools/room-coat/lib/floor-space-labels";
import { labelColorForWallHex } from "@/tools/room-coat/lib/wall-label-color";
import {
  floorNameLabelPlaneSizeM,
  floorNameLabelTexture,
} from "@/tools/room-coat/lib/wall-label-texture";
import type { Hallway, PlacedRoom } from "@/tools/room-coat/types/state";

const FLOOR_COLOR = "#64748b";
const LABEL_Y_OFFSET_M = 0.035;
const MM_TO_M = 0.001;

const ROOM_YAWS = [0, Math.PI / 2, Math.PI, -Math.PI / 2] as const;
const HALLWAY_YAWS_X = [0, Math.PI] as const;
const HALLWAY_YAWS_Z = [Math.PI / 2, -Math.PI / 2] as const;

const _worldPos = new Vector3();

/** Pick the yaw that points the label top toward the camera (4-way or 2-way). */
function yawTowardCamera(
  dx: number,
  dz: number,
  options: readonly number[],
): number {
  if (dx * dx + dz * dz < 1e-8) return options[0] ?? 0;

  let best = options[0] ?? 0;
  let bestScore = -Infinity;

  for (const yaw of options) {
    const score = -Math.sin(yaw) * dx + -Math.cos(yaw) * dz;
    if (score > bestScore) {
      bestScore = score;
      best = yaw;
    }
  }

  return best;
}

function FloorNameLabel({
  name,
  position,
  planeSize,
  yaws,
}: {
  name: string;
  position: [number, number, number];
  planeSize: [number, number];
  yaws: readonly number[];
}) {
  const yawRef = useRef<Group>(null);
  const camera = useThree((state) => state.camera);
  const textColor = labelColorForWallHex(FLOOR_COLOR);
  const { texture } = useMemo(
    () => floorNameLabelTexture(name, textColor),
    [name, textColor],
  );

  useFrame(() => {
    const yawGroup = yawRef.current;
    if (!yawGroup) return;

    yawGroup.getWorldPosition(_worldPos);
    const dx = camera.position.x - _worldPos.x;
    const dz = camera.position.z - _worldPos.z;
    // Half-turn vs default canvas UVs on a horizontal plane.
    yawGroup.rotation.y = yawTowardCamera(dx, dz, yaws) + Math.PI;
  });

  return (
    <group position={position}>
      <group ref={yawRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={50} raycast={() => null}>
          <planeGeometry args={planeSize} />
          <meshBasicMaterial
            map={texture}
            transparent
            depthTest
            depthWrite={false}
            toneMapped={false}
            side={FrontSide}
          />
        </mesh>
      </group>
    </group>
  );
}

export function RoomFloorLabel({ room }: { room: PlacedRoom }) {
  const planeSize = useMemo(() => {
    const { texture, aspect } = floorNameLabelTexture(
      room.name,
      labelColorForWallHex(FLOOR_COLOR),
    );
    void texture;
    const [width, height] = floorNameLabelPlaneSizeM(
      room.widthMm * MM_TO_M,
      room.lengthMm * MM_TO_M,
      aspect,
    );
    return [Math.max(width, 0.28), Math.max(height, 0.07)] as [number, number];
  }, [room.name, room.widthMm, room.lengthMm]);

  if (!room.name.trim()) return null;

  return (
    <FloorNameLabel
      name={room.name}
      position={[0, LABEL_Y_OFFSET_M, 0]}
      planeSize={planeSize}
      yaws={ROOM_YAWS}
    />
  );
}

export function HallwayFloorLabel({ hallway }: { hallway: Hallway }) {
  const anchor = useMemo(() => hallwayLabelAnchor(hallway), [hallway]);

  const position = useMemo<[number, number, number] | null>(() => {
    if (!anchor) return null;
    return [
      anchor.xMm * MM_TO_M,
      LABEL_Y_OFFSET_M,
      anchor.zMm * MM_TO_M,
    ];
  }, [anchor]);

  const yaws = anchor?.axis === "x" ? HALLWAY_YAWS_X : HALLWAY_YAWS_Z;

  const planeSize = useMemo(() => {
    if (!anchor) return [0.28, 0.07] as [number, number];
    const { texture, aspect } = floorNameLabelTexture(
      hallway.name,
      labelColorForWallHex(FLOOR_COLOR),
    );
    void texture;
    const [width, height] = hallwayLabelFloorSizeM(
      hallway.widthMm,
      hallwayPathLengthMm(hallway),
      aspect,
    );
    return [Math.max(width, 0.24), Math.max(height, 0.06)] as [number, number];
  }, [anchor, hallway.name, hallway.widthMm, hallway.waypointsMm]);

  if (!position || !anchor || !hallway.name.trim()) return null;

  return (
    <FloorNameLabel
      name={hallway.name}
      position={position}
      planeSize={planeSize}
      yaws={yaws}
    />
  );
}
