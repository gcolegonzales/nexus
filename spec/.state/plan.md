# Build plan — Pet Health (delta)

**Scope:** new epic `EPIC-pet-health` (FEAT-pet-health-1…6) + delta to `FEAT-hub-shell-1`
(registry/badge) and `FEAT-hub-shell-6` (export bundle v3). No other features are re-planned.

**Summary:** 15 tasks · 5 waves · models: 1 haiku / 10 sonnet / 4 opus · max parallel width 4
**Done-gate per task:** `npm run build` (compiles + typechecks) and `npm run lint` — there is no test
runner in this project (per `project.md`), so build + lint is the gate; acceptance criteria are
verified by exercising the app in `npm run dev`.

## Risks & gaps
- ⚠ **No automated tests.** The gate is build + lint only. Behavioral criteria (uploads, extraction,
  chat) need a manual pass in `npm run dev` after the build.
- ⚠ **Customized Next.js 16.** pdf.js worker setup (T-007), File System Access / SSR-safety (T-010),
  and client/server boundaries (all UI tasks) must follow `node_modules/next/dist/docs` per AGENTS.md
  — these are the likeliest build-breakers, hence opus on the two library tasks.
- ⚠ **Anthropic adapter (T-008)** must follow the `claude-api` skill for the correct endpoint,
  headers (incl. browser-access + `anthropic-version`), and current model id. OpenAI + Anthropic are
  two different request/response shapes behind one `sendChat`.
- ⚠ **Plaintext API key in IndexedDB** — accepted, documented tradeoff (ADR 0006); T-011 enforces it
  is excluded from the export bundle.
- ⚠ **FS Access is Chromium-best** — T-010/T-014 must degrade to archive export on Firefox/Safari.
- No acceptance criteria were left uncovered: every criterion in the six pet-health features and the
  two amended hub-shell features maps to at least one task (see mapping note at the bottom).

## Wave 1 (parallel — foundations, disjoint files)
- **T-001** · sonnet · FEAT-pet-health-3 — Add deps pdfjs-dist, tesseract.js, jszip · _package.json/lock_
- **T-002** · haiku · FEAT-pet-health-1 — Add `tool:pet-health` + `hub:ai-provider` storage keys
- **T-003** · sonnet · FEAT-pet-health-1 — Pet Health data-model types (Pet, Record, Conversation, AiConfig)
- **T-004** · sonnet · FEAT-hub-shell-1 — Register tool + `requiresAI` on ToolManifest + "AI Required" badge + icon

## Wave 2 (parallel — storage & pure libs)
- **T-005** · sonnet · FEAT-pet-health-2 — Storage layer: state slice + per-file Blob store (deps: T-002, T-003)
- **T-006** · sonnet · FEAT-pet-health-4 — AI provider config storage `hub:ai-provider` (deps: T-002, T-003)
- **T-007** · opus · FEAT-pet-health-3 — Extraction libs: PDF text layer + local Tesseract OCR (deps: T-001, T-003)
- **T-008** · opus · FEAT-pet-health-5 — Chat libs: system prompt, trim, OpenAI + Anthropic adapters (deps: T-003)

## Wave 3 (parallel — provider, durability libs, export bundle)
- **T-009** · opus · FEAT-pet-health-1 — `PetHealthProvider` (pets/records/conversations + async extraction) (deps: T-005, T-006)
- **T-010** · opus · FEAT-pet-health-6 — Durable-storage libs: persistent storage, FS-Access folder, jszip archive (deps: T-001, T-005)
- **T-011** · sonnet · FEAT-hub-shell-6 — Export/import bundle v3: add pet-health slice, exclude secrets, back-compat v1/v2 (deps: T-005)

## Wave 4 (parallel — UI, disjoint route/component files)
- **T-012** · sonnet · FEAT-pet-health-1 — Tool shell: layout + overview + pets UI (deps: T-009)
- **T-013** · sonnet · FEAT-pet-health-2 — Records vault UI: upload, list, edit, download, status (deps: T-009, T-007)
- **T-014** · sonnet · FEAT-pet-health-4 — Settings page: AI provider + durability controls (deps: T-009, T-006, T-010)

## Wave 5 (chat depends on the settings gate)
- **T-015** · sonnet · FEAT-pet-health-5 — Pet chat UI: context-grounded, gated, disclaimer, errors/retry (deps: T-009, T-008, T-014)

## Coverage map (feature → tasks)
- FEAT-pet-health-1 (registration, pets, badge, degrade): T-002, T-003, T-004, T-005, T-009, T-012
- FEAT-pet-health-2 (records vault): T-005, T-009, T-013
- FEAT-pet-health-3 (extraction): T-001, T-007, T-009, T-013
- FEAT-pet-health-4 (AI settings): T-006, T-014
- FEAT-pet-health-5 (chat): T-008, T-009, T-015
- FEAT-pet-health-6 (durable storage): T-010, T-014
- FEAT-hub-shell-1 (registry/badge): T-004
- FEAT-hub-shell-6 (export v3): T-011
