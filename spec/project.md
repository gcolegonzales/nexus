# Project profile

## Stack
- **Language / framework:** TypeScript 5, React 19.2, Next.js 16.2 (App Router). Customized Next.js
  — treat upstream knowledge as suspect (see Notes for agents).
- **Styling:** Tailwind CSS 4 (`@tailwindcss/postcss`), design tokens via CSS variables.
- **3D:** three.js 0.184, `@react-three/fiber` 9, `@react-three/drei` 10 (Room Coat only).
- **Persistence:** IndexedDB via `idb` 8. No server database.
- **Dates:** date-fns 4.
- **Monorepo:** npm workspaces. Root app + `packages/ui` (`@nexus/ui` design system) and
  `packages/next` (`@nexus/next` Next-adapted primitives, e.g. Link-aware Button).

## Package manager
- **npm** (a `package-lock.json` is committed; root `package.json` declares `"workspaces": ["packages/*"]`).
- Install from the repo root so workspaces link.

## Commands  (the build gate runs these — keep exact)
| Purpose    | Command            | Notes |
|------------|--------------------|-------|
| install    | `npm install`      | Run at repo root; links workspaces. |
| dev        | `npm run dev`      | `next dev`. |
| build      | `npm run build`    | `next build`; this is also the **typecheck** gate (Next type-checks on build). |
| typecheck  | `npx tsc --noEmit` | Optional faster typecheck; `tsconfig.json` at root. |
| test       | _none configured_  | No test runner is set up. See Definition of Done. |
| lint       | `npm run lint`     | `eslint` (flat config `eslint.config.mjs`, `eslint-config-next`). |
| format     | _none configured_  | No Prettier/formatter in the repo; match surrounding style. |

## Definition of Done
A task is done only when:
1. `npm run build` succeeds (compiles **and** type-checks cleanly), and
2. `npm run lint` passes with no new errors.

There is **no automated test suite today**, so the gate is build + lint. Acceptance criteria in
feature files are nonetheless written to be objectively verifiable: verify them by exercising the
described behavior in `npm run dev` (and, where noted, by inspecting the persisted IndexedDB slice
or the generated `.ics`/CSV output). If a future feature introduces a test runner, update this
table and gate on it.

## Conventions
- See `AGENTS.md` / `CLAUDE.md` at the repo root.
- **Structure:** `src/app` = routes/pages (App Router). `src/core` = hub infrastructure
  (profile, registry, storage, integrations, export). `src/tools/<tool>` = a tool's provider,
  types, lib, components, storage. `src/shared/ui` = shell + cross-tool UI.
- **Tool isolation:** a tool owns one IndexedDB key, one React context provider, one route subtree
  under `/tools/<tool>`, and one registry manifest. Tools do not import each other's state.
- **Client data:** state lives in IndexedDB and is loaded by each tool's provider; provider exposes
  an `isReady` flag — pages must render a loading state until ready.
- **Schema versioning:** each tool's state carries a `schemaVersion`; storage normalizes + migrates
  on load and always writes the current version.
- **IDs:** generated via the shared `createId()` helper; never hardcode except documented special
  ids (e.g. `house-{homeId}`).
- **Geometry (Room Coat):** store millimetres; convert only for display/input via `lib/units.ts`.
- **Title Case (labels & titles):** button/action labels and static UI titles/headings use Title Case
  via the shared `titleCase()` utility in `@nexus/ui` (applied inside Button/PrimaryButton, Badge,
  ToolSectionHeader, ToolNavBar, ToolCard). Don't use CSS `capitalize`. Never pass user-entered text
  through it; PageHeader/Modal/Card titles aren't auto-cased (opt-in `titleCase` prop). See ADR 0008
  / `FEAT-hub-shell-8`.
- **Modal unsaved-changes guard:** edit forms report a `dirty` state to the shared `Modal`, which
  confirms via `useConfirm` before closing a dirty modal. Clear dirty on successful save. ADR 0009 /
  `FEAT-hub-shell-9`.
- **Shared `DataTable`:** record/list tables use the generic `@nexus/ui` `DataTable<T>` (typed
  columns + render fns, sortable headers, empty state) — don't hand-roll per-tool tables.
  `FEAT-hub-shell-10`.
- **Top-right entity selector:** a tool's active-entity switcher (unit, pet, …) goes in the
  `ToolShell` `headerActions` slot (see Room Coat `UnitSwitcher`), not inline in the page body.

## Directory map
- `src/app/page.tsx` — landing page (hero + registry-driven tool grid).
- `src/app/profile`, `src/app/settings` — hub pages.
- `src/app/component-library` — design-system showcase (unlinked, reference only).
- `src/app/api/auth/{google,microsoft}/...` — OAuth route handlers (authorize, callback, refresh).
- `src/app/tools/home-maintenance/**` — Home Maintenance routes.
- `src/app/tools/room-coat/**` — Room Coat routes.
- `src/core/registry` — `ToolManifest` types + `TOOLS` list + helpers.
- `src/core/profile` — `HubProfile` types, store, `ProfileProvider`.
- `src/core/storage` — IndexedDB `kv` store, `STORAGE_KEYS`, schema-version helpers.
- `src/core/integrations/{google,microsoft}` — OAuth clients, token stores, scopes.
- `src/core/export` — versioned export/import bundle.
- `src/shared/ui/hub` — Header, HubMenu, Footer, HubShell, ToolContextLabel, transitions.
- `src/shared/ui/tool` — ToolShell, ToolNavBar, ToolSection, ToolShell context.
- `src/tools/home-maintenance/**` — types, `HomeMaintenanceProvider`, `lib/*`, `components/*`, `storage/*`.
- `src/tools/room-coat/**` — types, `RoomCoatProvider`, `lib/*`, `components/*` (incl. `editor/`, `scene/`), `storage/*`.
- `packages/ui` — `@nexus/ui` tokens, theme, primitives (Button, Input, Modal, ThemeToggle, ThemeSelector, ToastProvider, etc.).
- `packages/next` — `@nexus/next` Next-adapted components.

## Notes for agents
- **Read the Next.js guides first.** Per `AGENTS.md`: "This is NOT the Next.js you know." Before
  writing any Next.js code (route handlers, layouts, `params`, metadata, server vs client
  boundaries), read the relevant guide under `node_modules/next/dist/docs/`. Heed deprecation notices.
- **Everything that reads IndexedDB is client-side.** Mark such components `"use client"`; they must
  handle the async-not-ready first paint.
- **The 3D scene is dynamically imported with SSR disabled** (`UnitEditorScene`). Keep three.js out of
  the server bundle.
- **OAuth env vars:** server-side `GOOGLE_CLIENT_ID/SECRET`, `MICROSOFT_CLIENT_ID/SECRET`,
  optional `MICROSOFT_TENANT_ID` (default `common`); client-side `NEXT_PUBLIC_GOOGLE_CLIENT_ID`,
  `NEXT_PUBLIC_MICROSOFT_CLIENT_ID`. When unconfigured, connect buttons are disabled but `.ics`
  export still works.
- **Don't break the local data contract.** Changing a tool's state shape requires a `schemaVersion`
  bump plus a migration in that tool's `storage`/`lib/migrate-state`, and a matching bump to the
  export bundle if its shape changes.
