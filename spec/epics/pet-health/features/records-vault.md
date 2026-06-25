---
id: FEAT-pet-health-2
title: Medical records & document vault
epic: pet-health
status: done
depends_on: [FEAT-pet-health-1]
---

## Summary
A per-pet store for **records** — uploaded vet medical records and sign-out / discharge documents.
Users upload PDF or image files; each upload becomes a record with editable metadata and the
original file kept locally. Records are listed per pet, openable/downloadable, editable, and
deletable. The raw file bytes are stored in IndexedDB separately from the JSON state slice so the
slice stays serializable; the slice holds record metadata plus a reference to the stored file.

## User stories
- As a pet owner, I want to upload the PDFs and photos my vet gives me and keep them with the right
  pet.
- As a pet owner, I want to label each record (title, date, type, which vet) so I can find it later.
- As a pet owner, I want to re-open or download an original document I uploaded.

## Acceptance criteria
- [ ] Within a pet, users can upload one or more files via a file input accepting
      `application/pdf` and common image types (`image/png`, `image/jpeg`, `image/webp`,
      `image/heic` where the browser supports it); drag-and-drop is acceptable but not required.
- [ ] Each upload creates a record with: `id`, `petId`, `title` (defaulting to the filename),
      `documentType` (e.g. `medical-record` | `discharge` | `lab` | `imaging` | `invoice` | `other`),
      `documentDate` (user-editable; defaults empty), `source`/`vet`, `fileName`, `mimeType`,
      `fileSize`, `uploadedAt`, and a `fileRef` id; metadata fields except the file are editable.
- [ ] The original file bytes are stored in IndexedDB under a per-file key (e.g.
      `tool:pet-health:file:{fileRef}`) as a Blob; the `tool:pet-health` state slice stores only the
      record metadata and `fileRef`, keeping the slice JSON-serializable.
- [ ] Records are listed under their pet (most recent first by `documentDate` then `uploadedAt`),
      showing title, type, date, and size; users can open/preview, download the original, edit
      metadata, and delete a record.
- [ ] Deleting a record removes both its metadata from the slice and its stored file Blob; deleting a
      pet (`FEAT-pet-health-1`) cascades to delete all of that pet's records and their file Blobs.
- [ ] Extracted text for a record (produced by `FEAT-pet-health-3`) is stored on the record and is
      what the chat consumes; this feature owns storing/clearing it alongside the record lifecycle.
- [ ] All record operations persist to IndexedDB and survive reload.

## Constraints / non-goals
- No server upload, virus scanning, or cloud storage; files live only in this browser's IndexedDB.
- No in-app PDF/image editing or annotation — store and display only.
- A practical per-file size guard is acceptable (warn/refuse very large files) to protect IndexedDB.

## Affected areas
- `src/tools/pet-health/types/*`, `src/tools/pet-health/storage/*` (slice + per-file Blob store),
  `src/tools/pet-health/PetHealthProvider.tsx`, `src/app/tools/pet-health/**` (records UI),
  `src/shared/download/downloadBlob.ts` (download original).

## Dependencies
- Pets registry (`FEAT-pet-health-1`).

## Open questions
- None. (Resolved during planning: the durable "forever" copy of raw files is the user's connected
  document folder / full archive (`FEAT-pet-health-6`); the hub JSON export (`FEAT-hub-shell-6`)
  carries record metadata + extracted text only and does **not** base64 the binaries.)
