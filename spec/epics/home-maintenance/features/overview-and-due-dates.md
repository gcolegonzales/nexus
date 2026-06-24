---
id: FEAT-home-maintenance-5
title: Overview dashboard & due-date engine
epic: home-maintenance
status: ready
depends_on: [FEAT-home-maintenance-3]
---

## Summary
The tool's landing page (`/tools/home-maintenance`) summarizes the active home: how many assets,
what's due now, and what needs info. The due-date engine computes each task's current due date from
the schedule anchor, interval, start offset, and last completion, classifying it as overdue,
due-soon, or upcoming.

## User stories
- As a user, I want an at-a-glance view of what maintenance is due so I know what to do next.
- As a user, I want overdue items called out clearly and surfaced first.

## Acceptance criteria
- [ ] The overview shows stat cards: appliance asset count (excludes house), "due now" count, and
      "needs info" count.
- [ ] A "needs info" warning card appears when any asset/task is missing required configuration.
- [ ] The current-tasks list shows only tasks that are overdue, due within 30 days, or whose HVAC
      filter is flagged `replacementNeeded`; it sorts replacement-recommended first, then overdue,
      then due-soon, then by date; an empty state reads "Nothing due".
- [ ] Due-date math: the **start date** is `lastCompletion.at + intervalMonths` when a valid
      completion exists, else `scheduleAnchor + startOffsetDays`. The **current due date** is that
      start date advanced by whole `intervalMonths` steps until it is ≥ today.
- [ ] The **schedule anchor** is the profile's `homeSetupDate` when valid, otherwise today.
- [ ] Classification: `daysUntil < 0` → overdue; `0 ≤ daysUntil ≤ 30` → due-soon; otherwise →
      upcoming (not shown on the overview).
- [ ] Only `enabled` tasks are considered for "due now".
- [ ] Marking a task complete from the overview advances its next due date (per the math above).

## Constraints / non-goals
- The anchor is global (from profile), not per-home (documented in `spec/known-discrepancies.md`).
- The overview is read + complete only; full editing lives on `/schedule`.

## Affected areas
- `src/app/tools/home-maintenance/page.tsx`, `lib/{task-due,calendar-dates,completions,needs-info}.ts`,
  `components/{OverviewTaskRow,TaskCompleteActions}.tsx`.

## Dependencies
- Schedule generation (`FEAT-home-maintenance-3`); profile (`FEAT-hub-shell-3`).

## Open questions
- [ ] None.
