import { CanvasTexture, RepeatWrapping } from "three";
import type { PaintSurfaceTexture } from "@/tools/room-coat/types/state";

const textureCache = new Map<string, CanvasTexture>();

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function drawOrangePeel(
  ctx: CanvasRenderingContext2D,
  size: number,
  rgb: [number, number, number],
) {
  ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  ctx.fillRect(0, 0, size, size);
  for (let index = 0; index < 500; index += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 1 + Math.random() * 3;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.04 + Math.random() * 0.08})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(0, 0, 0, ${0.03 + Math.random() * 0.06})`;
    ctx.beginPath();
    ctx.arc(x + 1, y + 1, radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawKnockdown(
  ctx: CanvasRenderingContext2D,
  size: number,
  rgb: [number, number, number],
) {
  ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  ctx.fillRect(0, 0, size, size);
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const x = col * (size / 8) + Math.random() * 6;
      const y = row * (size / 8) + Math.random() * 6;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.05 + Math.random() * 0.07})`;
      ctx.fillRect(x, y, size / 8 - 2, size / 8 - 2);
    }
  }
}

export function createWallSurfaceMap(
  hex: string,
  texture: PaintSurfaceTexture,
): CanvasTexture | null {
  if (texture === "smooth") return null;
  const cacheKey = `${texture}:${hex}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const rgb = hexToRgb(hex);
  if (texture === "orange-peel") drawOrangePeel(ctx, size, rgb);
  if (texture === "knockdown") drawKnockdown(ctx, size, rgb);

  const map = new CanvasTexture(canvas);
  map.wrapS = RepeatWrapping;
  map.wrapT = RepeatWrapping;
  map.repeat.set(4, 4);
  textureCache.set(cacheKey, map);
  return map;
}
