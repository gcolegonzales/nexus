"use client";

import { useState } from "react";
import type { PetRecord, DocumentType } from "@/tools/pet-health/types/state";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import { Modal, Input, Select } from "@nexus/ui";
import type { SelectOption } from "@nexus/ui";
import { FormActions } from "@nexus/next";

// ---------------------------------------------------------------------------
// Document type options
// ---------------------------------------------------------------------------

const documentTypeOptions: SelectOption[] = [
  { value: "medical-record", label: "Medical record" },
  { value: "discharge", label: "Discharge / sign-out" },
  { value: "lab", label: "Lab results" },
  { value: "imaging", label: "Imaging" },
  { value: "invoice", label: "Invoice" },
  { value: "other", label: "Other" },
];

// ---------------------------------------------------------------------------
// Draft shape
// ---------------------------------------------------------------------------

interface RecordDraft {
  title: string;
  documentType: string;
  documentDate: string;
  source: string;
}

function toDraft(record: PetRecord): RecordDraft {
  return {
    title: record.title,
    documentType: record.documentType,
    documentDate: record.documentDate ?? "",
    source: record.source ?? "",
  };
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecordEditModalProps {
  record: PetRecord | null;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RecordEditModal({ record, onClose }: RecordEditModalProps) {
  const { updateRecord } = usePetHealth();
  const initial = useState<RecordDraft>(() =>
    record ? toDraft(record) : { title: "", documentType: "other", documentDate: "", source: "" },
  )[0];
  const [draft, setDraft] = useState<RecordDraft>(() =>
    record ? toDraft(record) : { title: "", documentType: "other", documentDate: "", source: "" },
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const dirty = !saved && JSON.stringify(draft) !== JSON.stringify(initial);

  // Re-sync draft when the record changes (e.g. modal re-opened for different record).
  // We do this with a key on the modal itself in RecordsList, so draft starts fresh.

  function set<K extends keyof RecordDraft>(field: K, value: RecordDraft[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    if (field === "title") setTitleError(null);
  }

  async function handleSave() {
    if (!record) return;

    const trimmedTitle = draft.title.trim();
    if (!trimmedTitle) {
      setTitleError("Title is required.");
      return;
    }

    setSaving(true);
    try {
      await updateRecord(record.id, {
        title: trimmedTitle,
        documentType: draft.documentType as DocumentType,
        documentDate: draft.documentDate || undefined,
        source: draft.source.trim() || undefined,
      });
      // Clear dirty before closing so the Modal guard does not fire on save.
      setSaved(true);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={record !== null}
      onClose={onClose}
      title="Edit record"
      dirty={dirty}
    >
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <div className="space-y-1.5">
          <Input
            label="Title"
            placeholder="e.g. Annual wellness exam"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            autoFocus
          />
          {titleError && (
            <p className="text-sm text-danger">{titleError}</p>
          )}
        </div>

        <Select
          label="Document type"
          value={draft.documentType || null}
          options={documentTypeOptions}
          onChange={(value) => set("documentType", value ?? "other")}
          fullWidth
        />

        <Input
          label="Document date"
          type="date"
          value={draft.documentDate}
          onChange={(e) => set("documentDate", e.target.value)}
        />

        <Input
          label="Vet / source"
          placeholder="e.g. Dr. Smith at Happy Paws"
          value={draft.source}
          onChange={(e) => set("source", e.target.value)}
        />

        <FormActions
          saveLabel="Save changes"
          onSave={() => void handleSave()}
          onCancel={onClose}
          className={saving ? "pointer-events-none opacity-60" : ""}
        />
      </form>
    </Modal>
  );
}
