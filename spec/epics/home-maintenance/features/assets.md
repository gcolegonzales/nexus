---
id: FEAT-home-maintenance-2
title: Assets & HVAC details
epic: home-maintenance
status: ready
depends_on: [FEAT-home-maintenance-1]
---

## Summary
Assets are the appliances and systems a home contains (fridge, washer, HVAC, the house itself,
etc.). Each home owns a special non-deletable **house** asset (parent for whole-home tasks) and any
number of appliance assets. HVAC assets carry rich filter details that drive the HVAC maintenance
tasks. New homes are seeded with a starter set of common appliances.

## User stories
- As a user, I want to record my appliances (brand/model/install date) so maintenance is tailored.
- As a user with central air, I want to capture filter size/MERV/intervals so HVAC reminders are
  accurate and actionable.

## Acceptance criteria
- [ ] `AssetCategory` ∈ {`house`, `refrigerator`, `washer`, `dryer`, `water-heater`, `microwave`,
      `dishwasher`, `range`, `water-filter`, `hvac`, `safety`, `other`}.
- [ ] `Asset` has `id`, `homeId`, `category`, optional `brand`, `model`, `nickname`, `installDate`,
      `notes`, and (HVAC only) `hvac: HvacDetails`.
- [ ] `HvacDetails` = `{ location?, configuration?, evaporatorCoilModel?, filter?: HvacFilterInfo }`;
      `HvacFilterInfo` = `{ brand?, model?, size?, merv?, replacementIntervalMonths?,
      inspectionIntervalMonths?, installedAt?, condition?, replacementNeeded? }`.
- [ ] Each home has exactly one **house** asset, id `house-{homeId}`, category `house`, nickname kept
      equal to the home name; it cannot be deleted and is excluded from `activeAssets`.
- [ ] A brand-new home is seeded with a starter set of common appliances (refrigerator, washer,
      dryer, water-heater, microwave, dishwasher, range, water-filter) with placeholder brand/model.
- [ ] `/assets` lists the active home's appliance assets (accordion rows with edit/delete); "Add
      Asset" → `/assets/new`.
- [ ] `/assets/[id]` with `id="new"` creates an empty `other` asset for the active home and (after
      save) routes to its id; a non-existent id shows "Asset not found".
- [ ] The asset form shows category (excluding `house`), nickname, brand, model, install date, notes;
      when category is `hvac` it additionally shows location, configuration, evaporator coil model,
      and filter brand/model/size/MERV/replacement-interval/inspection-interval/installed-at/condition.
- [ ] `upsertAsset(asset)` creates or updates; if the asset is HVAC with a filter `size`, the active
      home's `hvacFilterSize` is updated to match; either way schedules are regenerated.
- [ ] `deleteAsset(id)` is refused for house assets; otherwise it removes the asset, its tasks, and
      those tasks' completions, and regenerates schedules (queuing orphaned calendar events).
- [ ] An asset is flagged "needs info" when it is missing model or install date (surfaced on the
      overview count and badges).

## Constraints / non-goals
- HVAC filter `size` on the asset takes precedence over the home-level `hvacFilterSize` when both are
  present.
- No image attachments, warranties, or document storage.

## Affected areas
- `src/tools/home-maintenance/types/asset.ts`, `lib/{seed-assets,house-asset,hvac-filter,asset-label,needs-info}.ts`,
  `components/{AssetForm,AssetAccordionRow,NeedsInfoBadge}.tsx`,
  `app/tools/home-maintenance/assets/**`, `HomeMaintenanceProvider.tsx`.

## Dependencies
- Homes (`FEAT-home-maintenance-1`); schedule generation (`FEAT-home-maintenance-3`).

## Open questions
- [ ] None.
