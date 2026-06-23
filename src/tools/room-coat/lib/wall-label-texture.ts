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
  const key = `name:v2:${text}:${color}`;
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

/** Crisp floor name — text with outline only, no pill background (avoids blur when scaled). */
export function floorNameLabelTexture(text: string, color: string): NameLabelTexture {
  const key = `floor-name:v1:${text}:${color}`;
  const cached = textureCache.get(key);
  if (cached) {
    const aspect = cached.image.width / cached.image.height;
    return { texture: cached, aspect };
  }

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  const fontSize = Math.min(
    44,
    Math.max(18, Math.round(340 / Math.max(text.length, 4))),
  );
  const font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  const strokeWidth = Math.max(2, Math.round(fontSize * 0.1));
  const padding = strokeWidth + 6;

  let width = 128;
  let height = 48;
  if (measureCtx) {
    measureCtx.font = font;
    const metrics = measureCtx.measureText(text);
    width = Math.ceil(metrics.width + padding * 2);
    height = Math.ceil(fontSize * 1.2 + padding * 2);
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

  ctx.clearRect(0, 0, width, height);
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(15, 23, 42, 0.92)";
  ctx.lineWidth = strokeWidth;
  ctx.strokeText(text, width / 2, height / 2);
  ctx.fillStyle = color;
  ctx.fillText(text, width / 2, height / 2);

  const texture = new CanvasTexture(canvas);
  texture.anisotropy = 8;
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

export function floorNameLabelPlaneSizeM(
  floorWidthM: number,
  floorLengthM: number,
  aspect: number,
): [number, number] {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 4;
  const maxWidth = Math.min(Math.max(floorWidthM, 0.8) * 0.52, 0.95);
  const maxHeight = Math.min(Math.max(floorLengthM, 0.8) * 0.2, 0.24);

  let planeWidth = maxWidth;
  let planeHeight = planeWidth / safeAspect;
  if (planeHeight > maxHeight) {
    planeHeight = maxHeight;
    planeWidth = planeHeight * safeAspect;
  }

  return [planeWidth, planeHeight];
}

export function measurementLabelTexture(text: string): NameLabelTexture {
  const key = `measure:v1:${text}`;
  const cached = textureCache.get(key);
  if (cached) {
    const aspect = cached.image.width / cached.image.height;
    return { texture: cached, aspect };
  }

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  const fontSize = Math.min(64, Math.max(24, Math.round(480 / Math.max(text.length, 6))));
  const font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;

  let width = 220;
  let height = 72;
  if (measureCtx) {
    measureCtx.font = font;
    const metrics = measureCtx.measureText(text);
    const paddingX = 20;
    const paddingY = 14;
    width = Math.ceil(metrics.width + paddingX * 2);
    height = Math.ceil(fontSize * 1.3 + paddingY);
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

  const radius = Math.min(14, height / 2 - 2);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
  ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(3, 3, width - 6, height - 6, radius);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#e0f2fe";
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

/** Readable floor label while drawing; width clamps to segment, height stays legible. */
export function floorSegmentMeasureLabelSizeM(
  segLenM: number,
  aspect: number,
): [number, number] {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 3;
  const minHeight = 0.14;
  const minWidth = 0.24;
  const maxWidth = Math.max(minWidth, segLenM - 0.08);

  let planeHeight = minHeight;
  let planeWidth = planeHeight * safeAspect;
  if (planeWidth > maxWidth) {
    planeWidth = maxWidth;
    planeHeight = Math.max(0.1, planeWidth / safeAspect);
  }

  return [
    Math.max(minWidth, planeWidth),
    Math.max(0.1, planeHeight),
  ];
}

export function wallMeasurementLabelSizeM(
  wallWidthM: number,
  wallHeightM: number,
  aspect: number,
): [number, number] {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 3;
  const paddingM = 0.05;
  const maxWidth = Math.max(0.1, wallWidthM - paddingM * 2);
  const maxHeight = Math.max(0.08, wallHeightM - paddingM * 2);

  let planeHeight = Math.min(0.22, wallHeightM * 0.16, maxHeight);
  let planeWidth = planeHeight * safeAspect;
  if (planeWidth > maxWidth) {
    planeWidth = maxWidth;
    planeHeight = planeWidth / safeAspect;
  }
  if (planeHeight > maxHeight) {
    planeHeight = maxHeight;
    planeWidth = planeHeight * safeAspect;
  }

  return [planeWidth, planeHeight];
}

export function clampWallLabelLocalCenter(
  localX: number,
  localY: number,
  wallWidthM: number,
  wallHeightM: number,
  labelWidthM: number,
  labelHeightM: number,
  paddingM = 0.05,
): [number, number] {
  const halfWallW = wallWidthM / 2;
  const halfWallH = wallHeightM / 2;
  const halfLabelW = labelWidthM / 2;
  const halfLabelH = labelHeightM / 2;

  if (labelWidthM >= wallWidthM - paddingM * 2) {
    localX = 0;
  } else {
    const minX = -halfWallW + paddingM + halfLabelW;
    const maxX = halfWallW - paddingM - halfLabelW;
    localX = Math.min(maxX, Math.max(minX, localX));
  }

  if (labelHeightM >= wallHeightM - paddingM * 2) {
    localY = 0;
  } else {
    const minY = -halfWallH + paddingM + halfLabelH;
    const maxY = halfWallH - paddingM - halfLabelH;
    localY = Math.min(maxY, Math.max(minY, localY));
  }

  return [localX, localY];
}
