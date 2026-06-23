import { CanvasTexture, RepeatWrapping } from "three";
import type { ResolvedFloorFinish } from "@/tools/room-coat/lib/resolve-floor-finish";

const textureCache = new Map<string, CanvasTexture>();
const TEXTURE_SIZE = 256;

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function mixRgb(
  base: [number, number, number],
  tint: [number, number, number],
  amount: number,
): [number, number, number] {
  return [
    Math.round(base[0] * (1 - amount) + tint[0] * amount),
    Math.round(base[1] * (1 - amount) + tint[1] * amount),
    Math.round(base[2] * (1 - amount) + tint[2] * amount),
  ];
}

function seededRandom(seed: string): () => number {
  let state = 0;
  for (let index = 0; index < seed.length; index += 1) {
    state = (state * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function fillBase(
  ctx: CanvasRenderingContext2D,
  size: number,
  rgb: [number, number, number],
) {
  ctx.fillStyle = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  ctx.fillRect(0, 0, size, size);
}

function drawPlankSegment(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  rgb: [number, number, number],
  seed: number,
  rng: () => number,
) {
  if (height < 4 || width < 4) return;
  const shade = mixRgb(rgb, seed % 2 === 0 ? [255, 255, 255] : [0, 0, 0], 0.06);
  ctx.fillStyle = `rgb(${shade[0]}, ${shade[1]}, ${shade[2]})`;
  ctx.fillRect(x + 1, y + 1, width - 2, height - 2);

  const streakCount = Math.max(2, Math.floor(width / 18));
  for (let streak = 0; streak < streakCount; streak += 1) {
    const streakX = x + 4 + streak * ((width - 8) / streakCount);
    const tone = mixRgb(shade, [0, 0, 0], 0.06 + rng() * 0.08);
    ctx.fillStyle = `rgba(${tone[0]}, ${tone[1]}, ${tone[2]}, 0.35)`;
    ctx.fillRect(streakX, y + 2, 1.5, height - 4);
  }
}

/** Staggered strip-plank layout — grain runs along plank length (texture height). */
function drawWoodPlank(
  ctx: CanvasRenderingContext2D,
  size: number,
  rgb: [number, number, number],
  rng: () => number,
  planksPerTile: number,
) {
  fillBase(ctx, size, rgb);
  const gap = 4;
  const plankW = (size - gap * (planksPerTile - 1)) / planksPerTile;

  for (let plank = 0; plank < planksPerTile; plank += 1) {
    const x = plank * (plankW + gap);
    const jointA = (0.22 + (plank * 0.19) % 0.45 + rng() * 0.08) * size;
    const jointB = (0.58 + (plank * 0.23) % 0.35 + rng() * 0.08) * size;

    const joints = [0, jointA, jointB, size].sort((a, b) => a - b);
    for (let segment = 0; segment < joints.length - 1; segment += 1) {
      const y0 = joints[segment]!;
      const y1 = joints[segment + 1]!;
      drawPlankSegment(
        ctx,
        x,
        y0,
        plankW,
        y1 - y0,
        rgb,
        plank + segment,
        rng,
      );
    }

    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.fillRect(x + plankW, 0, gap, size);
  }
}

function drawSmooth(
  ctx: CanvasRenderingContext2D,
  size: number,
  rgb: [number, number, number],
  rng: () => number,
) {
  fillBase(ctx, size, rgb);
  const darker = mixRgb(rgb, [0, 0, 0], 0.14);
  for (let index = 0; index < 320; index += 1) {
    const tone = rng() > 0.5 ? darker : mixRgb(rgb, [255, 255, 255], 0.08);
    ctx.fillStyle = `rgba(${tone[0]}, ${tone[1]}, ${tone[2]}, ${0.1 + rng() * 0.18})`;
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, 0.5 + rng() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTileGrid(
  ctx: CanvasRenderingContext2D,
  size: number,
  rgb: [number, number, number],
  rng: () => number,
) {
  const tileCount = 1;
  const tileSize = size / tileCount;
  const grout = mixRgb(rgb, [0, 0, 0], 0.32);
  ctx.fillStyle = `rgb(${grout[0]}, ${grout[1]}, ${grout[2]})`;
  ctx.fillRect(0, 0, size, size);

  for (let row = 0; row < tileCount; row += 1) {
    for (let col = 0; col < tileCount; col += 1) {
      const shade = mixRgb(rgb, [255, 255, 255], 0.03 + rng() * 0.04);
      ctx.fillStyle = `rgb(${shade[0]}, ${shade[1]}, ${shade[2]})`;
      ctx.fillRect(
        col * tileSize + 3,
        row * tileSize + 3,
        tileSize - 6,
        tileSize - 6,
      );
    }
  }

  ctx.strokeStyle = `rgba(${grout[0]}, ${grout[1]}, ${grout[2]}, 0.95)`;
  ctx.lineWidth = 2;
  for (let index = 0; index <= tileCount; index += 1) {
    const offset = index * tileSize + 0.5;
    ctx.beginPath();
    ctx.moveTo(offset, 0);
    ctx.lineTo(offset, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, offset);
    ctx.lineTo(size, offset);
    ctx.stroke();
  }
}

function drawCarpetWeave(
  ctx: CanvasRenderingContext2D,
  size: number,
  rgb: [number, number, number],
  rng: () => number,
) {
  fillBase(ctx, size, rgb);
  const darker = mixRgb(rgb, [0, 0, 0], 0.22);
  for (let index = 0; index < 700; index += 1) {
    const tone = rng() > 0.5 ? darker : mixRgb(rgb, [255, 255, 255], 0.12);
    const x = rng() * size;
    const y = rng() * size;
    ctx.fillStyle = `rgba(${tone[0]}, ${tone[1]}, ${tone[2]}, ${0.2 + rng() * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + rng() * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStoneSpeckle(
  ctx: CanvasRenderingContext2D,
  size: number,
  rgb: [number, number, number],
  rng: () => number,
) {
  fillBase(ctx, size, rgb);
  for (let index = 0; index < 280; index += 1) {
    const tone = mixRgb(
      rgb,
      rng() > 0.5 ? [255, 255, 255] : [0, 0, 0],
      0.1 + rng() * 0.2,
    );
    ctx.fillStyle = `rgba(${tone[0]}, ${tone[1]}, ${tone[2]}, ${0.35 + rng() * 0.4})`;
    ctx.beginPath();
    ctx.arc(rng() * size, rng() * size, 0.5 + rng() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTexturePattern(
  ctx: CanvasRenderingContext2D,
  size: number,
  finish: Pick<
    ResolvedFloorFinish,
    "textureKind" | "hex" | "type" | "variantId" | "planksPerTile"
  >,
) {
  const rgb = hexToRgb(finish.hex);
  const rng = seededRandom(`${finish.type}:${finish.variantId}:${finish.textureKind}:v3`);
  switch (finish.textureKind) {
    case "smooth":
      drawSmooth(ctx, size, rgb, rng);
      break;
    case "wood-plank":
      drawWoodPlank(ctx, size, rgb, rng, finish.planksPerTile ?? 4);
      break;
    case "tile-grid":
      drawTileGrid(ctx, size, rgb, rng);
      break;
    case "carpet-weave":
      drawCarpetWeave(ctx, size, rgb, rng);
      break;
    case "stone-speckle":
      drawStoneSpeckle(ctx, size, rgb, rng);
      break;
  }
}

export function createFloorFinishMap(finish: ResolvedFloorFinish): CanvasTexture {
  const cacheKey = `${finish.type}:${finish.variantId}:${finish.textureKind}:v3`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    drawTexturePattern(ctx, TEXTURE_SIZE, finish);
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  textureCache.set(cacheKey, texture);
  return texture;
}

export function updateFloorFinishMapRepeat(
  map: CanvasTexture,
  widthM: number,
  depthM: number,
  finish: ResolvedFloorFinish,
): void {
  if (finish.textureKind === "wood-plank") {
    const plankW = finish.plankWidthM ?? 0.15;
    const plankL = finish.plankLengthM ?? 1.22;
    const planksPerTile = finish.planksPerTile ?? 4;
    map.repeat.set(
      Math.max(widthM / (plankW * planksPerTile), 1),
      Math.max(depthM / plankL, 1),
    );
  } else {
    map.repeat.set(
      Math.max(widthM / finish.cellSizeM, 1),
      Math.max(depthM / finish.cellSizeM, 1),
    );
  }
  map.needsUpdate = true;
}
