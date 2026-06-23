import type { ThreeEvent } from "@react-three/fiber";
import { Vector3, type Object3D } from "three";

const MM_TO_M = 0.001;
const _localPoint = new Vector3();

/** Raycast hit (world space) → mm in the given object's local XZ plane. */
export function pointerEventToLocalMm(
  event: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>,
  localSpace: Object3D,
): { xMm: number; zMm: number } {
  _localPoint.copy(event.point);
  localSpace.worldToLocal(_localPoint);
  return {
    xMm: Math.round(_localPoint.x / MM_TO_M),
    zMm: Math.round(_localPoint.z / MM_TO_M),
  };
}

/** World XZ (meters) → mm in the given object's local XZ plane. */
export function worldPointToLocalMm(
  worldXM: number,
  worldZM: number,
  localSpace: Object3D,
): { xMm: number; zMm: number } {
  _localPoint.set(worldXM, 0, worldZM);
  localSpace.worldToLocal(_localPoint);
  return {
    xMm: Math.round(_localPoint.x / MM_TO_M),
    zMm: Math.round(_localPoint.z / MM_TO_M),
  };
}

/** Screen-space pointer position for HTML overlays over the canvas. */export function clientPointFromPointerEvent(
  event: MouseEvent | ThreeEvent<MouseEvent>,
  canvas?: HTMLCanvasElement | null,
): { clientX: number; clientY: number } {
  if ("nativeEvent" in event) {
    const native = event.nativeEvent;
    if (Number.isFinite(native.clientX) && Number.isFinite(native.clientY)) {
      return { clientX: native.clientX, clientY: native.clientY };
    }
    const target = canvas ?? (native.target as HTMLCanvasElement | null);
    if (target) {
      const rect = target.getBoundingClientRect();
      return {
        clientX: rect.left + native.offsetX,
        clientY: rect.top + native.offsetY,
      };
    }
    return { clientX: event.clientX, clientY: event.clientY };
  }

  if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    return { clientX: event.clientX, clientY: event.clientY };
  }

  const target = canvas ?? (event.target as HTMLCanvasElement | null);
  if (target) {
    const rect = target.getBoundingClientRect();
    return {
      clientX: rect.left + event.offsetX,
      clientY: rect.top + event.offsetY,
    };
  }

  return { clientX: 0, clientY: 0 };
}
