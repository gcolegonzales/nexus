# Known discrepancies & observations

This appendix lists places where the **current implementation** diverges from, under-delivers, or
adds caveats to the **intended behavior** captured in the feature files. The feature files describe
the target ("what it is designed to do"); this list is the triage backlog. Nothing here changes the
specs above — each item is a candidate for `/bug` (regression/defect) or `/change` (intended
behavior never built).

Severity legend: **bug** (wrong behavior) · **gap** (intended behavior not implemented) ·
**caveat** (intentional limitation worth recording) · **debt** (maintainability/quality only).

> No `TODO`/`FIXME`/`HACK`/`BUG` comments were found in the source; items below come from reading
> the code's actual behavior. Line numbers are approximate and from the reverse-engineering pass —
> re-confirm before fixing.

## Hub / shell

1. **caveat — Profile saves on every keystroke.** `ProfileForm` calls `updateProfile()` per change
   with no debounce, writing to IndexedDB on each character. Correct, but wasteful.
   (`src/app/profile/ProfileForm.tsx`) → relates to `FEAT-hub-shell-3`.
2. **caveat — Import confirmation uses native `window.confirm`.** Inconsistent with the in-app
   modal/UI system. (`src/app/settings/SettingsPanel.tsx`) → `FEAT-hub-shell-6`.
3. **caveat — OAuth tokens transit `sessionStorage`.** The callback stashes tokens in
   `sessionStorage` (`nexus_{provider}_auth_pending`) before the client moves them to IndexedDB — a
   brief exposure window. Accepted in ADR 0005. → `FEAT-hub-shell-7`.
4. **debt — Transition route list is hardcoded.** `HubMainTransition` hardcodes which routes skip
   the page transition instead of deriving from the registry; adding a top-level route needs a code
   edit. (`src/shared/ui/hub/HubMainTransition.tsx`) → `FEAT-hub-shell-2`.
5. **caveat — `ToolContextLabel` matches by path prefix.** Tool resolution is `pathname === href ||
   startsWith(href + "/")`; future overlapping hrefs could mis-match. Safe for current tools.
   → `FEAT-hub-shell-2`.

## Home Maintenance

6. **bug — `Home.setupDate` is written but never read.** The schedule **anchor** comes solely from
   the shared profile's `homeSetupDate`; per-home `setupDate` is editable in the Manage Home form but
   never used in due-date math. For multi-home users this is misleading: all homes share one anchor.
   (`lib/calendar-dates.ts`, `components/HomeManageForm.tsx`) → `FEAT-home-maintenance-1`,
   `FEAT-home-maintenance-5`. **Highest-value item to triage** — intended behavior (per-home anchor)
   vs implemented (global anchor) should be reconciled.
7. **caveat — Inspecting "clean" never sets filter `installedAt`/`good` fully.** Asset filter
   `condition` becomes `good` only via a replacement (direct or `alsoReplaceFilter`); a bare
   inspection recording "clean" maps to `good` condition but does not touch `installedAt`. Intended,
   but the asymmetry between the inspection enum (`clean`) and asset enum (`good`) is subtle.
   (`lib/hvac-maintenance.ts`) → `FEAT-home-maintenance-6`.
8. **caveat — Orphaned calendar deletions fail silently.** If a provider delete fails, the event id
   stays queued for retry and the user sees only synced/removed counts, not which deletions failed; a
   disabled task could linger on the calendar indefinitely if the API keeps failing.
   (`lib/calendar-sync-engine.ts`) → `FEAT-home-maintenance-7`.
9. **caveat — Microsoft month-end recurrence pins to day 28.** `dayOfMonth = min(startDay, 28)` to
   avoid invalid recurrences in short months; tasks starting on the 29th–31st shift to the 28th every
   month. (`lib/microsoft-sync.ts`) → `FEAT-home-maintenance-7`.
10. **caveat — Stale calendar id silently re-creates a calendar.** If the user deletes the
    "Home Maintenance" calendar at the provider, the stored id becomes invalid and the next sync
    creates a new one, orphaning the old. Graceful but abandons the previous calendar.
    (`lib/google-sync.ts`, `lib/microsoft-sync.ts`) → `FEAT-home-maintenance-7`.
