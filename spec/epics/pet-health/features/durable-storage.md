---
id: FEAT-pet-health-6
title: Durable local storage — own folder & full archive
epic: pet-health
status: ready
depends_on: [FEAT-pet-health-2]
---

## Summary
Make "you own your data forever" real without a backend. Two mechanisms: (1) request **persistent
storage** so the browser will not silently evict the pet data; and (2) let the user connect a
**document folder on their own disk** (File System Access API) where each pet's original files are
written as real files alongside a JSON index, so the data survives a browser wipe and is portable by
the user's own means (external drive, iCloud, Dropbox). A **full-archive export** (a single
downloadable archive containing the original files plus the index) is the fallback for browsers
without folder access. When neither folder nor archive is used, data still lives in IndexedDB as the
working store; the folder/archive is the durable, user-owned copy.

## User stories
- As a pet owner, I want my documents to keep existing even if I clear my browser or it runs low on
  space.
- As a pet owner, I want my files saved into a folder I control on my own computer, as real files I
  can see and back up myself.
- As a pet owner on a browser without folder access, I want a single archive I can download to keep
  everything.

## Acceptance criteria
- [ ] On first storing data (or via a settings action), the tool calls `navigator.storage.persist()`
      and surfaces the resulting persistence state; it degrades gracefully if the API is unavailable
      or the request is denied (data still works, with a note that durability isn't guaranteed).
- [ ] Where the File System Access API is available, the user can **connect a document folder**; the
      tool writes each record's original file into that folder (organized per pet) plus a JSON index
      (e.g. `pet-health.json`) describing pets, record metadata, and extracted text, so the folder is
      self-describing and human-navigable (real PDFs/images).
- [ ] With a folder connected, new/updated/deleted records are reflected in the folder; on reload the
      tool can reconnect the folder and reconcile from it (the folder is treated as a durable mirror /
      source of the user's owned copy).
- [ ] Where the File System Access API is **not** available (e.g. Firefox/Safari), the connect-folder
      option is hidden/disabled and the user is offered a **full-archive export** instead: a single
      download bundling the original files + the JSON index; a matching import restores them.
- [ ] No backend, account, or network is involved in any of this; all writes are to the user's own
      device/disk. (See ADR 0007.)
- [ ] The tool clearly communicates the current durability posture (persistent? folder connected?
      last archive export?) so the user knows how protected their data is.

## Constraints / non-goals
- No cross-device sync (explicit non-goal for now; a future opt-in sync could layer on top — see
  `product.md` non-goals).
- No automatic cloud backup; "save to folder" and archive export are user-initiated.
- File System Access is best-effort and browser-dependent; IndexedDB remains the always-available
  working store and the fallback path.

## Affected areas
- `src/tools/pet-health/lib/{persistent-storage,fs-access-folder,archive}.ts`,
  `src/tools/pet-health/components/StorageSettings*`, record storage in `FEAT-pet-health-2`.

## Dependencies
- Records vault (`FEAT-pet-health-2`).

## Open questions
- None. (Resolved during planning: IndexedDB is the working store; when a folder is connected the app
  writes through to it, and on reconnect the folder's JSON index is the source of truth for file bytes
  with metadata merged last-write-wins by an `updatedAt` timestamp. No automatic three-way merge in
  v1.)
