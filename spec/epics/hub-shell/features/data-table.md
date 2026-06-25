---
id: FEAT-hub-shell-10
title: Reusable DataTable component (@nexus/ui)
epic: hub-shell
status: ready
depends_on: [FEAT-hub-shell-1]
---

## Summary
A generic, reusable `DataTable` in `@nexus/ui` for rendering lists of records: typed columns with
custom cell renderers, sortable headers, an empty state, and optional row click / row actions and
selection. Built fresh and Tailwind-native (no external table lib), using the sibling CRM
(stepahead) DataTable's prop interface as the design spec — not a code port, since that component is
790 lines of CRM-coupled vanilla CSS + framer-motion + i18n. First consumer: Pet Health records.

## User stories
- As a user, I want record lists shown as a clean, sortable table instead of ad-hoc cards.
- As a developer, I want one table component I can reuse across tools with a typed columns API.

## Acceptance criteria
- [ ] `@nexus/ui` exports `DataTable<T>` with at least: `data: T[]`, `columns: Column<T>[]`,
      `onRowClick?`, `getRowId?`, `emptyMessage?` / `emptyAction?`, and optional sorting
      (`sortConfig?`, `onSort?`). A `Column<T>` has `key`, `header` (string/node), `render(item)`,
      and optional `sortable`, `align`, `width`.
- [ ] Sortable columns show an asc/desc indicator and call `onSort(key)` on header click; sorting
      state is controlled by the parent (the table renders order, parent supplies sorted data).
- [ ] Renders an accessible semantic `<table>` with sticky header, hover/zebra rows (Tailwind), and a
      clear empty state (`emptyMessage` + optional `emptyAction`) when `data` is empty.
- [ ] Styling uses Tailwind 4 + the existing design tokens only; no external table/animation library,
      no CRM CSS. Titles/labels rendered through the table follow the Title Case convention
      (`FEAT-hub-shell-8`) where they are static UI copy (column headers), not user content (cells).
- [ ] Optional row actions (e.g. an actions cell) and optional selection are supported OR explicitly
      deferred; whichever ship, the API is documented and typed.
- [ ] Works with arbitrary row types via generics; no assumptions about the data shape beyond an id
      accessor.

## Constraints / non-goals
- Not a port of the CRM table; no framer-motion, no i18n coupling, no built-in data fetching.
- Pagination/search/filters are parent-composed (the table stays presentational); a built-in
  pagination control is optional, not required for v1.

## Affected areas
- New `packages/ui/src/DataTable.tsx` (+ `packages/ui/src/index.ts` export; `@nexus/next` re-export).

## Dependencies
- Design system / landing (`FEAT-hub-shell-1`).

## Open questions
- [ ] Selection + bulk actions: include in v1 or defer until a consumer needs them? (Pet Health
      records v1 does not strictly need selection.)
