"use client";

import { useState } from "react";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import type { ExtractionStatus, PetRecord } from "@/tools/pet-health/types/state";
import { RecordEditModal } from "@/tools/pet-health/components/RecordEditModal";
import { Badge, DataTable, useConfirm } from "@nexus/ui";
import type { BadgeVariant, Column, SortConfig } from "@nexus/ui";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function documentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    "medical-record": "Medical record",
    discharge: "Discharge",
    lab: "Lab results",
    imaging: "Imaging",
    invoice: "Invoice",
    other: "Other",
  };
  return labels[type] ?? type;
}

interface ExtractionBadgeInfo {
  label: string;
  variant: BadgeVariant;
}

function extractionBadge(status: ExtractionStatus): ExtractionBadgeInfo {
  switch (status) {
    case "pending":
    case "extracting":
      return { label: "Reading…", variant: "sky" };
    case "done":
      return { label: "Readable", variant: "mint" };
    case "empty":
      return { label: "No text found", variant: "amber" };
    case "failed":
      return { label: "Failed", variant: "default" };
    default:
      return { label: status, variant: "default" };
  }
}

// ---------------------------------------------------------------------------
// Sort logic
// ---------------------------------------------------------------------------

function sortedRecords(records: PetRecord[], sortConfig: SortConfig): PetRecord[] {
  return [...records].sort((a, b) => {
    const dir = sortConfig.order === "asc" ? 1 : -1;

    switch (sortConfig.key) {
      case "title":
        return dir * a.title.localeCompare(b.title);

      case "documentType":
        return dir * a.documentType.localeCompare(b.documentType);

      case "documentDate": {
        const aDate = a.documentDate ?? a.uploadedAt;
        const bDate = b.documentDate ?? b.uploadedAt;
        if (aDate < bDate) return -1 * dir;
        if (aDate > bDate) return 1 * dir;
        return 0;
      }

      case "fileSize":
        return dir * (a.fileSize - b.fileSize);

      case "extractionStatus":
        return dir * a.extractionStatus.localeCompare(b.extractionStatus);

      default:
        // Fallback: most-recent-first by documentDate then uploadedAt
        return defaultSort(a, b);
    }
  });
}

function defaultSort(a: PetRecord, b: PetRecord): number {
  const aDate = a.documentDate ?? a.uploadedAt;
  const bDate = b.documentDate ?? b.uploadedAt;
  if (bDate > aDate) return 1;
  if (bDate < aDate) return -1;
  return b.uploadedAt.localeCompare(a.uploadedAt);
}

// ---------------------------------------------------------------------------
// Action buttons
// ---------------------------------------------------------------------------

interface ActionButtonProps {
  label: string;
  busy?: boolean;
  onClick: () => void;
  danger?: boolean;
}

function ActionButton({ label, busy = false, onClick, danger = false }: ActionButtonProps) {
  if (danger) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="btn-interactive inline-flex cursor-pointer items-center justify-center rounded-xl px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10"
      >
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="btn-interactive inline-flex cursor-pointer items-center justify-center rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text transition hover:border-primary/30 hover:bg-accent-sky/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? `${label}…` : label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Actions cell — a self-contained component per row so hooks are legal
// ---------------------------------------------------------------------------

interface RecordActionsProps {
  record: PetRecord;
  onEdit: (record: PetRecord) => void;
}

function RecordActions({ record, onEdit }: RecordActionsProps) {
  const { deleteRecord, reExtract, getRecordFile } = usePetHealth();
  const confirm = useConfirm();
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  async function handleOpen() {
    setActionBusy("open");
    try {
      const blob = await getRecordFile(record.id);
      if (!blob) {
        alert("File not found in storage.");
        return;
      }
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleDownload() {
    setActionBusy("download");
    try {
      const blob = await getRecordFile(record.id);
      if (!blob) {
        alert("File not found in storage.");
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = record.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleDelete() {
    const confirmed = await confirm({
      title: "Delete record?",
      message: `Delete "${record.title}"? This will permanently remove the file and cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!confirmed) return;
    await deleteRecord(record.id);
  }

  async function handleReExtract() {
    setActionBusy("extract");
    try {
      await reExtract(record.id);
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <ActionButton label="Open" busy={actionBusy === "open"} onClick={() => void handleOpen()} />
      <ActionButton
        label="Download"
        busy={actionBusy === "download"}
        onClick={() => void handleDownload()}
      />
      <ActionButton label="Edit" onClick={() => onEdit(record)} />
      <ActionButton
        label="Re-extract"
        busy={actionBusy === "extract"}
        onClick={() => void handleReExtract()}
      />
      <ActionButton label="Delete" danger onClick={() => void handleDelete()} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecordsList
// ---------------------------------------------------------------------------

// Default sort: most-recent-first (desc by date)
const DEFAULT_SORT: SortConfig = { key: "documentDate", order: "desc" };

export function RecordsList() {
  const { state, activePetId } = usePetHealth();
  const [editingRecord, setEditingRecord] = useState<PetRecord | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT);

  const petRecords = state.records.filter((r) => r.petId === activePetId);
  const sorted = sortedRecords(petRecords, sortConfig);

  function handleSort(key: string) {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, order: prev.order === "asc" ? "desc" : "asc" }
        : { key, order: "asc" },
    );
  }

  const columns: Column<PetRecord>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      render: (r) => (
        <span className="font-medium text-text">{r.title}</span>
      ),
    },
    {
      key: "documentType",
      header: "Type",
      sortable: true,
      render: (r) => documentTypeLabel(r.documentType),
    },
    {
      key: "documentDate",
      header: "Date",
      sortable: true,
      render: (r) => formatDate(r.documentDate),
    },
    {
      key: "fileSize",
      header: "Size",
      sortable: true,
      render: (r) => formatFileSize(r.fileSize),
    },
    {
      key: "extractionStatus",
      header: "Status",
      sortable: true,
      render: (r) => {
        const badge = extractionBadge(r.extractionStatus);
        return <Badge variant={badge.variant}>{badge.label}</Badge>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      sortable: false,
      align: "right",
      render: (r) => <RecordActions record={r} onEdit={setEditingRecord} />,
    },
  ];

  return (
    <>
      <DataTable<PetRecord>
        data={sorted}
        columns={columns}
        getRowId={(r) => r.id}
        sortConfig={sortConfig}
        onSort={handleSort}
        emptyMessage="No Records yet. Upload a file above to get started."
      />

      {/* Edit modal — keyed by record id so draft resets on open */}
      <RecordEditModal
        key={editingRecord?.id ?? "none"}
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
      />
    </>
  );
}
