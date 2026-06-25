"use client";

import { useState } from "react";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import type { ExtractionStatus, PetRecord } from "@/tools/pet-health/types/state";
import { RecordEditModal } from "@/tools/pet-health/components/RecordEditModal";
import { Badge, Card, useConfirm } from "@nexus/ui";
import type { BadgeVariant } from "@nexus/ui";

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

function sortRecords(records: PetRecord[]): PetRecord[] {
  return [...records].sort((a, b) => {
    // Most recent first: compare documentDate, fall back to uploadedAt.
    const aDate = a.documentDate ?? a.uploadedAt;
    const bDate = b.documentDate ?? b.uploadedAt;
    if (bDate > aDate) return 1;
    if (bDate < aDate) return -1;
    // If documentDates are equal, use uploadedAt as tiebreaker.
    return b.uploadedAt.localeCompare(a.uploadedAt);
  });
}

// ---------------------------------------------------------------------------
// RecordRow
// ---------------------------------------------------------------------------

interface RecordRowProps {
  record: PetRecord;
  onEdit: (record: PetRecord) => void;
}

function RecordRow({ record, onEdit }: RecordRowProps) {
  const { deleteRecord, reExtract, getRecordFile } = usePetHealth();
  const confirm = useConfirm();
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const badge = extractionBadge(record.extractionStatus);

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
      // Revoke after a short delay to allow the tab to load.
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
    <Card className="space-y-3">
      {/* Header row */}
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-semibold text-text">{record.title}</p>
          <p className="text-xs text-muted">
            {documentTypeLabel(record.documentType)}
            {record.documentDate ? ` · ${formatDate(record.documentDate)}` : ""}
            {record.source ? ` · ${record.source}` : ""}
          </p>
        </div>

        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>

      {/* Meta row */}
      <p className="text-xs text-muted">
        {record.fileName} · {formatFileSize(record.fileSize)} · Uploaded{" "}
        {formatDate(record.uploadedAt)}
      </p>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <ActionButton
          label="Open"
          busy={actionBusy === "open"}
          onClick={() => void handleOpen()}
        />
        <ActionButton
          label="Download"
          busy={actionBusy === "download"}
          onClick={() => void handleDownload()}
        />
        <ActionButton
          label="Edit"
          onClick={() => onEdit(record)}
        />
        <ActionButton
          label="Re-extract"
          busy={actionBusy === "extract"}
          onClick={() => void handleReExtract()}
        />
        <button
          type="button"
          onClick={() => void handleDelete()}
          className="btn-interactive inline-flex cursor-pointer items-center justify-center rounded-xl px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10"
          aria-label={`Delete ${record.title}`}
        >
          Delete
        </button>
      </div>
    </Card>
  );
}

interface ActionButtonProps {
  label: string;
  busy?: boolean;
  onClick: () => void;
}

function ActionButton({ label, busy = false, onClick }: ActionButtonProps) {
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
// RecordsList
// ---------------------------------------------------------------------------

export function RecordsList() {
  const { state, activePetId } = usePetHealth();
  const [editingRecord, setEditingRecord] = useState<PetRecord | null>(null);

  const petRecords = state.records.filter((r) => r.petId === activePetId);
  const sorted = sortRecords(petRecords);

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-6 py-10 text-center">
        <p className="text-sm text-muted">
          No records yet. Upload a file above to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sorted.map((record) => (
          <RecordRow
            key={record.id}
            record={record}
            onEdit={setEditingRecord}
          />
        ))}
      </div>

      {/* Edit modal — keyed by record id so draft resets on open */}
      <RecordEditModal
        key={editingRecord?.id ?? "none"}
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
      />
    </>
  );
}
