"use client";

import {
  buildPaintScheduleForUnit,
  paintLabelForRow,
  type PaintScheduleRow,
} from "@/tools/room-coat/lib/paint-schedule";
import { paintSourceLabel } from "@/tools/room-coat/lib/coat-labels";
import { useRoomCoat } from "@/tools/room-coat/RoomCoatProvider";
import {
  SortableTable,
  type SortableColumn,
} from "@/tools/room-coat/components/SortableTable";
import { Badge, Card } from "@nexus/ui";
import Link from "next/link";

const COLUMNS: SortableColumn<PaintScheduleRow>[] = [
  {
    id: "space",
    label: "Space",
    sortValue: (row) => row.spaceName,
    render: (row) => (
      <span className="font-medium text-text">{row.spaceName}</span>
    ),
  },
  {
    id: "type",
    label: "Type",
    sortValue: (row) => row.spaceKind,
    render: (row) => (
      <span className="capitalize text-muted">{row.spaceKind}</span>
    ),
  },
  {
    id: "surface",
    label: "Surface",
    sortValue: (row) => row.surfaceLabel,
    render: (row) => <span className="text-text">{row.surfaceLabel}</span>,
  },
  {
    id: "category",
    label: "Category",
    sortValue: (row) => row.category,
    render: (row) => (
      <span className="capitalize text-muted">{row.category}</span>
    ),
  },
  {
    id: "paint",
    label: "Paint",
    sortValue: (row) => paintLabelForRow(row),
    render: (row) => (
      <span className={row.unset ? "text-muted italic" : "text-text"}>
        {paintLabelForRow(row)}
      </span>
    ),
  },
  {
    id: "source",
    label: "Source",
    sortValue: (row) => row.source,
    render: (row) => <SourceBadge row={row} />,
  },
];

export function SurfacePaintTable() {
  const { state, activeUnit } = useRoomCoat();
  const rows = buildPaintScheduleForUnit(state, activeUnit);

  return (
    <SortableTable
      rows={rows}
      columns={COLUMNS}
      getRowKey={(row) => row.surfaceId}
      defaultSort={{ id: "space", direction: "asc" }}
      emptyMessage={
        <Card className="border-dashed">
          <div className="space-y-3 py-6 text-center">
            <p className="text-base font-medium text-text">No surfaces yet</p>
            <p className="mx-auto max-w-md text-sm text-muted">
              Add rooms or hallways on the overview, then assign paints in the
              editor or coat panels.
            </p>
            <Link
              href="/tools/room-coat"
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Go to overview
            </Link>
          </div>
        </Card>
      }
    />
  );
}

function SourceBadge({ row }: { row: PaintScheduleRow }) {
  if (row.unset) return <Badge variant="amber">Unset</Badge>;
  if (row.source === "override") return <Badge variant="sky">Override</Badge>;
  if (row.source === "unit-default") {
    return <Badge variant="default">Unit default</Badge>;
  }
  return <Badge variant="mint">{paintSourceLabel(row.source)}</Badge>;
}
