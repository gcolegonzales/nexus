/** Dev logging for hallway placement and mesh generation. */
export function logHallway(
  step: string,
  data?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === "production") return;
  if (data) {
    console.log(`[room-coat/hallway] ${step}`, data);
  } else {
    console.log(`[room-coat/hallway] ${step}`);
  }
}
