import { createId } from "@/shared/ids/createId";
import type { Paint } from "@/tools/room-coat/types/state";

/** Typical interior palette — whites, neutrals, and a few accents. */
const SEED_PAINT_SPECS: Array<
  Pick<Paint, "code" | "brand" | "name" | "hex">
> = [
  { code: "OC-65", brand: "Benjamin Moore", name: "Chantilly Lace", hex: "#F8F8F2" },
  { code: "SW 7008", brand: "Sherwin-Williams", name: "Alabaster", hex: "#F2EDE4" },
  { code: "SW 7005", brand: "Sherwin-Williams", name: "Pure White", hex: "#FFFFFF" },
  { code: "SW 7029", brand: "Sherwin-Williams", name: "Agreeable Gray", hex: "#D1CBC0" },
  { code: "SW 7015", brand: "Sherwin-Williams", name: "Repose Gray", hex: "#C2BFB8" },
  { code: "SW 7036", brand: "Sherwin-Williams", name: "Accessible Beige", hex: "#DCD4C6" },
  { code: "HC-173", brand: "Benjamin Moore", name: "Edgecomb Gray", hex: "#D5CEC4" },
  { code: "HC-154", brand: "Benjamin Moore", name: "Hale Navy", hex: "#434C56" },
  { code: "SW 6258", brand: "Sherwin-Williams", name: "Tricorn Black", hex: "#2A2A2A" },
  { code: "SW 9130", brand: "Sherwin-Williams", name: "Evergreen Fog", hex: "#95978C" },
  { code: "SW 6204", brand: "Sherwin-Williams", name: "Sea Salt", hex: "#CDD4CA" },
  { code: "SW 6211", brand: "Sherwin-Williams", name: "Rainwashed", hex: "#C2D4D8" },
];

export function createSeedPaints(): Paint[] {
  return SEED_PAINT_SPECS.map((spec) => ({
    id: createId(),
    ...spec,
  }));
}
