---
id: FEAT-hub-shell-4
title: Settings & theming
epic: hub-shell
status: ready
depends_on: [FEAT-hub-shell-6]
---

## Summary
The `/settings` page groups app-wide preferences: appearance (light/dark/system theme), the **AI
provider** (the bring-your-own-key config used by AI features across tools — relocated here from the
Pet Health tool), backup & restore (export/import — detailed in `FEAT-hub-shell-6`), and a shortcut
into Home Maintenance calendar sync. Theme is provided by `@nexus/ui` and applied before hydration to
avoid a flash.

## User stories
- As a user, I want to choose light, dark, or system theme and have it remembered.
- As a user, I want one place to back up/restore my data and to reach calendar sync.

## Acceptance criteria
- [ ] `/settings` renders these sections: **Appearance**, **AI Provider**, **Backup & restore**,
      **Calendar sync**.
- [ ] Appearance uses `ThemeSelector` (light / dark / system); the choice persists across reloads
      and is applied before first paint (no flash of wrong theme) via the `@nexus/ui` `ThemeScript`.
- [ ] The **AI Provider** section is the single, app-wide place to configure the bring-your-own-key AI
      (provider + key + model), stored under `hub:ai-provider` and excluded from export (per
      `FEAT-pet-health-4` / ADR 0006). It supports OpenAI and Anthropic, a masked key input, and a
      **model dropdown** populated from the provider's available models after a key is set (with a
      curated fallback list and a sensible default); see `FEAT-pet-health-4` for the detailed behavior.
      Tools (e.g. Pet Health chat) read AI availability from this hub config; the per-tool AI settings
      UI is removed.
- [ ] The Account-menu theme toggle (`FEAT-hub-shell-2`) and the Settings selector stay consistent
      (both reflect the same persisted preference).
- [ ] The Calendar-sync section explains `.ics` export / Google connect and links to
      `/tools/home-maintenance/sync` via an "Open calendar sync" button.
- [ ] The Backup & restore section renders the export/import controls specified in `FEAT-hub-shell-6`.

## Constraints / non-goals
- Theme storage mechanism and keys are owned by `@nexus/ui`; this feature only mounts the controls.
- No other app-wide settings exist today (no language switch beyond locale in profile, etc.).

## Affected areas
- `src/app/settings/{page.tsx,SettingsPanel.tsx}`, `@nexus/ui` theme components, `src/app/providers.tsx`
  (`ThemeProvider`), the relocated AI provider settings UI (from `src/tools/pet-health/components/AiSettings.tsx`).

## Dependencies
- Backup & restore (`FEAT-hub-shell-6`); AI provider config + model discovery (`FEAT-pet-health-4`).

## Open questions
- [ ] None.
