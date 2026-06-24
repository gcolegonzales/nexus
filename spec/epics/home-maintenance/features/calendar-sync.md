---
id: FEAT-home-maintenance-7
title: Calendar sync (ICS, Google, Microsoft)
epic: home-maintenance
status: ready
depends_on: [FEAT-home-maintenance-3, FEAT-hub-shell-7]
---

## Summary
The `/sync` page turns the active home's enabled tasks into calendar reminders three ways: a
universal `.ics` download, Google Calendar sync, and Microsoft Outlook/365 sync. Provider syncs are
idempotent (update-in-place, no duplicates), remove disabled/deleted tasks, and keep a per-home,
per-provider queue of orphaned events to retry deletion.

## User stories
- As a privacy-conscious user, I want to export an `.ics` I can import anywhere, no account needed.
- As a Google/Microsoft user, I want enabled tasks pushed to a dedicated calendar and kept in sync.

## Acceptance criteria
- [ ] The sync page offers: **Universal export (.ics)**, **Google Calendar**, and **Outlook /
      Microsoft 365**, each showing the count of enabled tasks / connection status as appropriate.
- [ ] `.ics` export downloads a valid `VCALENDAR` with one `VEVENT` per enabled task: `UID`
      `{taskId}@nexus-home-maintenance`, all-day `DTSTART`/`DTEND` (start+1 day), `SUMMARY` from the
      task/asset, `DESCRIPTION` with instructions/parts/links/model, `RRULE FREQ=MONTHLY;INTERVAL=n`,
      and a 1-day-before `VALARM`; lines folded per RFC 5545.
- [ ] The event start date uses the same start-date math as the due-date engine
      (`FEAT-home-maintenance-5`); the event summary appends the asset label when it adds information.
- [ ] Connecting Google / Microsoft uses the shared OAuth (`FEAT-hub-shell-7`); connect buttons are
      disabled when the provider is not configured; `.ics` export always works regardless.
- [ ] A provider sync ensures a calendar named "Home Maintenance" exists (reusing the stored
      `googleCalendarId`/`microsoftCalendarId` if still valid, else finding by name, else creating it)
      and stores its id on the active home.
- [ ] For each enabled task it creates or updates (PATCH) the event by stored event id (falling back
      to create if update fails) and writes the event id back to the task; for each disabled task that
      had an event id it deletes the event and clears the id.
- [ ] Deleting an asset/task queues its event id in the home's per-provider `orphanedCalendarEvents`;
      each sync attempts those deletions and removes the ones that succeed, retaining failures for
      retry (no user-facing hard error on delete failure).
- [ ] A sync reports counts of synced and removed events; repeated syncs do not duplicate events.
- [ ] Microsoft events use `absoluteMonthly` recurrence with `dayOfMonth = min(startDay, 28)` and the
      profile timezone; Google events use `RRULE FREQ=MONTHLY;INTERVAL=n`.

## Constraints / non-goals
- Sync operates on the **active home** only; each home syncs to its own calendar id.
- No two-way sync: Nexus pushes to the provider; it does not import provider changes back.

## Affected areas
- `src/tools/home-maintenance/lib/{ics-export,event-description,calendar-sync-engine,google-sync,microsoft-sync,orphaned-events,calendar-dates}.ts`,
  `app/tools/home-maintenance/sync/{page.tsx,CalendarSyncPanel.tsx}`, `src/core/integrations/*`.

## Dependencies
- Schedule generation (`FEAT-home-maintenance-3`); OAuth integrations (`FEAT-hub-shell-7`);
  profile timezone (`FEAT-hub-shell-3`).

## Open questions
- [ ] None. (Month-end recurrence pinning to day 28 on Microsoft is intentional; see
      `spec/known-discrepancies.md`.)
