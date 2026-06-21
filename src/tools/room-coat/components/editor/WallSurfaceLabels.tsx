"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { Euler, FrontSide, Vector3 } from "three";
import type { SurfaceMeshSpec } from "@/tools/room-coat/lib/room-geometry";
import {
  buildSurfacesForHallway,
  buildSurfacesForPlacedRoom,
} from "@/tools/room-coat/lib/build-surfaces";
import {
  resolveSurfacePaint,
  UNSET_PAINT_HEX,
} from "@/tools/room-coat/lib/resolve-paint";
import { labelColorForWallHex } from "@/tools/room-coat/lib/wall-label-color";
import {
  digitLabelTexture,
  labelPlaneSizeM,
} from "@/tools/room-coat/lib/wall-label-texture";
import {
  wallLabelKey,
  wallLabelTextForSurfaceId,
} from "@/tools/room-coat/lib/wall-surface-labels";
import type { Hallway, Paint, PlacedRoom, RoomCoat } from "@/tools/room-coat/types/state";

const DEFAULT_WALL_HEX = "#64748b";
const LABEL_OFFSET_M = 0.005;

/** One label per logical wall — largest mesh segment when a wall is split by openings. */
function labelSpecsForWalls(specs: SurfaceMeshSpec[]): SurfaceMeshSpec[] {
  const bestByKey = new Map<string, SurfaceMeshSpec>();

  for (const spec of specs) {
    if (spec.category !== "wall") continue;
    const key = wallLabelKey(spec.surfaceId);
    if (!key) continue;

    const area = spec.size[0] * spec.size[1];
    const existing = bestByKey.get(key);
    if (!existing || area > existing.size[0] * existing.size[1]) {
      bestByKey.set(key, spec);
    }
  }

  return [...bestByKey.values()];
}

function WallLabelMesh({
  spec,
  label,
  wallHex,
}: {
  spec: SurfaceMeshSpec;
  label: string;
  wallHex: string;
}) {
  const groupRef = useRef<Group>(null);
  const camera = useThree((state) => state.camera);
  const basePosition = useMemo(
    () => new Vector3(...spec.position),
    [spec.position],
  );
  const wallNormal = useMemo(() => {
    const normal = new Vector3(0, 0, 1);
    normal.applyEuler(new Euler(...spec.rotation));
    return normal;
  }, [spec.rotation]);
  const toCamera = useMemo(() => new Vector3(), []);

  const textColor = labelColorForWallHex(wallHex);
  const texture = useMemo(
    () => digitLabelTexture(label, textColor),
    [label, textColor],
  );
  const planeSize = labelPlaneSizeM(spec.size[0], spec.size[1]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    toCamera.copy(camera.position).sub(basePosition);
    const onFrontFace = toCamera.dot(wallNormal) >= 0;

    group.position
      .copy(basePosition)
      .addScaledVector(wallNormal, onFrontFace ? LABEL_OFFSET_M : -LABEL_OFFSET_M);
    group.rotation.set(
      spec.rotation[0],
      spec.rotation[1] + (onFrontFace ? 0 : Math.PI),
      spec.rotation[2],
    );
  });

  return (
    <group ref={groupRef}>
      <mesh raycast={() => null}>
        <planeGeometry args={[planeSize, planeSize]} />
        <meshBasicMaterial
          map={texture}
          transparent
          alphaTest={0.15}
          depthTest
          depthWrite
          toneMapped={false}
          side={FrontSide}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
    </group>
  );
}

export function WallSurfaceLabels({
  specs,
  space,
  paints,
  unitDefaultCoat,
}: {
  specs: SurfaceMeshSpec[];
  space: PlacedRoom | Hallway;
  paints: Paint[];
  unitDefaultCoat?: RoomCoat;
}) {
  const isRoom = "placementId" in space;
  const hallway = isRoom ? undefined : space;

  const surfaceMap = useMemo(() => {
    const surfaces = isRoom
      ? buildSurfacesForPlacedRoom(space)
      : buildSurfacesForHallway(space);
    return new Map(surfaces.map((surface) => [surface.id, surface]));
  }, [space, isRoom]);

  const wallSpecs = useMemo(() => labelSpecsForWalls(specs), [specs]);

  return (
    <>
      {wallSpecs.map((spec) => {
        const label = wallLabelTextForSurfaceId(spec.surfaceId, hallway);
        if (!label) return null;

        const surface = surfaceMap.get(spec.surfaceId);
        const wallHex = surface
          ? resolveSurfacePaint(space, surface, paints, unitDefaultCoat).hex
          : UNSET_PAINT_HEX;

        return (
          <WallLabelMesh
            key={`label:${spec.surfaceId}:${label}`}
            spec={spec}
            label={label}
            wallHex={wallHex === UNSET_PAINT_HEX ? DEFAULT_WALL_HEX : wallHex}
          />
        );
      })}
    </>
  );
}
