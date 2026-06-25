import { getItem, setItem, removeItem } from "@/core/storage/db";

// ---------------------------------------------------------------------------
// Per-file Blob store for Pet Health
//
// Files are stored under the key `tool:pet-health:file:{fileRef}` in the
// shared IndexedDB kv store. The JSON slice (PetHealthState) only holds
// metadata + fileRef — never the Blob itself.
// ---------------------------------------------------------------------------

function fileKey(fileRef: string): string {
  return `tool:pet-health:file:${fileRef}`;
}

/**
 * Persist a Blob for the given fileRef.
 */
export async function putRecordFile(
  fileRef: string,
  blob: Blob,
): Promise<void> {
  await setItem(fileKey(fileRef), blob);
}

/**
 * Retrieve the Blob for the given fileRef.
 * Returns undefined when no file is stored under that key.
 */
export async function getRecordFile(
  fileRef: string,
): Promise<Blob | undefined> {
  return getItem<Blob>(fileKey(fileRef));
}

/**
 * Delete the Blob for the given fileRef.
 */
export async function deleteRecordFile(fileRef: string): Promise<void> {
  await removeItem(fileKey(fileRef));
}
