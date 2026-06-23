export interface FurnishingPreset {
  id: string;
  label: string;
  widthMm: number;
  depthMm: number;
  heightMm: number;
  color: string;
}

const IN = 25.4;

function inMm(inches: number): number {
  return Math.round(inches * IN);
}

export const FURNISHING_PRESETS: FurnishingPreset[] = [
  { id: "twin-bed", label: "Twin bed", widthMm: inMm(38), depthMm: inMm(75), heightMm: inMm(24), color: "#94a3b8" },
  { id: "queen-bed", label: "Queen bed", widthMm: inMm(60), depthMm: inMm(80), heightMm: inMm(24), color: "#94a3b8" },
  { id: "king-bed", label: "King bed", widthMm: inMm(76), depthMm: inMm(80), heightMm: inMm(24), color: "#94a3b8" },
  { id: "sofa", label: "Sofa", widthMm: inMm(84), depthMm: inMm(36), heightMm: inMm(36), color: "#64748b" },
  { id: "loveseat", label: "Loveseat", widthMm: inMm(60), depthMm: inMm(36), heightMm: inMm(36), color: "#64748b" },
  { id: "chair", label: "Chair", widthMm: inMm(32), depthMm: inMm(32), heightMm: inMm(36), color: "#78716c" },
  { id: "desk", label: "Desk", widthMm: inMm(48), depthMm: inMm(24), heightMm: inMm(30), color: "#a8a29e" },
  { id: "dining-table", label: "Dining table", widthMm: inMm(72), depthMm: inMm(36), heightMm: inMm(30), color: "#a8a29e" },
  { id: "dresser", label: "Dresser", widthMm: inMm(60), depthMm: inMm(18), heightMm: inMm(34), color: "#a8a29e" },
  { id: "nightstand", label: "Nightstand", widthMm: inMm(20), depthMm: inMm(16), heightMm: inMm(24), color: "#a8a29e" },
  { id: "counter", label: "Counter", widthMm: inMm(72), depthMm: inMm(24), heightMm: inMm(36), color: "#a8a29e" },
  { id: "bar", label: "Bar top", widthMm: inMm(84), depthMm: inMm(20), heightMm: inMm(42), color: "#78716c" },
  { id: "fridge", label: "Fridge", widthMm: inMm(36), depthMm: inMm(30), heightMm: inMm(70), color: "#cbd5e1" },
  { id: "range", label: "Range", widthMm: inMm(30), depthMm: inMm(30), heightMm: inMm(36), color: "#cbd5e1" },
];

export function furnishingPresetById(id: string): FurnishingPreset | undefined {
  return FURNISHING_PRESETS.find((preset) => preset.id === id);
}
