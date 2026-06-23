import type { ThreeEvent } from "@react-three/fiber";
import type { AxisBounds } from "@/tools/room-coat/lib/floor-utils";
import { FLOOR_SURFACE_Y_M, SCENE_GRID_Y_M } from "@/tools/room-coat/lib/room-geometry";

const MM_TO_M = 0.001;
const GRID_DIVISIONS_PER_M = 3;

interface FloorIslandGridProps {
  bounds: AxisBounds;
}

/** Per-floor layout grid in local coordinates — separate from other floors. */
export function FloorIslandGrid({ bounds }: FloorIslandGridProps) {
  const sizeM = (bounds.maxX - bounds.minX) * MM_TO_M;
  const centerX = ((bounds.minX + bounds.maxX) / 2) * MM_TO_M;
  const centerZ = ((bounds.minZ + bounds.maxZ) / 2) * MM_TO_M;
  const divisions = Math.max(16, Math.min(48, Math.round(sizeM * GRID_DIVISIONS_PER_M)));

  return (
    <gridHelper
      args={[sizeM, divisions, "#334155", "#1e293b"]}
      position={[centerX, SCENE_GRID_Y_M, centerZ]}
      renderOrder={-1}
      raycast={() => null}
    />
  );
}

interface FloorGridClickPlaneProps {
  bounds: AxisBounds;
  enabled: boolean;
  onClick: () => void;
}

/** Invisible hit target for empty grid clicks (deselect, etc.). */
export function FloorGridClickPlane({
  bounds,
  enabled,
  onClick,
}: FloorGridClickPlaneProps) {
  if (!enabled) return null;

  const sizeM = (bounds.maxX - bounds.minX) * MM_TO_M;
  const centerX = ((bounds.minX + bounds.maxX) / 2) * MM_TO_M;
  const centerZ = ((bounds.minZ + bounds.maxZ) / 2) * MM_TO_M;

  function handleClick(event: ThreeEvent<MouseEvent>) {
    event.stopPropagation();
    onClick();
  }

  return (
    <mesh
      position={[centerX, FLOOR_SURFACE_Y_M - 0.001, centerZ]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={handleClick}
      renderOrder={-2}
    >
      <planeGeometry args={[sizeM, sizeM]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