11. **caveat — Deleting the active home switches silently.** `deleteHome` reassigns the active home
    with no toast/notification; the user may not notice they're now on a different home.
    (`HomeMaintenanceProvider.tsx`) → `FEAT-home-maintenance-1`.
12. **gap — No per-task completion history.** Completions are stored per task (latest drives due
    dates) but there is no UI to view history. → `FEAT-home-maintenance-6`.
13. **debt — `/tasks/[id]` and `/homes/[id]` are redirect stubs.** Both bounce to `/schedule` and the
    overview respectively; editing happens inline / in modals. Routes exist but carry no content.
    → `FEAT-home-maintenance-4`, `FEAT-home-maintenance-1`.

## Room Coat

14. **caveat — `hallwayCoat` is deprecated but retained.** `HomeUnit.hallwayCoat` is kept mirrored to
    `defaultCoat` for older data paths; it is redundant. (`types/state.ts`, `RoomCoatProvider.tsx`)
    → `FEAT-room-coat-1`.
15. **gap — Windows have no paint.** Window surfaces appear in the schedule but `resolveSurfacePaint`
    returns `unset` for the `window` category — no window-specific paint support yet.
    (`lib/resolve-paint.ts`) → `FEAT-room-coat-5`, `FEAT-room-coat-8`.
16. **caveat — Dimension editing assumes rectangular footprints.** `verticesMm` can hold an arbitrary
    polygon, but `updatePlacedRoomDimensions` and snapping assume rectangles; non-rectangular rooms
    will not resize correctly. (`lib/room-shape.ts`, `RoomCoatProvider.tsx`) → `FEAT-room-coat-2`,
    `FEAT-room-coat-3`.
17. **gap — `FloorLink` has no geometry.** Floor links are stored/CRUD-able metadata (stairs,
    elevator) with no rendered connection or effect. (`types/state.ts`) → `FEAT-room-coat-6`.
18. **caveat — Sub-100 mm wall openings are dropped silently.** Openings with span `< 100 mm` are
    ignored with no user feedback. (`RoomCoatProvider.tsx`) → `FEAT-room-coat-4`.
19. **caveat — No hallway path validation.** Self-intersecting waypoints, near-coincident waypoints,
    and asymmetric widths are not validated; width is always symmetric about the centerline.
    (`lib/hallway-draft.ts`) → `FEAT-room-coat-4`.
20. **caveat — Baseboard overrides cleared on coat change.** Changing a space's baseboard paint clears
    that space's per-wall baseboard surface overrides by design; users lose per-wall baseboard
    customization. (`RoomCoatProvider.tsx`) → `FEAT-room-coat-8`.
21. **caveat — Deleting a snap point orphans, not repositions, furnishings.** A furnishing linked to a
    deleted snap point keeps its position with `snapPointId = null`. (`RoomCoatProvider.tsx`)
    → `FEAT-room-coat-6`.
22. **caveat — No collision/clearance enforcement.** Door swing arcs and clearance labels are advisory
    only; doors can visually swing through adjacent geometry; furnishings can overlap walls/each other.
    → `FEAT-room-coat-3`, `FEAT-room-coat-5`, `FEAT-room-coat-6`.
23. **debt — Deprecated internal helpers remain.** Several utilities are marked deprecated in favor of
    replacements (e.g. in `hallway-entrance-snaps.ts`, `hallway-draft.ts`, `scene/LayoutVisuals.tsx`).
    Cleanup only. → `FEAT-room-coat-4`, `FEAT-room-coat-10`.
24. **gap — Surface-area / paint-quantity output is partial.** Quantity/coverage estimates are not a
    guaranteed schedule output; the authoritative export is the per-surface paint mapping.
    → `FEAT-room-coat-9`.

## How to use this list
- Items tagged **bug** should go through `/bug` (capture repro, triage regression vs spec-gap, fix +
  regression test). Item 6 is the most consequential.
- Items tagged **gap** are intended behaviors not yet built — route through `/change` (they are
  already described in the relevant feature file as the target).
- **caveat**/**debt** items are recorded for awareness; promote to `/bug` or `/change` only if they
  start mattering to users.
