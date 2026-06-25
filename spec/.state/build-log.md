# Build log — Pet Health (spec-build/pet-health-1)

Append-only audit trail. One entry per task and per wave integration.

## Setup
- Branch `spec-build/pet-health-1` created off `master`; spec slice + plan committed (b42b7cd).
- Execution model: tasks run in dependency order in the main working tree (worktrees omitted because
  `node_modules` is not shared into worktrees, which would break the `npm run build` gate). Each task
  is gated on `npm run build` + `npm run lint` and committed when green.

## Wave 1
- T-001 (sonnet) done · pdfjs-dist ^6.0.227, tesseract.js ^7.0.0, jszip ^3.10.1 · build+lint green · dffb032
- T-002 (haiku) done · STORAGE_KEYS += petHealth, aiProvider · 0a31dc1
- T-003 (sonnet) done · Pet/PetRecord/ChatMessage/PetHealthState + AiProvider/AiProviderConfig types · c0527b6
- T-004 (sonnet) done · ToolManifest.requiresAI, manifest, registry, mint icon, "AI Required" badge in ToolCard · 14c1a1e
- **Wave 1 integration: build OK, lint 0 errors / 96 pre-existing warnings.**

## Wave 2
- T-005 (sonnet) done · storage slice (load/save/import + schemaVersion) + per-file Blob store · 2e5fb36
- T-006 (sonnet) done · ai-config under hub:ai-provider; defaults anthropic=claude-sonnet-4-6, openai=gpt-4o · f0e4444
- T-007 (opus) done · PDF text-layer + Tesseract OCR; Turbopack worker via new Worker(new URL); client-only, graceful degrade · 1bc188f
- T-008 (opus) done · system-prompt builder, oldest-first trim, OpenAI + Anthropic adapters (browser-direct, anthropic-dangerous-direct-browser-access) · 748cb41
- **Wave 2 integration: build OK, lint 0 errors / 96 warnings.**

## Wave 3
- T-009 (opus) done · PetHealthProvider (RoomCoat stateRef pattern); pets/records/conversations + cascade delete + async extraction · 7960085
- T-010 (opus) done · persistent-storage, fs-folder (pet-health.json index + files map), jszip archive; fs-access.d.ts ambient types · abb5bf7
- T-011 (sonnet) done · export bundle v3 + pet-health slice; v1/v2 back-compat; secrets excluded · a1cc9ac
- **Wave 3 integration: build OK, lint 0 errors / 98 warnings (2 new non-blocking warnings from new code).**

## Wave 4
- T-012 (sonnet) done · layout+overview+pets UI; reuses ToolShell + useConfirm() from @nexus/ui · 1fb4c7d
- T-013 (sonnet) done · records vault UI: upload, list, status badges, open/download/edit/delete/re-extract · a87a160
- T-014 (sonnet) done · settings: AI provider (masked key) + durability (persist/folder/archive); useAiAvailable()/isAiReady() · f8b7aa0
- **Wave 4 integration: build OK (routes /tools/pet-health, /records, /settings prerender), lint 0 errors / 102 warnings.**

## Wave 5
- T-015 (sonnet) done · per-pet chat UI: gated when no key, context-grounded send, trim notice, readable errors+retry, clear-conversation, persistent non-clinical disclaimer · 7e7bebe
- **Wave 5 integration: build OK (routes /tools/pet-health + /chat + /records + /settings prerender), lint 0 errors / 104 warnings.**

## Final
- All 15 tasks done across 5 waves. Final `npm run build` ✓, `npm run lint` 0 errors (104 warnings, all pre-existing room-coat style warnings + a few benign new ones; none block the gate).
- Branch `spec-build/pet-health-1`. Not pushed. No automated tests in repo — behavioral verification (real upload→extract→chat with a live key) is a manual `npm run dev` pass.

## Runtime verification (npm run dev, browser preview)
Verified working at runtime, no console errors anywhere:
- Landing tile renders with "Available" + "AI Required" badges; tool route loads; nav (Overview/Records/AI Chat/Settings) works.
- Empty state shows graceful-degradation copy ("document vault works… no account or API key needed").
- Pet renders from storage (seeded a pet directly into IndexedDB `tool:pet-health` — provider load/normalize/render works; age-from-DOB computed = "6 yr").
- Records page shows upload UI with correct accept types (`application/pdf,image/png,image/jpeg,image/webp,image/heic`, 50 MB cap).
- AI Chat correctly GATED when no key ("AI provider not configured… Configure AI in Settings").
- Settings: API key (masked password input) saved → IndexedDB `hub:ai-provider` = {provider:anthropic, apiKey, model:claude-sonnet-4-6}; configured state shows masked key `••••••••••••0000` (full key never rendered); model default pre-filled.
- Chat UN-gates once key present; non-clinical disclaimer shown; textarea + Send render.
- Chat send pipeline exercised with a DUMMY key: real browser-direct call to Anthropic (CORS allowed via `anthropic-dangerous-direct-browser-access`), got genuine 401, surfaced READABLE error "Anthropic rejected the API key (401). Check your key in AI settings." + Retry; user message preserved, history uncorrupted.

- **Real PDF upload → extraction PROVEN:** uploaded a valid text-layer PDF via the records UI → record created, pdf.js initialized in the Turbopack build, extracted text correctly (method `pdf-text`, status `done` → "Readable" badge), stored on the record. Records list shows it with Open/Download/Edit/Re-extract/Delete. This is the full upload→review path working end to end on a real file.
- **Species dropdown wiring confirmed by code:** PetForm uses the shared `@nexus/ui` `Select` (same component shipped in Room Coat / Home Maintenance) with onChange→setDraft→createPet; the automation harness just couldn't drive its portaled listbox.

NOT exercised at runtime (needs real inputs only a human has):
- A SUCCESSFUL AI reply / context grounding — needs a VALID paid API key (the hookup is proven up to a real authenticated 401 from Anthropic; only the happy-path response remains unseen).
- Tesseract OCR on a scanned image (the local OCR fallback) — needs a real scanned image; the PDF text-layer path is proven.
- File System Access "connect folder" flow — needs the native OS picker.
- Branch pushed to origin (spec-build/pet-health-1). gh CLI not installed → PR opened via web link.

## UI refinement delta (spec-build/ui-refinement-1)
9 tasks, 3 waves, all build+lint gated; final build + lint green (0 errors).
- T-016 titleCase util · T-017 AI settings → hub + model dropdown · T-018 overview dashboard + top-right pet selector
- T-019 apply titleCase in primitives · T-020 modal unsaved-changes guard · T-021 reusable DataTable · T-022 auto durability + simplified tool settings · T-023 chat gate → hub /settings
- T-024 records list on shared DataTable
