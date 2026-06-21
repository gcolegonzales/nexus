import type { Hallway, HallwayWallOpening } from "@/tools/room-coat/types/state";
import { listHallwaySegmentWalls } from "@/tools/room-coat/lib/hallway-geometry";

export function openingsForHallwayWall(
  hallway: Hallway,
  segIndex: number,
  side: 0 | 1,
): HallwayWallOpening[] {
  return hallway.wallOpenings.filter(
    (opening) => opening.segIndex === segIndex && opening.side === side,
  );
}

/** Solid wall segments remaining after openings (for mesh + paint). */
export function solidHallwayWallSegments(
  hallway: Hallway,
  segIndex: number,
  side: 0 | 1,
): Array<{ startMm: number; endMm: number; lengthMm: number }> {
  const layout = listHallwaySegmentWalls(hallway).find(
    (wall) => wall.segIndex === segIndex && wall.side === side,
  );
  if (!layout) return [];

  const openings = openingsForHallwayWall(hallway, segIndex, side)
    .map((opening) => ({
      startMm: Math.max(0, Math.min(opening.startMm, opening.endMm)),
      endMm: Math.min(layout.lengthMm, Math.max(opening.startMm, opening.endMm)),
    }))
    .filter((opening) => opening.endMm - opening.startMm > 50)
    .sort((a, b) => a.startMm - b.startMm);

  const segments: Array<{ startMm: number; endMm: number; lengthMm: number }> =
    [];
  let cursor = 0;

  for (const opening of openings) {
    if (opening.startMm > cursor + 50) {
      segments.push({
        startMm: cursor,
        endMm: opening.startMm,
        lengthMm: opening.startMm - cursor,
      });
    }
    cursor = Math.max(cursor, opening.endMm);
  }

  if (layout.lengthMm > cursor + 50) {
    segments.push({
      startMm: cursor,
      endMm: layout.lengthMm,
      lengthMm: layout.lengthMm - cursor,
    });
  }

  if (segments.length === 0 && openings.length === 0) {
    segments.push({
      startMm: 0,
      endMm: layout.lengthMm,
      lengthMm: layout.lengthMm,
    });
  }

  return segments;
}
