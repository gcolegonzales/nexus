# Build plan — UI refinement delta

**Scope:** FEAT-hub-shell-4/8/9/10 + FEAT-pet-health-1/2/4/5/6. Branch `spec-build/ui-refinement-1`.

**Summary:** 9 tasks · 3 waves · models: 1 haiku / 5 sonnet / 3 opus · max parallel width 3
**Done-gate per task:** `npm run build` + `npm run lint` (no test runner; behavioral checks via `npm run dev`).

## Risks & gaps
- ⚠ Title Case acronym handling (T-016) is the correctness crux — "AI", "CSV", "OpenAI", "3D" must survive; idempotent + inner-caps rule.
- ⚠ Modal guard (T-020) touches the shared Modal used everywhere — save-bypass must be exact so normal submit-and-close doesn't prompt.
- ⚠ DataTable (T-021) is a new shared primitive consumed by Records (T-024) in the next wave.
- ⚠ Provider AI `/v1/models` fetch (T-017) — two provider shapes; must fall back gracefully and never block save.
- File ownership split to avoid wave conflicts: `settings/page.tsx` + `PetHealthProvider.tsx` owned by T-022; `ToolLayout.tsx`/overview `page.tsx` by T-018; `SettingsPanel.tsx`/`ai-config.ts` by T-017; `Modal.tsx`/`PetForm`/`RecordEditModal` by T-020.

## Wave 1 (independent)
- **T-016** · sonnet · FEAT-hub-shell-8 — `titleCase()` utility + exports
- **T-017** · opus · FEAT-pet-health-4 — Relocate AI settings to hub `/settings` + model dropdown (provider `/v1/models`)
- **T-018** · sonnet · FEAT-pet-health-1 — Overview dashboard + top-right pet selector; remove duplicate nav

## Wave 2
- **T-019** · sonnet · FEAT-hub-shell-8 — Apply titleCase in Button/Badge/nav/section/ToolCard; opt-in prop on PageHeader/Card (deps: T-016)
- **T-020** · opus · FEAT-hub-shell-9 — Modal unsaved-changes guard + form dirty opt-in (deps: T-016)
- **T-021** · opus · FEAT-hub-shell-10 — Reusable `DataTable<T>` in @nexus/ui (deps: T-016)
- **T-022** · sonnet · FEAT-pet-health-6 — Auto persistent storage; strip posture/folder; tool settings = Export Archive only; remove AI section (deps: T-017)
- **T-023** · haiku · FEAT-pet-health-5 — Chat gate links to hub `/settings` (deps: T-017)

## Wave 3
- **T-024** · sonnet · FEAT-pet-health-2 — Records list on the shared DataTable (deps: T-021)
