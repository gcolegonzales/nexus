import type { JSX, MouseEvent, ReactNode } from "react";
import { titleCase } from "./title-case";

/**
 * DataTable<T> — a generic, presentational, Tailwind-native table for @nexus/ui.
 *
 * The table is intentionally "dumb": it renders the rows it is given in the
 * order it is given them. Sorting state is controlled by the PARENT — clicking a
 * sortable header calls `onSort(key)` and the parent supplies already-sorted
 * `data`. The table only renders the active sort indicator from `sortConfig`.
 *
 * Selection / bulk-actions are intentionally OUT for v1 (deferred until a
 * consumer needs them — see FEAT-hub-shell-10 open question). Row-level actions
 * are supported today via a custom column `render` that returns buttons/links;
 * such interactive elements should live in cells and clicks on them are guarded
 * from triggering `onRowClick`.
 */

export interface Column<T> {
  key: string;
  header: string | ReactNode;
  render: (item: T) => ReactNode;
  sortable?: boolean;
  align?: "left" | "center" | "right";
  width?: string | number;
}

export interface SortConfig {
  key: string;
  order: "asc" | "desc";
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** Defaults to `(item as { id: string }).id`. */
  getRowId?: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  sortConfig?: SortConfig | null;
  onSort?: (key: string) => void;
  className?: string;
}

const alignClass: Record<NonNullable<Column<unknown>["align"]>, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function defaultGetRowId<T>(item: T): string {
  return String((item as { id?: unknown }).id);
}

/** Header label: title-case string headers (static UI copy), pass nodes through. */
function renderHeaderLabel(header: string | ReactNode): ReactNode {
  return typeof header === "string" ? titleCase(header) : header;
}

function SortCaret({ order }: { order: "asc" | "desc" }) {
  return (
    <span aria-hidden="true" className="ml-1 inline-block text-[0.7em] leading-none">
      {order === "asc" ? "▲" : "▼"}
    </span>
  );
}

export function DataTable<T>({
  data,
  columns,
  getRowId = defaultGetRowId,
  onRowClick,
  emptyMessage = "No Data.",
  emptyAction,
  sortConfig,
  onSort,
  className = "",
}: DataTableProps<T>): JSX.Element {
  const isEmpty = data.length === 0;

  return (
    <div
      className={`overflow-auto rounded-xl border border-border bg-surface ${className}`}
    >
      <table className="w-full border-collapse text-left text-sm text-text">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-border">
            {columns.map((column) => {
              const align = column.align ?? "left";
              const isActiveSort = sortConfig?.key === column.key;
              const headerLabel = renderHeaderLabel(column.header);

              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    column.sortable
                      ? isActiveSort
                        ? sortConfig?.order === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined
                  }
                  style={column.width != null ? { width: column.width } : undefined}
                  className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted ${alignClass[align]}`}
                >
                  {column.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.key)}
                      className={`inline-flex cursor-pointer items-center border-0 bg-transparent p-0 text-xs font-semibold uppercase tracking-wide transition-colors duration-150 hover:text-text ${
                        isActiveSort ? "text-text" : "text-muted"
                      } ${
                        align === "right"
                          ? "justify-end"
                          : align === "center"
                            ? "justify-center"
                            : "justify-start"
                      }`}
                    >
                      {headerLabel}
                      {isActiveSort && sortConfig ? (
                        <SortCaret order={sortConfig.order} />
                      ) : null}
                    </button>
                  ) : (
                    headerLabel
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center">
                <div className="flex flex-col items-center gap-3 text-muted">
                  <span className="text-sm">{emptyMessage}</span>
                  {emptyAction ? <div>{emptyAction}</div> : null}
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => {
              const rowId = getRowId(item);
              const clickable = Boolean(onRowClick);

              const handleRowClick = (
                event: MouseEvent<HTMLTableRowElement>,
              ) => {
                if (!onRowClick) return;
                // Guard: don't fire row click when an interactive element inside
                // a cell (button/link) was the target.
                const target = event.target as HTMLElement;
                if (target.closest("button, a, input, select, textarea")) return;
                onRowClick(item);
              };

              return (
                <tr
                  key={rowId}
                  onClick={clickable ? handleRowClick : undefined}
                  className={`border-b border-border/60 transition-colors duration-150 last:border-b-0 ${
                    rowIndex % 2 === 1 ? "bg-primary/[0.03]" : ""
                  } ${
                    clickable
                      ? "cursor-pointer hover:bg-primary/[0.06]"
                      : "hover:bg-primary/[0.04]"
                  }`}
                >
                  {columns.map((column) => {
                    const align = column.align ?? "left";
                    return (
                      <td
                        key={column.key}
                        className={`px-4 py-3 align-middle ${alignClass[align]}`}
                      >
                        {column.render(item)}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
