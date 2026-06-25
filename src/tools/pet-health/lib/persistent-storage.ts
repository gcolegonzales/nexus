// ---------------------------------------------------------------------------
// Pet Health — persistent-storage durability helper.
//
// Wraps `navigator.storage.persist()` / `.persisted()` so the browser will not
// silently evict the pet data under storage pressure. All calls degrade
// gracefully: when the Storage API is unavailable (older browsers, SSR), we
// report `supported: false` and `persisted: false` instead of throwing.
//
// PURE lib — no React, no network. Safe to import in a client component; the
// browser-only `navigator` access is feature-detected so it never executes
// during SSR/build.
// ---------------------------------------------------------------------------

export interface PersistResult {
  /** Whether storage is currently persisted (won't be evicted). */
  persisted: boolean;
  /** Whether the Storage persistence API is available in this environment. */
  supported: boolean;
}

function hasStorageManager(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.storage !== "undefined" &&
    typeof navigator.storage.persist === "function" &&
    typeof navigator.storage.persisted === "function"
  );
}

/**
 * Request persistent storage for this origin. Returns the resulting state.
 * Degrades gracefully to `{ persisted: false, supported: false }` when the API
 * is unavailable or throws.
 */
export async function requestPersistentStorage(): Promise<PersistResult> {
  if (!hasStorageManager()) {
    return { persisted: false, supported: false };
  }
  try {
    const persisted = await navigator.storage.persist();
    return { persisted, supported: true };
  } catch {
    return { persisted: false, supported: true };
  }
}

/**
 * Report whether storage is already persisted, without requesting it.
 * Degrades gracefully to `{ persisted: false, supported: false }` when the API
 * is unavailable or throws.
 */
export async function isPersisted(): Promise<PersistResult> {
  if (!hasStorageManager()) {
    return { persisted: false, supported: false };
  }
  try {
    const persisted = await navigator.storage.persisted();
    return { persisted, supported: true };
  } catch {
    return { persisted: false, supported: true };
  }
}
