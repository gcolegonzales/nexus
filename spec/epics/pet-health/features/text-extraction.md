---
id: FEAT-pet-health-3
title: In-browser text extraction
epic: pet-health
status: done
depends_on: [FEAT-pet-health-2]
---

## Summary
Turn each uploaded record into machine-readable text so the AI chat can use it as context. For
digital PDFs, extract the embedded text layer in the browser. For scanned PDFs and images that have
no usable text layer, fall back to OCR (or a vision pass) to recover the text. Extraction runs
client-side, stores the result on the record, and reports per-record status so the user knows what
the assistant can actually "read".

## User stories
- As a pet owner, I want the assistant to understand the contents of a PDF I uploaded without me
  retyping it.
- As a pet owner who uploaded a scanned/photographed document, I want its text recovered too.
- As a pet owner, I want to see whether a record was successfully read, and re-run extraction if it
  failed.

## Acceptance criteria
- [ ] On upload (and on demand via a "re-extract" action), the tool attempts text extraction for the
      record and stores the result as `extractedText` plus an `extractionStatus`
      (`pending` | `extracting` | `done` | `empty` | `failed`) and `extractionMethod`
      (`pdf-text` | `ocr` | `vision` | `none`).
- [ ] **Digital PDFs:** the embedded text layer is extracted in-browser (e.g. via `pdfjs`) without a
      network call; multi-page text is concatenated with page markers.
- [ ] **Scanned PDFs / images:** when no usable text layer is found (or the file is an image), the
      tool falls back to **local OCR (Tesseract.js WASM, no network, no key)** to produce text. This
      keeps the vault fully usable without an AI key. (A higher-quality vision-model extraction using
      the configured AI key is a deferred enhancement, out of scope for v1.)
- [ ] Extraction runs without blocking the UI (async, with a visible per-record status) and is
      idempotent: re-running replaces the stored text and status.
- [ ] `extractedText` is persisted on the record (slice) so it is available to chat without
      re-processing the file each session, and is cleared when the record/pet is deleted.
- [ ] The records list surfaces extraction status (e.g. "Readable", "No text found", "Failed") so the
      user understands the assistant's coverage of that record.

## Constraints / non-goals
- Extraction quality is best-effort; this is not a clinical-grade OCR or medical-NLP pipeline.
- No server-side processing; in v1 extraction is fully in-browser with **no network egress** (PDF
  text layer + local Tesseract.js OCR). The deferred vision-model path would be the only egress if
  added later.
- No structured medical parsing (no extracting dosages/dates into fields) — plain text only.

## Affected areas
- `src/tools/pet-health/lib/extract-*.ts` (PDF text + OCR/vision fallback), record types/storage
  (add `extractedText`, `extractionStatus`, `extractionMethod`), records UI status badges.

## Dependencies
- Records vault (`FEAT-pet-health-2`). (No dependency on AI settings in v1 — OCR is local.)

## Open questions
- None. (Resolved during planning: OCR is **local Tesseract.js WASM** — no egress, no key — so
  extraction works without AI configured; vision-model extraction is a deferred enhancement.)
