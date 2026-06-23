"use client";

import { useEffect, useMemo } from "react";
import type { Side } from "three";
import {
  createFloorFinishMap,
  updateFloorFinishMapRepeat,
} from "@/tools/room-coat/lib/floor-finish-texture";
import type { ResolvedFloorFinish } from "@/tools/room-coat/lib/resolve-floor-finish";

interface FloorFinishMaterialProps {
  finish: ResolvedFloorFinish;
  side: Side;
  emissive?: string;
  emissiveIntensity?: number;
  widthM: number;
  depthM: number;
}

export function FloorFinishMaterial({
  finish,
  side,
  emissive = "#000000",
  emissiveIntensity = 0,
  widthM,
  depthM,
}: FloorFinishMaterialProps) {
  const map = useMemo(
    () => createFloorFinishMap(finish),
    [finish.type, finish.variantId, finish.textureKind],
  );

  useEffect(() => {
    updateFloorFinishMapRepeat(map, widthM, depthM, finish);
  }, [map, widthM, depthM, finish]);

  return (
    <meshStandardMaterial
      color="#ffffff"
      map={map}
      roughness={finish.roughness}
      metalness={0}
      side={side}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );
}
