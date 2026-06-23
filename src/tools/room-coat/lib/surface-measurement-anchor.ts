import { Euler, Quaternion, Vector3 } from "three";
import type { SurfaceMeshSpec } from "@/tools/room-coat/lib/room-geometry";

const HORIZONTAL_LIFT_M = 0.12;
const WALL_CAMERA_OUTSET_M = 0.06;
/** Raise the anchor above the pointer hit on the surface plane. */
const CURSOR_CLEARANCE_WALL_LOCAL_M = 0.08;
const CURSOR_CLEARANCE_WORLD_Y_M = 0.02;
/** Screen-space gap between pointer and label (px). */
export const MEASUREMENT_LABEL_SCREEN_OFFSET_PX = 8;
const WALL_DIGIT_RESERVE_HALF_W_M = 0.14;
const WALL_DIGIT_RESERVE_HALF_H_M = 0.14;
const WALL_DIGIT_RESERVE_BELOW_M = 0.06;
const FLOOR_NAME_CLEARANCE_M = 0.2;
const WALL_EDGE_INSET_M = 0.06;

const _wallLocal = new Vector3();
const _wallRot = new Quaternion();
const _wallRotInv = new Quaternion();

function wallLocalFromWorld(
  worldPoint: Vector3,
  spec: SurfaceMeshSpec,
  out: Vector3,
): void {
  out
    .copy(worldPoint)
    .sub(_wallLocal.set(spec.position[0], spec.position[1], spec.position[2]));
  _wallRot.setFromEuler(new Euler(...spec.rotation));
  _wallRotInv.copy(_wallRot).invert();
  out.applyQuaternion(_wallRotInv);
}

function wallWorldFromLocal(
  localPoint: Vector3,
  spec: SurfaceMeshSpec,
  out: Vector3,
): void {
  out.copy(localPoint);
  _wallRot.setFromEuler(new Euler(...spec.rotation));
  out.applyQuaternion(_wallRot);
  out.add(_wallLocal.set(spec.position[0], spec.position[1], spec.position[2]));
}

function avoidFloorNameOverlap(out: Vector3, spec: SurfaceMeshSpec): void {
  const nameX = spec.position[0];
  const nameZ = spec.position[2];
  const dx = out.x - nameX;
  const dz = out.z - nameZ;
  const dist = Math.hypot(dx, dz);

  if (dist >= FLOOR_NAME_CLEARANCE_M) return;

  if (dist > 1e-4) {
    const push = (FLOOR_NAME_CLEARANCE_M - dist) / dist;
    out.x += dx * push;
    out.z += dz * push;
    return;
  }

  out.x += FLOOR_NAME_CLEARANCE_M;
  out.z += FLOOR_NAME_CLEARANCE_M * 0.65;
}

function avoidWallDigitOverlap(
  out: Vector3,
  spec: SurfaceMeshSpec,
  scratch: Vector3,
): void {
  wallLocalFromWorld(out, spec, scratch);

  const halfW = spec.size[0] / 2 - WALL_EDGE_INSET_M;
  const halfH = spec.size[1] / 2 - WALL_EDGE_INSET_M;
  if (halfW <= 0 || halfH <= 0) return;

  const inDigitZone =
    Math.abs(scratch.x) < WALL_DIGIT_RESERVE_HALF_W_M &&
    Math.abs(scratch.y) < WALL_DIGIT_RESERVE_HALF_H_M;

  if (inDigitZone) {
    scratch.y = Math.min(
      scratch.y,
      -WALL_DIGIT_RESERVE_HALF_H_M - WALL_DIGIT_RESERVE_BELOW_M,
    );
  }

  scratch.x = Math.max(-halfW, Math.min(halfW, scratch.x));
  scratch.y = Math.max(-halfH, Math.min(halfH, scratch.y));

  wallWorldFromLocal(scratch, spec, out);
}

function liftAbovePointerHit(
  out: Vector3,
  spec: SurfaceMeshSpec,
  scratch: Vector3,
): void {
  if (spec.category === "wall" || spec.category === "door" || spec.category === "window") {
    wallLocalFromWorld(out, spec, scratch);
    scratch.y += CURSOR_CLEARANCE_WALL_LOCAL_M;
    const halfH = spec.size[1] / 2 - WALL_EDGE_INSET_M;
    if (halfH > 0) scratch.y = Math.min(scratch.y, halfH);
    wallWorldFromLocal(scratch, spec, out);
    return;
  }

  out.y += CURSOR_CLEARANCE_WORLD_Y_M;
}

function applyCameraOutset(
  out: Vector3,
  spec: SurfaceMeshSpec,
  cameraPosition: Vector3,
  scratch: Vector3,
): void {
  if (spec.category === "floor" || spec.category === "ceiling") return;

  scratch.copy(cameraPosition).sub(out);
  if (scratch.lengthSq() > 1e-8) {
    scratch.normalize();
  } else {
    scratch.set(0, 0, 1);
  }
  out.addScaledVector(scratch, WALL_CAMERA_OUTSET_M);
}

function finalizeHorizontalAnchor(out: Vector3, spec: SurfaceMeshSpec): void {
  const baseY =
    spec.category === "floor" ? spec.position[1] : spec.position[1];
  out.y = Math.max(out.y, baseY) + HORIZONTAL_LIFT_M;
  avoidFloorNameOverlap(out, spec);
}

function fallbackAnchor(out: Vector3, spec: SurfaceMeshSpec, scratch: Vector3): void {
  out.set(spec.position[0], spec.position[1], spec.position[2]);

  if (spec.category === "floor" || spec.category === "ceiling") {
    finalizeHorizontalAnchor(out, spec);
    return;
  }

  if (spec.category === "wall" || spec.category === "door" || spec.category === "window") {
    avoidWallDigitOverlap(out, spec, scratch);
  }
}

/**
 * Place a measurement Html anchor near the pointer when available, nudging only
 * enough to avoid wall digits and floor room names.
 */
export function positionMeasurementLabelAnchor(
  out: Vector3,
  spec: SurfaceMeshSpec,
  cameraPosition: Vector3,
  scratch: Vector3,
  pointerLocalM?: Vector3 | null,
): void {
  if (pointerLocalM) {
    out.copy(pointerLocalM);

    if (spec.category === "floor" || spec.category === "ceiling") {
      finalizeHorizontalAnchor(out, spec);
      liftAbovePointerHit(out, spec, scratch);
    } else if (spec.category === "wall" || spec.category === "door" || spec.category === "window") {
      avoidWallDigitOverlap(out, spec, scratch);
      liftAbovePointerHit(out, spec, scratch);
      applyCameraOutset(out, spec, cameraPosition, scratch);
    } else {
      liftAbovePointerHit(out, spec, scratch);
      applyCameraOutset(out, spec, cameraPosition, scratch);
    }
    return;
  }

  fallbackAnchor(out, spec, scratch);
  applyCameraOutset(out, spec, cameraPosition, scratch);
}
