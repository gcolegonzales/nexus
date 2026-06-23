"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { Vector3 } from "three";
import { EDITOR_CHROME_MEASUREMENT, EDITOR_Z_SCENE_HTML } from "@/tools/room-coat/components/editor/editor-chrome";
import { positionMeasurementLabelAnchor, MEASUREMENT_LABEL_SCREEN_OFFSET_PX } from "@/tools/room-coat/lib/surface-measurement-anchor";
import type { SurfaceMeshSpec } from "@/tools/room-coat/lib/room-geometry";

interface SurfaceMeasurementLabelProps {
  spec: SurfaceMeshSpec;
  text: string;
  anchorWorldM?: [number, number, number];
  emphasis?: "hover" | "selected";
}

export function SurfaceMeasurementLabel({
  spec,
  text,
  anchorWorldM,
}: SurfaceMeasurementLabelProps) {
  const anchorRef = useRef<Group>(null);
  const scratch = useMemo(() => new Vector3(), []);
  const pointerLocal = useMemo(() => new Vector3(), []);

  useFrame(({ camera }) => {
    const anchor = anchorRef.current;
    if (!anchor?.parent) return;

    let localPointer: Vector3 | null = null;
    if (anchorWorldM) {
      pointerLocal.set(anchorWorldM[0], anchorWorldM[1], anchorWorldM[2]);
      anchor.parent.worldToLocal(pointerLocal);
      localPointer = pointerLocal;
    }

    positionMeasurementLabelAnchor(
      anchor.position,
      spec,
      camera.position,
      scratch,
      localPointer,
    );
  });

  return (
    <group ref={anchorRef}>
      <Html
        center
        zIndexRange={[EDITOR_Z_SCENE_HTML, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          className={EDITOR_CHROME_MEASUREMENT}
          style={{
            transform: `translateY(calc(-35% - ${MEASUREMENT_LABEL_SCREEN_OFFSET_PX}px))`,
          }}
        >
          {text}
        </div>
      </Html>
    </group>
  );
}
