---
id: FEAT-home-maintenance-6
title: Task completion & HVAC condition tracking
epic: home-maintenance
status: ready
depends_on: [FEAT-home-maintenance-5]
---

## Summary
Completing a task records a timestamp that resets its recurrence. HVAC filter tasks are special: an
**inspection** captures the filter's condition (clean / moderate dust / replace needed) and can
optionally trigger a replacement in one step; a **replacement** marks the filter freshly installed.
These flows keep the HVAC asset's filter state in sync with reality.

## User stories
- As a user, I want one click to mark a task done so its next due date advances.
- As a user inspecting my HVAC filter, I want to record its condition and, if it's bad, replace it in
  the same action.

## Acceptance criteria
- [ ] `markTaskComplete(taskId, options?)` stores a `TaskCompletion { at, condition? }` keyed by task
      id (`at` = now, ISO); legacy string completions are normalized to `{ at }` on read.
- [ ] A regular task completes with no condition and simply records the timestamp.
- [ ] For an **HVAC inspection** task, the user records a condition via buttons (clean / moderate dust
      / replace needed); the asset's `filter.condition` is set (mapping clean→`good`) and
      `filter.replacementNeeded` is set true only for "replace needed".
- [ ] An inspection completed with `alsoReplaceFilter` (e.g. "Replace filter now") sets the filter to
      `condition=good`, `replacementNeeded=false`, `installedAt=today`, **and** auto-marks the paired
      replacement task complete.
- [ ] Completing an **HVAC replacement** task sets the filter `condition=good`,
      `replacementNeeded=false`, `installedAt=today`.
- [ ] `HvacFilterCondition` (task-completion choice) ∈ {`clean`, `moderate-dust`, `replace-needed`};
      `HvacFilterInfo.condition` (asset state) ∈ {`good`, `moderate-dust`, `replace-needed`}.
- [ ] An invalid completion (missing/invalid `at`) is dropped on normalization rather than stored.

## Constraints / non-goals
- A bare inspection recording "clean" does not change `installedAt`; only replacement (direct or via
  `alsoReplaceFilter`) updates the install date.
- There is no per-task completion **history** view; the most recent completion drives due dates.

## Affected areas
- `src/tools/home-maintenance/types/completion.ts`, `lib/{hvac-maintenance,completions}.ts`,
  `components/TaskCompleteActions.tsx`, `HomeMaintenanceProvider.tsx`.

## Dependencies
- Overview & due-date engine (`FEAT-home-maintenance-5`); assets (`FEAT-home-maintenance-2`).

## Open questions
- [ ] None.
