// ---------------------------------------------------------------------------
// Pet Health — full-archive export/import (jszip).
//
// The fallback durability path for browsers without File System Access. A single
// `.zip` bundles the same self-describing `pet-health.json` index produced by
// `fs-folder.ts`, plus every record's original file under per-pet folders.
//
// export and import are exact inverses:
//   - `exportArchive` writes files at the relative paths recorded in the index's
//     `files` map (`fileRef -> path`).
//   - `importArchive` parses the index, then reads each file back from that same
//     path and returns it keyed by its `fileRef`.
//
// PURE lib — no network. jszip is dynamically imported so it stays out of the
// server bundle; nothing here touches `window` at module load.
// ---------------------------------------------------------------------------

import type { PetHealthState } from "../types/state";
import { INDEX_FILE_NAME, buildIndex, type StorageIndex } from "./fs-folder";

/**
 * Build a zip Blob containing the index + original files. Records whose blob is
 * missing are described in the index but contribute no file entry. The caller
 * triggers the download (e.g. via `src/shared/download`).
 */
export async function exportArchive(
  state: PetHealthState,
  getBlob: (fileRef: string) => Promise<Blob | undefined>,
): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  const index = buildIndex(state);
  zip.file(INDEX_FILE_NAME, JSON.stringify(index, null, 2));

  for (const record of state.records) {
    const path = index.files[record.fileRef];
    if (!path) continue;
    const blob = await getBlob(record.fileRef);
    if (!blob) continue;
    zip.file(path, blob);
  }

  return zip.generateAsync({ type: "blob" });
}

export interface ImportedArchive {
  state: PetHealthState;
  files: { fileRef: string; blob: Blob }[];
}

/**
 * Read a previously exported archive: parse `pet-health.json`, then pull each
 * original file back out using the index's `fileRef -> path` map. Returns the
 * parsed state (without the internal `files` map) plus the file blobs keyed by
 * fileRef, ready for the caller to write into the working store.
 */
export async function importArchive(zipBlob: Blob): Promise<ImportedArchive> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(zipBlob);

  const indexEntry = zip.file(INDEX_FILE_NAME);
  if (!indexEntry) {
    throw new Error(`Archive is missing ${INDEX_FILE_NAME}; not a Pet Health archive.`);
  }

  const indexText = await indexEntry.async("string");
  const index = JSON.parse(indexText) as StorageIndex;
  const fileMap = index.files ?? {};

  const files: { fileRef: string; blob: Blob }[] = [];
  for (const [fileRef, path] of Object.entries(fileMap)) {
    const entry = zip.file(path);
    if (!entry) continue;
    const blob = await entry.async("blob");
    files.push({ fileRef, blob });
  }

  // Return state without the internal `files` map; it is an index-only detail.
  const { files: _omit, ...rest } = index;
  void _omit;
  const state: PetHealthState = rest;

  return { state, files };
}
