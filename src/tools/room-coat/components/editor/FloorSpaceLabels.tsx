"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { DoubleSide } from "three";
import {
  hallwayFloorLabelYaw,
  hallwayLabelAnchor,
  hallwayLabelFloorSizeM,
  hallwayPathLengthMm,
  snapRoomFloorLabelYaw,
} from "@/tools/room-coat/lib/floor-space-labels";
import { labelColorForWallHex } from "@/tools/room-coat/lib/wall-label-color";
import {
  floorLabelPlaneSizeM,
  nameLabelTexture,
} from "@/tools/room-coat/lib/wall-label-texture";
import type { Hallway, PlacedRoom } from "@/tools/room-coat/types/state";

const FLOOR_COLOR = "#64748b";
const LABEL_Y_OFFSET_M = 0.035;
const MM_TO_M = 0.001;

function FloorNameLabelMesh({
  name,
  position,
  planeSize,
  resolveYaw,
}: {
  name: string;
  position: [number, number, number];
  planeSize: [number, number];
  resolveYaw: (cameraX: number, cameraZ: number) => number;
}) {
  const yawRef = useRef<Group>(null);
  const camera = useThree((state) => state.camera);
  const textColor = labelColorForWallHex(FLOOR_COLOR);
  const { texture } = useMemo(
    () => nameLabelTexture(name, textColor),
    [name, textColor],
  );

  useFrame(() => {
    const yawGroup = yawRef.current;
    if (!yawGroup) return;
    yawGroup.rotation.y = resolveYaw(camera.position.x, camera.position.z);
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
            side={DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

export function RoomFloorLabel({
  room,
  worldOffset,
}: {
  room: PlacedRoom;
  worldOffset: [number, number, number];
}) {
  const position = useMemo<[number, number, number]>(
    () => [0, LABEL_Y_OFFSET_M, 0],
    [],
  );
  const planeSize = useMemo(() => {
    const { texture, aspect } = nameLabelTexture(
      room.name,
      labelColorForWallHex(FLOOR_COLOR),
    );
    void texture;
    const [width, height] = floorLabelPlaneSizeM(
      room.widthMm * MM_TO_M,
      room.lengthMm * MM_TO_M,
      aspect,
    );
    return [Math.max(width, 0.45), Math.max(height, 0.12)] as [number, number];
  }, [room.name, room.widthMm, room.lengthMm]);

  const resolveYaw = useMemo(() => {
    const worldX = worldOffset[0] + position[0];
    const worldZ = worldOffset[2] + position[2];
    return (cameraX: number, cameraZ: number) =>
      snapRoomFloorLabelYaw(worldX, worldZ, cameraX, cameraZ);
  }, [position, worldOffset]);

  if (!room.name.trim()) return null;

  return (
    <FloorNameLabelMesh
      name={room.name}
      position={position}
      planeSize={planeSize}
      resolveYaw={resolveYaw}
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

  const planeSize = useMemo(() => {
    if (!anchor) return [0.45, 0.12] as [number, number];
    const { texture, aspect } = nameLabelTexture(
      hallway.name,
      labelColorForWallHex(FLOOR_COLOR),
    );
    void texture;
    const [width, height] = hallwayLabelFloorSizeM(
      hallway.widthMm,
      hallwayPathLengthMm(hallway),
      aspect,
    );
    return [Math.max(width, 0.35), Math.max(height, 0.1)] as [number, number];
  }, [anchor, hallway.name, hallway.widthMm, hallway.waypointsMm]);

  const resolveYaw = useMemo(() => {
    if (!anchor || !position) {
      return () => 0;
    }

    return (cameraX: number, cameraZ: number) =>
      hallwayFloorLabelYaw(
        anchor.axis,
        position[0],
        position[2],
        cameraX,
        cameraZ,
      );
  }, [anchor, position]);

  if (!position || !anchor || !hallway.name.trim()) return null;

  return (
    <FloorNameLabelMesh
      name={hallway.name}
      position={position}
      planeSize={planeSize}
      resolveYaw={resolveYaw}
    />
  );
}
