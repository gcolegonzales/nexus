---
id: FEAT-hub-shell-3
title: Household profile
epic: hub-shell
status: ready
depends_on: [FEAT-hub-shell-5]
---

## Summary
A single shared household identity (`HubProfile`) available app-wide via `ProfileProvider` and
edited at `/profile`. It captures display name, household name, timezone, locale, home setup date,
and free-form notes. Tools read it for sensible defaults (notably the maintenance schedule anchor
date and the timezone used for calendar events). It is local-only and auto-saves on edit.

## User stories
- As a user, I want to set my name, household, and home setup date once so tools can personalize
  and schedule sensibly.
- As a user, I want changes saved automatically with a clear "saved locally" confirmation.

## Acceptance criteria
- [ ] `HubProfile` fields are all optional: `displayName`, `householdName`, `timezone`, `locale`,
      `homeSetupDate` (ISO `YYYY-MM-DD`), `notes`.
- [ ] On first load with no stored profile, defaults are: `timezone` and `locale` from
      `Intl.DateTimeFormat().resolvedOptions()`, and `homeSetupDate` = today (`YYYY-MM-DD`).
- [ ] `ProfileProvider` exposes `profile`, `isReady` (false until first load completes),
      `updateProfile(patch)` (merge + persist), and `refreshProfile()` (reload from storage).
- [ ] `/profile` shows a loading state until `isReady`, then a form with: display name, household
      name, home setup date (with hint that it seeds maintenance schedules), timezone, and notes.
- [ ] Editing any field calls `updateProfile`; an empty string clears the field (stored as
      `undefined`); a transient "Saved Locally" confirmation appears after a save.
- [ ] The profile persists under the storage key `hub:profile` and survives reload.
- [ ] `refreshProfile()` is invoked after a data import so the form reflects imported values.

## Constraints / non-goals
- No server profile; no required fields; no strict validation of timezone/locale strings (free text).
- Profile is shared across tools and is **not** per-home/per-unit.

## Affected areas
- `src/core/profile/{types.ts,store.ts,ProfileProvider.tsx}`, `src/app/profile/{page.tsx,ProfileForm.tsx}`,
  `src/app/providers.tsx`.

## Dependencies
- Local-first storage (`FEAT-hub-shell-5`) for load/save.

## Open questions
- [ ] None. (Whether to debounce per-keystroke saves is a quality concern, not a behavior change —
      see `spec/known-discrepancies.md`.)
