export type FloorFinishType =
  | "concrete"
  | "hardwood"
  | "engineered-wood"
  | "laminate"
  | "tile"
  | "carpet"
  | "vinyl"
  | "stone";

export type FloorFinishTextureKind =
  | "smooth"
  | "wood-plank"
  | "tile-grid"
  | "carpet-weave"
  | "stone-speckle";

export interface FloorFinishVariant {
  id: string;
  label: string;
  hex: string;
}

export interface FloorFinishProductInfo {
  material: string;
  /** Typical plank width for wood/laminate/vinyl, mm. */
  plankWidthMm?: number;
  /** Typical plank length before end joint, mm. */
  plankLengthMm?: number;
  /** Square tile edge length, mm. */
  tileSizeMm?: number;
  wearLayer?: string;
  finishSheen?: string;
  installation?: string;
  suitableFor?: string[];
  notes?: string;
}

export interface FloorFinishDefinition {
  type: FloorFinishType;
  label: string;
  textureKind: FloorFinishTextureKind;
  roughness: number;
  cellSizeM: number;
  /** Planks drawn across texture width (wood types). */
  planksPerTile?: number;
  plankWidthM?: number;
  plankLengthM?: number;
  productInfo: FloorFinishProductInfo;
  variants: FloorFinishVariant[];
}

export const DEFAULT_FLOOR_FINISH_TYPE: FloorFinishType = "concrete";
export const DEFAULT_FLOOR_FINISH_VARIANT_ID = "light-gray";

