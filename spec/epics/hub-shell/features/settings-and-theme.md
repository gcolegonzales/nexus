---
id: FEAT-hub-shell-4
title: Settings & theming
epic: hub-shell
status: ready
depends_on: [FEAT-hub-shell-6]
---

## Summary
The `/settings` page groups app-wide preferences: appearance (light/dark/system theme), backup &
restore (export/import — detailed in `FEAT-hub-shell-6`), and a shortcut into Home Maintenance
calendar sync. Theme is provided by `@nexus/ui` and applied before hydration to avoid a flash.

## User stories
- As a user, I want to choose light, dark, or system theme and have it remembered.
- As a user, I want one place to back up/restore my data and to reach calendar sync.

## Acceptance criteria
- [ ] `/settings` renders three sections: **Appearance**, **Backup & restore**, **Calendar sync**.
- [ ] Appearance uses `ThemeSelector` (light / dark / system); the choice persists across reloads
      and is applied before first paint (no flash of wrong theme) via the `@nexus/ui` `ThemeScript`.
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
  (`ThemeProvider`).

## Dependencies
- Backup & restore (`FEAT-hub-shell-6`).

## Open questions
- [ ] None.
