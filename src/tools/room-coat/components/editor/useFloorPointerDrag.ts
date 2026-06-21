"use client";

import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useCallback } from "react";
import { Plane, Vector2, Vector3 } from "three";

const MM_TO_M = 0.001;
const floorPlane = new Plane(new Vector3(0, 1, 0), 0);
const hit = new Vector3();
const pointerNdc = new Vector2();

export interface FloorPointerDragCallbacks {
  onMove: (xMm: number, zMm: number) => void;
  onEnd: () => void;
}

export function useFloorPointerDrag(
  disableOrbit: () => void,
  enableOrbit: () => void,
) {
  const { camera, raycaster, gl } = useThree();

  return useCallback(
    (
      event: ThreeEvent<PointerEvent>,
      callbacks: FloorPointerDragCallbacks,
    ) => {
      event.stopPropagation();
      disableOrbit();

      const canvas = gl.domElement;
      const pointerId = event.nativeEvent.pointerId;
      canvas.setPointerCapture(pointerId);

      const readPointer = (clientX: number, clientY: number) => {
        const rect = canvas.getBoundingClientRect();
        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
        pointerNdc.set(ndcX, ndcY);
        raycaster.setFromCamera(pointerNdc, camera);
        if (raycaster.ray.intersectPlane(floorPlane, hit)) {
          callbacks.onMove(hit.x / MM_TO_M, hit.z / MM_TO_M);
        }
      };

      const onPointerMove = (nativeEvent: PointerEvent) => {
        nativeEvent.preventDefault();
        readPointer(nativeEvent.clientX, nativeEvent.clientY);
      };

      const onPointerUp = (nativeEvent: PointerEvent) => {
        nativeEvent.preventDefault();
        canvas.releasePointerCapture(nativeEvent.pointerId);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerup", onPointerUp);
        canvas.removeEventListener("pointercancel", onPointerUp);
        enableOrbit();
        callbacks.onEnd();
      };

      canvas.addEventListener("pointermove", onPointerMove);
      canvas.addEventListener("pointerup", onPointerUp);
      canvas.addEventListener("pointercancel", onPointerUp);
      readPointer(event.nativeEvent.clientX, event.nativeEvent.clientY);
    },
    [camera, disableOrbit, enableOrbit, gl.domElement, raycaster],
  );
}