export const FLOOR_FINISH_CATALOG: FloorFinishDefinition[] = [
  {
    type: "concrete",
    label: "Concrete",
    textureKind: "smooth",
    roughness: 0.92,
    cellSizeM: 1.2,
    productInfo: {
      material: "Polished concrete",
      finishSheen: "Matte",
      installation: "Poured / ground",
      suitableFor: ["Basement", "Modern living", "Commercial"],
    },
    variants: [
      { id: "light-gray", label: "Light gray", hex: "#94a3b8" },
      { id: "warm-gray", label: "Warm gray", hex: "#78716c" },
      { id: "charcoal", label: "Charcoal", hex: "#57534e" },
    ],
  },
  {
    type: "hardwood",
    label: "Hardwood",
    textureKind: "wood-plank",
    roughness: 0.55,
    cellSizeM: 0.6,
    planksPerTile: 4,
    plankWidthM: 0.152,
    plankLengthM: 1.22,
    productInfo: {
      material: "Solid hardwood",
      plankWidthMm: 152,
      plankLengthMm: 1220,
      finishSheen: "Satin urethane",
      installation: "Nail / glue down",
      suitableFor: ["Living room", "Bedroom", "Hallway"],
      notes: "3¼″ wide planks, random staggered lengths.",
    },
    variants: [
      { id: "natural-oak", label: "Natural oak", hex: "#c4a574" },
      { id: "walnut", label: "Walnut", hex: "#6b5344" },
      { id: "maple", label: "Maple", hex: "#ddb892" },
      { id: "cherry", label: "Cherry", hex: "#914421" },
    ],
  },
  {
    type: "engineered-wood",
    label: "Engineered wood",
    textureKind: "wood-plank",
    roughness: 0.6,
    cellSizeM: 0.55,
    planksPerTile: 4,
    plankWidthM: 0.127,
    plankLengthM: 1.22,
    productInfo: {
      material: "Engineered hardwood",
      plankWidthMm: 127,
      plankLengthMm: 1220,
      wearLayer: "2 mm wood veneer",
      finishSheen: "Matte",
      installation: "Floating click-lock",
      suitableFor: ["Living room", "Bedroom", "Basement (above grade)"],
    },
    variants: [
      { id: "natural-oak", label: "Natural oak", hex: "#c4a574" },
      { id: "gray-oak", label: "Gray oak", hex: "#9a8b7a" },
      { id: "espresso", label: "Espresso", hex: "#4a3728" },
    ],
  },
  {
    type: "laminate",
    label: "Laminate",
    textureKind: "wood-plank",
    roughness: 0.45,
    cellSizeM: 0.58,
    planksPerTile: 4,
    plankWidthM: 0.197,
    plankLengthM: 1.22,
    productInfo: {
      material: "Laminate",
      plankWidthMm: 197,
      plankLengthMm: 1220,
      wearLayer: "AC4 residential",
      finishSheen: "Embossed wood grain",
      installation: "Floating click-lock",
      suitableFor: ["Living room", "Bedroom", "Hallway"],
    },
    variants: [
      { id: "golden-oak", label: "Golden oak", hex: "#b8956a" },
      { id: "ash-gray", label: "Ash gray", hex: "#9ca3af" },
      { id: "whitewash", label: "Whitewash", hex: "#e7dcc8" },
    ],
  },
  {
    type: "tile",
    label: "Tile",
    textureKind: "tile-grid",
    roughness: 0.35,
    cellSizeM: 0.305,
    productInfo: {
      material: "Porcelain tile",
      tileSizeMm: 305,
      finishSheen: "Matte",
      installation: "Thinset on backer board",
      suitableFor: ["Kitchen", "Bath", "Entry", "Laundry"],
      notes: "12″ × 12″ field tile with ⅛″ grout joint.",
    },
    variants: [
      { id: "white", label: "White", hex: "#f5f5f4" },
      { id: "light-gray", label: "Light gray", hex: "#d6d3d1" },
      { id: "terracotta", label: "Terracotta", hex: "#c4704b" },
      { id: "slate", label: "Slate", hex: "#64748b" },
    ],
  },
  {
    type: "carpet",
    label: "Carpet",
    textureKind: "carpet-weave",
    roughness: 0.98,
    cellSizeM: 0.08,
    productInfo: {
      material: "Cut-pile carpet",
      finishSheen: "Low luster",
      installation: "Stretch-in over pad",
      suitableFor: ["Bedroom", "Office", "Stairs"],
    },
    variants: [
      { id: "beige", label: "Beige", hex: "#d4c4a8" },
      { id: "gray", label: "Gray", hex: "#9ca3af" },
      { id: "navy", label: "Navy", hex: "#475569" },
      { id: "sage", label: "Sage", hex: "#a8b89c" },
    ],
  },
  {
    type: "vinyl",
    label: "Vinyl",
    textureKind: "wood-plank",
    roughness: 0.4,
    cellSizeM: 0.65,
    planksPerTile: 3,
    plankWidthM: 0.178,
    plankLengthM: 1.22,
    productInfo: {
      material: "Luxury vinyl plank (LVP)",
      plankWidthMm: 178,
      plankLengthMm: 1220,
      wearLayer: "20 mil commercial",
      finishSheen: "Embossed",
      installation: "Floating or glue-down",
      suitableFor: ["Kitchen", "Bath", "Basement", "Whole home"],
    },
    variants: [
      { id: "light-oak", label: "Light oak", hex: "#c9b896" },
      { id: "stone-gray", label: "Stone gray", hex: "#b0aaa0" },
      { id: "white", label: "White", hex: "#ece9e4" },
    ],
  },
  {
    type: "stone",
    label: "Stone",
    textureKind: "stone-speckle",
    roughness: 0.7,
    cellSizeM: 0.5,
    productInfo: {
      material: "Natural stone",
      tileSizeMm: 610,
      finishSheen: "Honed",
      installation: "Mortar bed / thinset",
      suitableFor: ["Entry", "Bath", "Kitchen"],
    },
    variants: [
      { id: "marble-white", label: "Marble white", hex: "#e5e4e2" },
      { id: "slate", label: "Slate", hex: "#64748b" },
      { id: "travertine", label: "Travertine", hex: "#d4c8b0" },
    ],
  },
];

const catalogByType = new Map(
  FLOOR_FINISH_CATALOG.map((definition) => [definition.type, definition]),
);

export function findFloorFinishDefinition(
  type: FloorFinishType,
): FloorFinishDefinition {
  return catalogByType.get(type) ?? FLOOR_FINISH_CATALOG[0]!;
}

export function resolveFloorFinishVariant(
  type: FloorFinishType,
  variantId: string | null,
): FloorFinishVariant {
  const definition = findFloorFinishDefinition(type);
  if (variantId) {
    const match = definition.variants.find((variant) => variant.id === variantId);
    if (match) return match;
  }
  return (
    definition.variants.find((variant) => variant.id === DEFAULT_FLOOR_FINISH_VARIANT_ID) ??
    definition.variants[0]!
  );
}

export function defaultVariantIdForType(type: FloorFinishType): string {
  return resolveFloorFinishVariant(type, null).id;
}

export function formatFloorFinishLabel(
  type: FloorFinishType,
  variantId: string | null,
): string {
  const definition = findFloorFinishDefinition(type);
  const variant = resolveFloorFinishVariant(type, variantId);
  return `${definition.label} · ${variant.label}`;
}

export function isFloorFinishType(value: string): value is FloorFinishType {
  return catalogByType.has(value as FloorFinishType);
}
