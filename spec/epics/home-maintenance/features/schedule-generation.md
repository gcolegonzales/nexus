---
id: FEAT-home-maintenance-3
title: Task templates & schedule generation
epic: home-maintenance
status: ready
depends_on: [FEAT-home-maintenance-2]
---

## Summary
The engine that turns a home's assets into a concrete, recurring task list. A fixed catalog of task
**templates** (keyed by asset category) is expanded against the home's assets to produce **tasks**.
Regeneration is idempotent — it reuses existing task ids and preserves user edits — and runs
whenever the asset/home shape changes.

## User stories
- As a user, I want a sensible maintenance schedule generated automatically from my appliances.
- As a user, I want my customizations (interval, instructions, enabled, etc.) to survive
  regeneration when I add/remove assets.

## Acceptance criteria
- [ ] A `TaskTemplate` has `templateKey`, `assetCategory`, default `title`, `intervalMonths`,
      `startOffsetDays`, builder functions `buildInstructions/buildParts/buildLinks(ctx)`, and an
      optional `isEnabled(ctx)`.
- [ ] A generated `Task` has `id`, `homeId`, `templateKey`, `assetId`, `title`, `intervalMonths`,
      `startOffsetDays`, `instructions`, `parts: Part[]`, `links: BuyLink[]`, optional
      `calendarEventId`/`microsoftCalendarEventId`, and `enabled`.
- [ ] For each template: if `assetCategory==="house"` it yields one task for the house asset; else one
      task per matching asset in the home.
- [ ] Generation keys each task by `"{homeId}:{templateKey}:{assetId}"`; an existing task with that key
      is reused (same `id`, calendar ids) and its user edits are merged over fresh template defaults.
- [ ] The set of user-preserved fields is exactly: `enabled`, `intervalMonths`, `startOffsetDays`,
      `instructions`, `title`, `parts`, `links`, `calendarEventId`, `microsoftCalendarEventId`.
- [ ] When a template's `isEnabled(ctx)` returns false, the generated task's `enabled` is forced false
      (e.g. HVAC filter tasks are disabled until a filter size is configured).
- [ ] The HVAC inspection (default 6mo) and replacement (default 9mo) templates read their interval
      from the asset's `inspectionIntervalMonths` / `replacementIntervalMonths` when set; their parts
      include the filter (with size as part number) and their links include purchase searches.
- [ ] `applyScheduleRegeneration(state)` ensures every home has a house asset, regenerates each home's
      tasks, and accumulates orphaned calendar-event ids for tasks that disappeared.
- [ ] Regeneration runs on: first init, import, schema migration, add-home, HVAC-filter-size change,
      asset upsert, asset delete, and home delete; it does **not** run on plain task edits or
      home-switch.

## Constraints / non-goals
- Templates are a fixed in-code catalog; users do not author templates (they edit the resulting tasks).
- Regeneration must never silently discard a user's edits to an existing task.

## Affected areas
- `src/tools/home-maintenance/lib/{default-tasks,schedule-generator,regenerate-schedule,orphaned-events,hvac-filter}.ts`,
  `types/task.ts`, `HomeMaintenanceProvider.tsx`.

## Dependencies
- Assets (`FEAT-home-maintenance-2`).

## Open questions
- [ ] None.
