"use client";

import { useMemo } from "react";
import type { Side } from "three";
import { createWallSurfaceMap } from "@/tools/room-coat/lib/wall-surface-texture";
import type { Paint } from "@/tools/room-coat/types/state";

interface PaintSurfaceMaterialProps {
  color: string;
  paint: Paint | null;
  side: Side;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
}

export function PaintSurfaceMaterial({
  color,
  paint,
  side,
  roughness = 0.88,
  emissive = "#000000",
  emissiveIntensity = 0,
}: PaintSurfaceMaterialProps) {
  const textureKind = paint?.surfaceTexture ?? "smooth";
  const map = useMemo(
    () =>
      textureKind !== "smooth" && paint
        ? createWallSurfaceMap(paint.hex, textureKind)
        : null,
    [paint, textureKind],
  );

  return (
    <meshStandardMaterial
      color={map ? "#ffffff" : color}
      map={map}
      roughness={roughness}
      metalness={0}
      side={side}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );
}
