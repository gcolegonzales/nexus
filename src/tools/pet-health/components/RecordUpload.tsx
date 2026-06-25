"use client";

import { useRef, useState } from "react";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
];

const ACCEPT_ATTR = ACCEPTED_TYPES.join(",");

/** 50 MB per-file guard. */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function RecordUpload() {
  const { activePetId, addRecord } = usePetHealth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !activePetId) return;

    setError(null);
    setBusy(true);

    const oversized = Array.from(files).filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      setError(
        `File${oversized.length > 1 ? "s" : ""} too large (max 50 MB): ${oversized.map((f) => f.name).join(", ")}`,
      );
      setBusy(false);
      return;
    }

    try {
      await Promise.all(
        Array.from(files).map((file) => addRecord(activePetId, file)),
      );
    } catch (err) {
      console.error("Upload failed", err);
      setError("Could not upload one or more files. Please try again.");
    } finally {
      setBusy(false);
      // Reset the input so the same file can be re-selected.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition-colors ${
          busy
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-surface hover:border-primary/40"
        }`}
      >
        {busy ? (
          <p className="text-sm font-medium text-primary">Uploading…</p>
        ) : (
          <>
            <p className="text-sm font-medium text-text">
              Upload records for this pet
            </p>
            <p className="text-xs text-muted">
              PDF, PNG, JPEG, WebP, or HEIC · max 50 MB per file
            </p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="btn-interactive inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text transition hover:border-primary/30 hover:bg-accent-sky/10"
            >
              Choose files
            </button>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
          aria-label="Upload pet health records"
        />
      </div>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
