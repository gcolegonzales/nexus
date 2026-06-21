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

export interface NameLabelTexture {
  texture: CanvasTexture;
  aspect: number;
}

export function nameLabelTexture(text: string, color: string): NameLabelTexture {
  const key = `name:${text}:${color}`;
  const cached = textureCache.get(key);
  if (cached) {
    const aspect = cached.image.width / cached.image.height;
    return { texture: cached, aspect };
  }

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  const fontSize = Math.min(72, Math.max(28, Math.round(520 / Math.max(text.length, 4))));
  const font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;

  let width = 256;
  let height = 96;
  if (measureCtx) {
    measureCtx.font = font;
    const metrics = measureCtx.measureText(text);
    const paddingX = 28;
    const paddingY = 16;
    width = Math.ceil(metrics.width + paddingX * 2);
    height = Math.ceil(fontSize * 1.35 + paddingY);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const fallback = new CanvasTexture(canvas);
    textureCache.set(key, fallback);
    return { texture: fallback, aspect: width / height };
  }

  const radius = Math.min(18, height / 2 - 2);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
  ctx.beginPath();
  ctx.roundRect(4, 4, width - 8, height - 8, radius);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2 + 1);

  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return { texture, aspect: width / height };
}

export function floorLabelPlaneSizeM(
  floorWidthM: number,
  floorLengthM: number,
  aspect: number,
): [number, number] {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 4;
  const maxWidth = Math.min(Math.max(floorWidthM, 0.8) * 0.82, 1.8);
  const maxHeight = Math.min(Math.max(floorLengthM, 0.8) * 0.38, 0.65);

  let planeWidth = maxWidth;
  let planeHeight = planeWidth / safeAspect;
  if (planeHeight > maxHeight) {
    planeHeight = maxHeight;
    planeWidth = planeHeight * safeAspect;
  }

  return [planeWidth, planeHeight];
}
