// ---------------------------------------------------------------------------
// Pet Health — File System Access API "document folder" durability.
//
// CLIENT-ONLY. Every entry point is guarded by `isFolderSupported()`; nothing
// here touches `window` at module load, so it is safe to import in a client
// component and does not break SSR/build.
//
// When a folder is connected, the tool writes:
//   <root>/pet-health.json           — self-describing index (pets + record
//                                       metadata + extractedText + relative
//                                       file paths)
//   <root>/<petFolder>/<fileName>    — each record's original file, organized
//                                       per pet
//
// The folder is treated as a durable mirror. On reconnect, `readIndex()` parses
// `pet-health.json`; the folder is the source of truth for file bytes and the
// caller applies last-write-wins on metadata by `updatedAt`.
//
// The `pet-health.json` index format here is identical to the one produced by
// `archive.ts` (same `INDEX_FILE_NAME`, same shape) so the two durability paths
// stay consistent.
// ---------------------------------------------------------------------------

import type { PetHealthState, Pet, PetRecord } from "../types/state";

/** Name of the self-describing index written at the folder/zip root. */
export const INDEX_FILE_NAME = "pet-health.json";

/**
 * Sanitize a path segment so it is safe as a folder/file name on disk and inside
 * a zip. Strips characters illegal on common filesystems and collapses spaces.
 */
function sanitizeSegment(input: string): string {
  const cleaned = input
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+/, "")
    .slice(0, 80);
  return cleaned || "untitled";
}

/**
 * Per-pet subfolder name. Prefers the pet's display name (human-navigable),
 * falling back to the petId. Suffixed with a short id slice to disambiguate
 * pets that share a name.
 */
export function petFolderName(pet: Pet | undefined, petId: string): string {
  if (pet && pet.name.trim()) {
    return `${sanitizeSegment(pet.name)}-${petId.slice(0, 8)}`;
  }
  return sanitizeSegment(petId);
}

/**
 * Build the relative path (POSIX separators) a record's file is stored under,
 * relative to the folder/zip root: `<petFolder>/<fileName>`.
 */
export function recordRelativePath(
  record: PetRecord,
  petById: Map<string, Pet>,
): string {
  const folder = petFolderName(petById.get(record.petId), record.petId);
  return `${folder}/${sanitizeSegment(record.fileName)}`;
}

/**
 * The self-describing index. It is `PetHealthState` plus a `files` map that
 * records `fileRef -> relative path` so a stored file can be mapped back to its
 * record unambiguously on import/reconcile.
 */
export interface StorageIndex extends PetHealthState {
  /** Maps each record's fileRef to its stored relative path (POSIX). */
  files: Record<string, string>;
}

/** Build the `pet-health.json` index payload from state. */
export function buildIndex(state: PetHealthState): StorageIndex {
  const petById = new Map<string, Pet>(state.pets.map((p) => [p.id, p]));
  const files: Record<string, string> = {};
  for (const record of state.records) {
    files[record.fileRef] = recordRelativePath(record, petById);
  }
  return { ...state, files };
}

/** Feature-detect the File System Access directory picker. */
export function isFolderSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/**
 * Prompt the user to pick a document folder. Returns the directory handle, or
 * `null` when unsupported or the user cancels the picker.
 */
export async function connectFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFolderSupported() || !window.showDirectoryPicker) return null;
  try {
    return await window.showDirectoryPicker({ id: "pet-health", mode: "readwrite" });
  } catch {
    // AbortError (user cancelled) or SecurityError — treat as "no folder".
    return null;
  }
}

/** Write a Blob/string to `dir/<name>`, creating/truncating the file. */
async function writeFile(
  dir: FileSystemDirectoryHandle,
  name: string,
  data: Blob | string,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  try {
    await writable.write(data);
  } finally {
    await writable.close();
  }
}

/**
 * Write the full state mirror into the connected folder: a `pet-health.json`
 * index at the root, plus every record's original file under a per-pet
 * subfolder. Directories are created as needed. Records whose blob is missing
 * (e.g. not yet uploaded) are still described in the index but produce no file.
 */
export async function writeAll(
  handle: FileSystemDirectoryHandle,
  state: PetHealthState,
  getBlob: (fileRef: string) => Promise<Blob | undefined>,
): Promise<void> {
  const petById = new Map<string, Pet>(state.pets.map((p) => [p.id, p]));

  // Index first so the folder is self-describing even if a later write fails.
  const index = buildIndex(state);
  await writeFile(handle, INDEX_FILE_NAME, JSON.stringify(index, null, 2));

  // Group records by pet folder so each subfolder handle is opened once.
  const byFolder = new Map<string, PetRecord[]>();
  for (const record of state.records) {
    const folder = petFolderName(petById.get(record.petId), record.petId);
    const list = byFolder.get(folder);
    if (list) list.push(record);
    else byFolder.set(folder, [record]);
  }

  for (const [folder, records] of byFolder) {
    const petDir = await handle.getDirectoryHandle(folder, { create: true });
    for (const record of records) {
      const blob = await getBlob(record.fileRef);
      if (!blob) continue;
      await writeFile(petDir, sanitizeSegment(record.fileName), blob);
    }
  }
}

/**
 * Read and parse `pet-health.json` from the connected folder, if present.
 * Returns the parsed `PetHealthState`, or `null` when the index is absent or
 * unreadable. The caller reconciles this against the working store (folder is
 * source of truth for file bytes; metadata merged last-write-wins by
 * `updatedAt`).
 */
export async function readIndex(
  handle: FileSystemDirectoryHandle,
): Promise<PetHealthState | null> {
  try {
    const fileHandle = await handle.getFileHandle(INDEX_FILE_NAME, { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as PetHealthState;
  } catch {
    // NotFoundError (no index yet) or parse error — nothing to reconcile from.
    return null;
  }
}
