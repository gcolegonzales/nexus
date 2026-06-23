import type { SnapPoint } from "@/tools/room-coat/types/state";

export function nextFloorPinLabel(snapPoints: SnapPoint[]): string {
  const count = snapPoints.filter((point) => point.kind !== "wall").length;
  return `Pin ${count + 1}`;
}

export function snapPinPreviewHint(
  kind: string | undefined,
  label: string | undefined,
): string | undefined {
  if (!kind || kind === "grid") return undefined;
  if (kind === "measure-start") return "Measure start";
  if (kind === "measure-end") return "Measure end";
  if (kind === "measure-midpoint") return "Measure middle";
  if (kind === "measure-line") return "On measure tape";
  if (label && label.length <= 20) return label;
  return undefined;
}

/** Snap name while placing or dragging a measure point — hides generic grid snaps. */
export function measureSnapPreviewLabel(
  kind: string | undefined,
  label: string | undefined,
): string | undefined {
  if (!kind || kind === "grid") return undefined;
  if (!label || label === "Grid") return undefined;
  if (label.length <= 36) return label;
  return `${label.slice(0, 33)}…`;
}
