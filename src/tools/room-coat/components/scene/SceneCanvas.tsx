"use client";

import dynamic from "next/dynamic";

const UnitScene = dynamic(
  () =>
    import("@/tools/room-coat/components/scene/UnitScene").then(
      (mod) => mod.UnitScene,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-border bg-background text-sm text-muted">
        Loading 3D view…
      </div>
    ),
  },
);

export function SceneCanvas() {
  return (
    <div className="h-[min(60vh,520px)] min-h-[320px] overflow-hidden rounded-xl border border-border shadow-[var(--shadow)]">
      <UnitScene />
    </div>
  );
}
