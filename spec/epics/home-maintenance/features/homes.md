---
id: FEAT-home-maintenance-1
title: Homes & multi-home management
epic: home-maintenance
status: ready
depends_on: [FEAT-hub-shell-5]
---

## Summary
Home Maintenance scopes all data to a **Home**. Users can keep several homes (e.g. a landlord's
properties), switch the active one, and edit per-home settings (name, setup date, HVAC filter size,
notes, and the per-provider calendar links populated by sync). The active home determines which
assets and tasks the rest of the tool shows.

## User stories
- As a landlord, I want multiple homes with isolated assets, tasks, and calendar links.
- As a user, I want to switch the active home and edit its details from the tool header.

## Acceptance criteria
- [ ] `Home` has: `id`, `name`, optional `hvacFilterSize`, `setupDate`, `notes`, `googleCalendarId`,
      `microsoftCalendarId`, and `orphanedCalendarEvents { google: string[]; microsoft: string[] }`.
- [ ] On first run (no stored slice) the tool creates one home named "Home", seeds its assets
      (`FEAT-home-maintenance-2`), generates its schedule, and marks the slice `initialized`.
- [ ] A home switcher in the tool header lists homes, shows the active one, and offers "Manage Home"
      (edit/delete active home) and add-home actions.
- [ ] `addHome(name)` creates a home, makes it active, and **regenerates its schedule** (seeds default
      tasks for the new home).
- [ ] `updateHome(id, patch)` merges name/setupDate/notes/hvacFilterSize/calendar ids; changing
      `hvacFilterSize` **triggers schedule regeneration**; the home's house-asset nickname stays in
      sync with the home name.
- [ ] `deleteHome(id)` is blocked when only one home remains; otherwise it removes the home and all of
      its assets, tasks, and completions, reassigns the active home (to another home, else empty), and
      regenerates schedules.
- [ ] `setActiveHomeId(id)` switches the active home without regenerating schedules; only homes that
      exist can be made active.
- [ ] The provider exposes `activeHome`, `activeAssets` (appliances only, excludes the house asset),
      `activeAllAssets` (incl. house), and `activeTasks` (active home's tasks).
- [ ] Each home keeps independent calendar ids and orphaned-event queues per provider.

## Constraints / non-goals
- There is always at least one home; the last one cannot be deleted.
- `Home.setupDate` is informational; the **schedule anchor** comes from the shared profile's
  `homeSetupDate` (see `FEAT-home-maintenance-5` and `spec/known-discrepancies.md`).

## Affected areas
- `src/tools/home-maintenance/types/{home.ts,state.ts}`, `HomeMaintenanceProvider.tsx`,
  `components/{HomeSwitcher,HomeManageForm}.tsx`, `lib/home-scope.ts`, `storage/index.ts`,
  `app/tools/home-maintenance/homes/[id]/page.tsx` (redirect to overview).

## Dependencies
- Storage (`FEAT-hub-shell-5`); schedule generation (`FEAT-home-maintenance-3`).

## Open questions
- [ ] None.
