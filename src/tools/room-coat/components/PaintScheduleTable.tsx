"use client";

import {
  buildPaintScheduleForUnit,
  paintLabelForRow,
  type PaintScheduleRow,
} from "@/tools/room-coat/lib/paint-schedule";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import { Badge, Card } from "@nexus/ui";

export function PaintScheduleTable() {
  const { state, activeUnit } = useRoomCoat();
  const rows = buildPaintScheduleForUnit(state, activeUnit);

  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Attach rooms or add hallways on the overview to generate a paint
          schedule.
        </p>
      </Card>
    );
  }

  const bySpace = groupBySpace(rows);

  return (
    <div className="space-y-6">
      {Object.entries(bySpace).map(([spaceName, spaceRows]) => (
        <Card key={spaceName} padding={false} className="overflow-hidden">
          <div className="border-b border-border px-6 py-4">
            <h3 className="text-lg font-semibold text-text">{spaceName}</h3>
            <p className="mt-0.5 text-xs capitalize text-muted">
              {spaceRows[0]?.spaceKind ?? "room"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-background/80 text-muted">
                <tr>
                  <th className="px-6 py-3 font-medium">Surface</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Paint</th>
                  <th className="px-6 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {spaceRows.map((row) => (
                  <tr key={row.surfaceId} className="border-t border-border">
                    <td className="px-6 py-3 text-text">{row.surfaceLabel}</td>
                    <td className="px-6 py-3 capitalize text-muted">
                      {row.category}
                    </td>
                    <td className="px-6 py-3 text-text">
                      {paintLabelForRow(row)}
                    </td>
                    <td className="px-6 py-3">
                      <SourceBadge row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SourceBadge({ row }: { row: PaintScheduleRow }) {
  if (row.unset) return <Badge variant="amber">Unset</Badge>;
  if (row.source === "override") return <Badge variant="sky">Override</Badge>;
  return <Badge variant="mint">Coat</Badge>;
}

function groupBySpace(
  rows: PaintScheduleRow[],
): Record<string, PaintScheduleRow[]> {
  return rows.reduce<Record<string, PaintScheduleRow[]>>((acc, row) => {
    if (!acc[row.spaceName]) acc[row.spaceName] = [];
    acc[row.spaceName].push(row);
    return acc;
  }, {});
}
