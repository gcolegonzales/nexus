"use client";

import { Html } from "@react-three/drei";
import {
  EDITOR_CHROME_MEASUREMENT,
  EDITOR_SCENE_MEASURE_HINT,
  EDITOR_SCENE_SNAP_LABEL,
  EDITOR_SCENE_WALL_SNAP_LABEL,
  EDITOR_Z_SCENE_HTML,
} from "@/tools/room-coat/components/editor/editor-chrome";

export type EditorScenePinCalloutVariant =
  | "snap"
  | "wall"
  | "measure"
  | "hint";

const CALLOUT_STYLES: Record<
  EditorScenePinCalloutVariant,
  { label: string; arrow: string }
> = {
  snap: {
    label: EDITOR_SCENE_SNAP_LABEL,
    arrow: "border-t-sky-400/55",
  },
  wall: {
    label: EDITOR_SCENE_WALL_SNAP_LABEL,
    arrow: "border-t-orange-400/45",
  },
  measure: {
    label: `max-w-[180px] truncate ${EDITOR_CHROME_MEASUREMENT}`,
    arrow: "border-t-sky-400/55",
  },
  hint: {
    label: EDITOR_SCENE_MEASURE_HINT,
    arrow: "border-t-zinc-500/45",
  },
};

/** Label floated above a pin with a downward arrow — keeps the pin visible. */
export function EditorScenePinCallout({
  label,
  variant = "snap",
  offsetY = 0.34,
}: {
  label: string;
  variant?: EditorScenePinCalloutVariant;
  offsetY?: number;
}) {
  const styles = CALLOUT_STYLES[variant];

  return (
    <Html
      position={[0, offsetY, 0]}
      center
      zIndexRange={[EDITOR_Z_SCENE_HTML, 0]}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div className="flex -translate-y-full flex-col items-center">
        <div className={styles.label}>{label}</div>
        <div
          className={`h-0 w-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent ${styles.arrow}`}
          aria-hidden
        />
      </div>
    </Html>
  );
}
