"use client";

import { useMemo, useState, type ReactNode } from "react";

export type SortDirection = "asc" | "desc";

export interface SortableColumn<T> {
  id: string;
  label: string;
  sortValue: (row: T) => string | number;
  render: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

interface SortableTableProps<T> {
  rows: T[];
  columns: SortableColumn<T>[];
  getRowKey: (row: T) => string;
  defaultSort?: { id: string; direction: SortDirection };
  emptyMessage?: ReactNode;
}

function compareSortValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
}

export function SortableTable<T>({
  rows,
  columns,
  getRowKey,
  defaultSort,
  emptyMessage,
}: SortableTableProps<T>) {
  const [sort, setSort] = useState<{ id: string; direction: SortDirection } | null>(
    defaultSort ?? null,
  );

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((entry) => entry.id === sort.id);
    if (!column) return rows;
    return [...rows].sort((a, b) => {
      const result = compareSortValues(column.sortValue(a), column.sortValue(b));
      return sort.direction === "asc" ? result : -result;
    });
  }, [columns, rows, sort]);

  function toggleSort(columnId: string) {
    setSort((current) => {
      if (current?.id !== columnId) {
        return { id: columnId, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { id: columnId, direction: "desc" };
      }
      return null;
    });
  }

  if (rows.length === 0 && emptyMessage) {
    return <>{emptyMessage}</>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border bg-background/80 text-muted">
          <tr>
            {columns.map((column) => {
              const active = sort?.id === column.id;
              const indicator = active
                ? sort.direction === "asc"
                  ? " ↑"
                  : " ↓"
                : "";
              return (
                <th
                  key={column.id}
                  className={`px-4 py-3 font-medium ${column.headerClassName ?? ""}`}
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-0.5 text-left transition-colors hover:text-text"
                    onClick={() => toggleSort(column.id)}
                  >
                    {column.label}
                    <span className="tabular-nums text-xs" aria-hidden>
                      {indicator}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={getRowKey(row)} className="border-t border-border/70">
              {columns.map((column) => (
                <td
                  key={column.id}
                  className={`px-4 py-3 align-middle ${column.cellClassName ?? ""}`}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
