"use client";

import type { ResolvedFloorFinish } from "@/tools/room-coat/lib/resolve-floor-finish";
import { formatMm } from "@/tools/room-coat/lib/units";
import type { UnitPreference } from "@/tools/room-coat/types/state";

interface FloorFinishProductDetailsProps {
  finish: ResolvedFloorFinish;
  unitPreference: UnitPreference;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap gap-x-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-text">{value}</span>
    </div>
  );
}

export function FloorFinishProductDetails({
  finish,
  unitPreference,
}: FloorFinishProductDetailsProps) {
  const info = finish.productInfo;
  const formatDim = (mm: number | undefined) =>
    mm ? formatMm(mm, unitPreference) : "";

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-surface/40 px-3.5 py-3">
      <p className="text-sm font-semibold text-text">Product details</p>
      <DetailRow label="Material" value={info.material} />
      {info.plankWidthMm ? (
        <DetailRow
          label="Plank size"
          value={`${formatDim(info.plankWidthMm)} wide × ${formatDim(info.plankLengthMm)} long`}
        />
      ) : null}
      {info.tileSizeMm ? (
        <DetailRow
          label="Tile size"
          value={`${formatDim(info.tileSizeMm)} square`}
        />
      ) : null}
      <DetailRow label="Wear layer" value={info.wearLayer ?? ""} />
      <DetailRow label="Finish" value={info.finishSheen ?? ""} />
      <DetailRow label="Installation" value={info.installation ?? ""} />
      {info.suitableFor?.length ? (
        <DetailRow label="Best for" value={info.suitableFor.join(", ")} />
      ) : null}
      {info.notes ? (
        <p className="text-sm text-muted">{info.notes}</p>
      ) : null}
    </div>
  );
}
