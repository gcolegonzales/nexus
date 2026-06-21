import { CanvasTexture } from "three";

const textureCache = new Map<string, CanvasTexture>();

export function digitLabelTexture(label: string, color: string): CanvasTexture {
  const key = `${label}:${color}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const fallback = new CanvasTexture(canvas);
    textureCache.set(key, fallback);
    return fallback;
  }

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = color;
  ctx.font = "700 200px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, size / 2, size / 2 + 8);

  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

export function labelPlaneSizeM(
  wallWidthM: number,
  wallHeightM: number,
): number {
  return Math.min(0.28, wallWidthM * 0.14, wallHeightM * 0.07);
}
