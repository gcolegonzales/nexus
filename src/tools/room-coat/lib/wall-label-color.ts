function expandHex(hex: string): string | null {
  const raw = hex.trim().replace(/^#/, "");
  if (raw.length === 3) {
    return raw
      .split("")
      .map((char) => char + char)
      .join("");
  }
  if (raw.length === 6) return raw;
  return null;
}

function channel(value: string): number {
  return parseInt(value, 16) / 255;
}

function linearize(channelValue: number): number {
  return channelValue <= 0.03928
    ? channelValue / 12.92
    : ((channelValue + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance for sRGB hex colors. */
export function relativeLuminance(hex: string): number {
  const expanded = expandHex(hex);
  if (!expanded) return 0.5;

  const r = linearize(channel(expanded.slice(0, 2)));
  const g = linearize(channel(expanded.slice(2, 4)));
  const b = linearize(channel(expanded.slice(4, 6)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black label on light walls, white on dark walls. */
export function labelColorForWallHex(hex: string, threshold = 0.42): string {
  return relativeLuminance(hex) < threshold ? "#ffffff" : "#000000";
}

/** Darken a wall paint hex for a subtle perimeter outline. */
export function darkenHex(hex: string, factor = 0.48): string {
  const expanded = expandHex(hex);
  if (!expanded) return "#1e293b";

  const mixChannel = (slice: number) =>
    Math.max(0, Math.min(255, Math.round(channel(expanded.slice(slice, slice + 2)) * 255 * factor)));

  const r = mixChannel(0).toString(16).padStart(2, "0");
  const g = mixChannel(2).toString(16).padStart(2, "0");
  const b = mixChannel(4).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}
