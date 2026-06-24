---
id: FEAT-hub-shell-6
title: Backup & restore (export / import bundle)
epic: hub-shell
status: ready
depends_on: [FEAT-hub-shell-5]
---

## Summary
A versioned JSON bundle that captures the profile plus every tool's state slice, so a user can move
or back up all their Nexus data as one file. Export downloads the file; import validates it,
confirms with the user, replaces local data, and reloads.

## User stories
- As a privacy-conscious user, I want to download all my data as one JSON file for backup.
- As a user moving to a new browser/device, I want to import that file to restore everything.

## Acceptance criteria
- [ ] Export builds a bundle `{ version, exportedAt, profile, tools }` where `tools` contains the
      `home-maintenance` and `room-coat` state slices; current export version is **2**.
- [ ] Export downloads a file named `nexus-export-YYYY-MM-DD.json` (date from `exportedAt`) with
      MIME `application/json`, then shows a success confirmation.
- [ ] Import accepts a JSON file (`application/json,.json`), parses it, and validates via
      `isNexusExportBundle` (accepts `version` 1 **or** 2; requires a `tools` object).
- [ ] A **v1** bundle (profile + `home-maintenance` only) imports successfully; the room-coat slice
      is treated as absent and the room-coat importer seeds a fresh default.
- [ ] Before replacing data, import asks for confirmation ("Import will replace your local Nexus
      data on this device. Continue?"); on cancel, nothing changes.
- [ ] On confirm, import overwrites the profile (merged with defaults) and each tool slice via that
      tool's import function (which normalizes/migrates), calls `refreshProfile()`, shows
      "Import complete", and reloads the app.
- [ ] Invalid files (unparseable, wrong shape, unsupported version) show an error and make no changes.
- [ ] Export and import controls are disabled while an export/import is in progress.

## Constraints / non-goals
- Import is **replace**, not merge. There is no partial/selective import.
- The bundle shape is versioned; adding a tool's slice requires bumping the export version and
  handling older versions on import.

## Affected areas
- `src/core/export/bundle.ts`, `src/app/settings/SettingsPanel.tsx`, each tool's
  `importXxxSlice` (`src/tools/*/storage`), `src/core/profile/store.ts`.

## Dependencies
- Local-first storage (`FEAT-hub-shell-5`); each tool's slice importer (`FEAT-home-maintenance-*`,
  `FEAT-room-coat-*`).

## Open questions
- [ ] None. (Replacing the native `window.confirm` with an in-app modal is a quality nicety tracked
      in `spec/known-discrepancies.md`, not a behavior change.)
