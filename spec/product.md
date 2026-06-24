# Nexus

## Vision
Nexus is a **local-first hub for personal home-management utilities**. It hosts a growing
collection of focused "tools" behind one shell, where all user data lives in the browser
(IndexedDB) and never touches a server. No account is required to use any tool. The only
optional network dependency is calendar-provider OAuth, used solely to push reminders the
user explicitly chooses to sync. The product's promise to the user is on every page:
"Your data stays on this device. No account required."

Today Nexus ships two tools — **Home Maintenance Calendar** and **Room Coat** — plus the
shared hub that hosts them. The architecture is deliberately additive: new tools register
themselves in a central registry and appear on the landing page without touching existing
tools.

## Goals
- **Local-first by default.** Every tool's data is readable and writable with no network and
  no account. A user can install nothing, sign into nothing, and still get full value.
- **One coherent shell, many independent tools.** Tools share a profile, theme, persistence
  layer, and navigation chrome, but each owns its own state slice and routes. Adding or
  removing a tool is a localized change.
- **Portable data.** A user can export all of their data to a single JSON file and restore it
  on another device/browser.
- **Opt-in cloud, never required.** Calendar sync (Google / Microsoft) is the only outbound
  integration; it is per-tool, per-user, and fully optional.
- **Grows gracefully.** The tool registry, schema-versioned storage, and per-tool migrations
  let the product evolve without breaking existing local data.

## Non-goals
- **No backend / multi-user / accounts.** Nexus stores nothing server-side and has no concept
  of a logged-in Nexus user. (OAuth tokens for calendar providers are stored locally only.)
- **No real-time collaboration or cross-device sync** beyond manual JSON export/import.
- **No native/offline-installable app** is in scope here (it is a web app; PWA packaging is
  out of scope for this spec).
- **No telemetry / analytics / remote logging.**
- **Not a CAD or structural-engineering tool.** Room Coat is a planning and paint-scheduling
  aid, not a precision architectural modeller. It does not validate building codes, structural
  feasibility, or collisions.
- **Not a CMMS / work-order system.** Home Maintenance tracks recurring personal home tasks,
  not crews, inventory, or commercial assets.

## Personas
- **Homeowner Hannah** — owns one home, wants to remember recurring maintenance (HVAC filters,
  smoke detectors, appliance cleaning) and optionally drop reminders onto her Google Calendar.
  Not technical; wants sensible defaults out of the box.
- **Landlord Leo** — manages multiple properties (homes/units), each with different appliances
  and filter sizes, possibly synced to different calendars. Needs per-property isolation.
- **Renovator Renee** — planning paint and finishes for a multi-room, multi-floor unit. Wants
  to lay out rooms and hallways, assign paint per surface, and export a paint schedule to hand
  to a contractor or take to the paint store.
- **Privacy-conscious Pat** — chooses Nexus specifically because data stays on-device. Will
  back up via JSON export; will never connect a cloud calendar.

## Key flows
1. **Discover & enter a tool:** Land on `/` → see hero + tool grid from the registry → click an
   available tool card → arrive at that tool's overview.
2. **Set up identity once:** Open Account menu → Profile → set display name, household, timezone,
   locale, home setup date → values persist locally and seed defaults across tools.
3. **Back up / move data:** Settings → Export → download `nexus-export-YYYY-MM-DD.json`; on a new
   browser, Settings → Import → replace local data from that file.
4. **Home Maintenance core loop:** Add/confirm assets → schedule auto-generates recurring tasks →
   Overview surfaces what's due now → mark a task complete (recording HVAC filter condition where
   relevant) → next due date advances.
5. **Calendar sync:** Home Maintenance → Sync → either export `.ics` or connect Google/Microsoft →
   enabled tasks become recurring calendar events; disabled/deleted tasks are removed on next sync.
6. **Room Coat core loop:** Pick/create a unit → add floors → place catalog rooms in the 3D editor →
   draw hallways and openings → build a unit paint library → assign coats and per-surface overrides →
   review the resolved surface schedule → export CSV.

## Constraints
- **Tech:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4. 3D via three.js +
  @react-three/fiber + drei. Persistence via IndexedDB (`idb`). Dates via date-fns. Monorepo with
  workspace packages `@nexus/ui` (design system) and `@nexus/next` (Next-adapted primitives).
- **This is a customized Next.js.** APIs and conventions may differ from upstream. Per `AGENTS.md`,
  agents must read the relevant guide in `node_modules/next/dist/docs/` before writing Next.js code.
- **Client-only data.** All tool/profile state is client-side IndexedDB; pages that read it must be
  client components and tolerate an async "not ready" first render.
- **OAuth secrets are server-side; client IDs are public.** Auth handshake runs through
  `/api/auth/*` route handlers; tokens end up in IndexedDB, brokered briefly via `sessionStorage`.
- **No automated test framework is currently configured.** The build gate is `next build`
  (typecheck) + `eslint`. Acceptance criteria are written to be objectively verifiable even though
  there is no test runner yet (see `project.md`).

## Glossary
- **Hub / Shell** — the shared app frame (landing, header/menu/footer, profile, settings, theme,
  storage, OAuth) that hosts tools. Sometimes called "the general tool."
- **Tool** — a self-contained utility registered in the tool registry (e.g. Home Maintenance,
  Room Coat), with its own routes, state slice, and provider.
- **Tool registry** — `src/core/registry`; the list of `ToolManifest`s that drives the landing grid
  and tool-context labelling.
- **State slice** — a tool's serializable state object persisted under a single IndexedDB key.
- **Profile** — shared household identity (`HubProfile`): display name, household, timezone, locale,
  home setup date, notes.
- **Export bundle** — a versioned JSON document containing profile + every tool's state slice.
- **Home / Unit** — Home Maintenance scopes data to a **Home**; Room Coat scopes data to a **Unit**.
  Both represent "a property" but are independent concepts in independent tools.
- **Asset** — a Home Maintenance appliance/system (fridge, HVAC, the house itself, etc.).
- **Task / Template** — a recurring maintenance item; generated from a `TaskTemplate` per applicable
  asset, then user-editable.
- **Completion** — a timestamped record that a task was done, optionally carrying an HVAC filter
  condition.
- **Placement** — a Room Coat instance of a catalog **Room** placed on a unit floor (`UnitRoomPlacement`).
- **Coat** — a set of paint assignments (wall/baseboard/ceiling/door + floor finish) applied at unit
  default or per-space (`RoomCoat`).
- **Surface** — a paintable face of a space (wall/baseboard/ceiling/door/window/floor), addressed by a
  `SurfaceDescriptor` id; resolves to a paint via a precedence chain.
- **Surface schedule** — the resolved table of every surface → paint for a unit, exportable as CSV.
- **mm-first geometry** — all Room Coat geometry is stored in millimetres; display converts to the
  user's imperial/metric preference.

## Open questions
- [ ] None blocking. Per-feature open questions (if any) are tracked in each feature file. Known
  spec-vs-implementation discrepancies are catalogued in `spec/known-discrepancies.md` for later
  triage via `/bug`; they do not change the intended behavior described in the feature files.
