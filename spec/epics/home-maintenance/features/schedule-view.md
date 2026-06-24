---
id: FEAT-home-maintenance-4
title: Schedule view & task editing
epic: home-maintenance
status: ready
depends_on: [FEAT-home-maintenance-3]
---

## Summary
The `/schedule` page lists the active home's tasks with filtering and inline editing. Users tune any
task's title, recurrence interval, start offset, instructions, parts, and purchase links, and
enable/disable tasks. Edits are saved field-level and never trigger schedule regeneration.

## User stories
- As a user, I want to see all my maintenance tasks and filter to the ones I care about.
- As a user, I want to customize a task's details and turn tasks on/off without losing my changes.

## Acceptance criteria
- [ ] `/schedule` lists `activeTasks` as accordion rows sorted by title; each row shows instructions,
      parts, links, completion state, and edit controls.
- [ ] A status filter offers `all | enabled | disabled`; an asset multi-select filters rows to the
      chosen assets; filters combine.
- [ ] The task edit form lets the user change `title`, `intervalMonths` (≥ 1), `startOffsetDays`,
      `instructions`, `parts` (name/partNumber/type/buyLinks), `links` (label/url), and `enabled`.
- [ ] The task's asset is shown but **not** editable; calendar event ids are shown read-only.
- [ ] Saving calls `updateTask(taskId, patch)` which merges the patch and persists **without**
      regenerating the schedule, preserving calendar event ids.
- [ ] A disabled task is hidden from the overview "due now" list and is removed from connected
      calendars on the next sync.
- [ ] A "needs info" badge appears on tasks missing required configuration (e.g. HVAC tasks without a
      filter size).
- [ ] `/tasks/[id]` redirects to `/schedule` (no standalone task page); all editing is inline here.

## Constraints / non-goals
- Users cannot reassign a task to a different asset or create tasks ad-hoc; tasks come from templates.
- Editing a task does not change other tasks or regenerate the schedule.

## Affected areas
- `src/app/tools/home-maintenance/schedule/page.tsx`, `tasks/[id]/page.tsx` (redirect),
  `components/{TaskForm,TaskAccordionRow,TaskCompleteActions,NeedsInfoBadge}.tsx`,
  `lib/needs-info.ts`, `HomeMaintenanceProvider.tsx`.

## Dependencies
- Schedule generation (`FEAT-home-maintenance-3`); completion (`FEAT-home-maintenance-6`).

## Open questions
- [ ] None.
