import {
  Plane,
  Raycaster,
  Vector2,
  Vector3,
  type Camera,
  type Object3D,
} from "three";
import { worldPointToLocalMm } from "@/tools/room-coat/lib/editor-pointer";

const MM_TO_M = 0.001;
const floorPlane = new Plane(new Vector3(0, 1, 0), 0);
const hit = new Vector3();
const ndc = new Vector2();
const raycaster = new Raycaster();

export type MeasureViewportBridge = {
  camera: Camera | null;
  canvas: HTMLCanvasElement | null;
  /** Active floor island group — ray hits are converted into its local mm space. */
  floorLocalSpace: Object3D | null;
  setOrbitEnabled: ((enabled: boolean) => void) | null;
};

export const measureViewportBridge: MeasureViewportBridge = {
  camera: null,
  canvas: null,
  floorLocalSpace: null,
  setOrbitEnabled: null,
};

export function clientToFloorMm(
  clientX: number,
  clientY: number,
): { xMm: number; zMm: number } | null {
  const { camera, canvas, floorLocalSpace } = measureViewportBridge;
  if (!camera || !canvas) return null;

  const rect = canvas.getBoundingClientRect();
  ndc.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  raycaster.setFromCamera(ndc, camera);
  if (!raycaster.ray.intersectPlane(floorPlane, hit)) return null;

  if (floorLocalSpace) {
    return worldPointToLocalMm(hit.x, hit.z, floorLocalSpace);
  }

  return {
    xMm: Math.round(hit.x / MM_TO_M),
    zMm: Math.round(hit.z / MM_TO_M),
  };
}
