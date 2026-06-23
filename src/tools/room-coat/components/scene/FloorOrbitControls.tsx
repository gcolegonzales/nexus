"use client";

import { OrbitControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useRef, type ComponentProps } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  orbitDistanceLimitsFromView,
  type FloorCameraView,
} from "@/tools/room-coat/lib/room-geometry";

type FloorOrbitControlsProps = Omit<
  ComponentProps<typeof OrbitControls>,
  "target" | "minDistance" | "maxDistance"
> & {
  initialView: FloorCameraView;
  /** When this changes, camera framing resets to `initialView`. */
  resetKey: string;
};

export function FloorOrbitControls({
  initialView,
  resetKey,
  maxPolarAngle = Math.PI / 2.05,
  ...props
}: FloorOrbitControlsProps) {
  const camera = useThree((state) => state.camera);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const initialViewRef = useRef(initialView);
  initialViewRef.current = initialView;

  const { minDistance, maxDistance } = orbitDistanceLimitsFromView(initialView);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const view = initialViewRef.current;
    controls.target.set(...view.target);
    camera.position.set(...view.position);
    camera.updateProjectionMatrix();
    controls.update();
  }, [resetKey, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      maxPolarAngle={maxPolarAngle}
      minDistance={minDistance}
      maxDistance={maxDistance}
      zoomToCursor
      zoomSpeed={1.2}
      {...props}
    />
  );
}
