import { CanvasTexture, RepeatWrapping } from "three";
import { floorGridCellSizeM } from "@/tools/room-coat/lib/units";
import type { UnitPreference } from "@/tools/room-coat/types/state";

let cachedTile: CanvasTexture | null = null;

function mod1(value: number): number {
  return value - Math.floor(value);
}

function gridTileTexture(): CanvasTexture {
  if (cachedTile) return cachedTile;

  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  cachedTile = texture;
  return texture;
}

export function createFloorGridOverlayMap(unit: UnitPreference): CanvasTexture {
  const map = gridTileTexture().clone();
  map.wrapS = RepeatWrapping;
  map.wrapT = RepeatWrapping;
  void unit;
  return map;
}

/** Align grid lines to world X/Z so hallway segments and rooms share one grid. */
export function updateFloorGridOverlayMap(
  map: CanvasTexture,
  widthM: number,
  depthM: number,
  centerWorldX: number,
  centerWorldZ: number,
  unit: UnitPreference,
): void {
  const cellM = floorGridCellSizeM(unit);
  map.repeat.set(
    Math.max(widthM / cellM, 1),
    Math.max(depthM / cellM, 1),
  );

  const x0 = centerWorldX - widthM / 2;
  const z0 = centerWorldZ + depthM / 2;
  map.offset.set(-mod1(x0 / cellM), -mod1(z0 / cellM));
}
