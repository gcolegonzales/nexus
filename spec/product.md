# Nexus

## Vision
Nexus is a **local-first hub for personal home-management utilities**. It hosts a growing
collection of focused "tools" behind one shell, where all user data lives in the browser
(IndexedDB) and never touches a Nexus server. No account is required to use any tool. There are two
**optional, opt-in** outbound integrations: calendar-provider OAuth, used to push reminders the user
chooses to sync; and bring-your-own-key AI chat in Pet Health, which sends a pet's record content to
the user's chosen AI provider only when they configure their own key and send a message. The
product's promise to the user is on every page: "Your data stays on this device. No account
required." — and it holds for storage of every tool; the optional integrations are explicit,
user-initiated, and never required.

Today Nexus ships three tools — **Home Maintenance Calendar**, **Room Coat**, and **Pet Health** —
plus the shared hub that hosts them. The architecture is deliberately additive: new tools register
themselves in a central registry and appear on the landing page without touching existing
tools.

## Goals
- **Local-first by default.** Every tool's data is readable and writable with no network and
  no account. A user can install nothing, sign into nothing, and still get full value.
- **One coherent shell, many independent tools.** Tools share a profile, theme, persistence
  layer, and navigation chrome, but each owns its own state slice and routes. Adding or
  removing a tool is a localized change.
- **Portable data, owned forever.** A user can export all of their data to a single JSON file and
  restore it elsewhere. Pet Health goes further toward permanent ownership: it requests persistent
  storage and can write a pet's original documents into a folder on the user's own disk (real files +
  a self-describing index), so the durable copy is theirs — no account, no server, survives a browser
  wipe. (See ADR 0007.)
- **Opt-in cloud, never required.** Outbound integrations are per-tool, per-user, and fully optional:
  calendar sync (Google / Microsoft) for Home Maintenance, and bring-your-own-key AI chat for Pet
  Health. Nothing is sent off-device unless the user configures and triggers it.
- **Grows gracefully.** The tool registry, schema-versioned storage, and per-tool migrations
  let the product evolve without breaking existing local data.

## Non-goals
- **No backend / multi-user / accounts.** Nexus stores nothing server-side and has no concept
  of a logged-in Nexus user. (OAuth tokens for calendar providers and the AI provider key are stored
  locally only.)
- **No Nexus-hosted AI.** The Pet Health chat is strictly bring-your-own-key: the user supplies their
  own OpenAI/Anthropic key and the browser calls that provider directly. There is no Nexus inference,
  no proxy, and no shared key. (See ADR 0006.)
- **No real-time collaboration or cross-device sync** beyond manual JSON export/import (and, for Pet
  Health, a user-managed document folder / archive). Automatic sync is explicitly out of scope for
  now; if ever added it must be opt-in and layered on the local-owned copy, not a server source of
  truth.
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
- **Pet-owner Priya** — keeps her dog's and cat's vet records and discharge papers in one place,
  uploads the PDFs/photos the clinic gives her, and asks an AI questions about each pet's history.
  Brings her own AI key and understands record text is sent to that provider when she chats.

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
7. **Pet Health core loop:** Add a pet → upload medical records and vet sign-out documents → tool
   extracts each document's text → (optionally) open Settings, pick a provider and paste your AI key →
   open the pet's chat → ask questions answered from the pet's profile + extracted record history.

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
- **AI is bring-your-own-key, browser-direct.** Pet Health calls OpenAI or Anthropic from the client
  with a user-supplied key stored in IndexedDB (excluded from export, like OAuth tokens). No server
  proxy exists. Text extraction runs in-browser; the only AI egress is user-initiated chat requests
  (and, if the vision OCR fallback is chosen, record images). See ADR 0006.
- **Durable storage without a backend.** IndexedDB is the working store; Pet Health adds
  `navigator.storage.persist()` and an optional File System Access "document folder" (plus an archive
  export fallback) for permanence. File System Access is Chromium-best; Firefox/Safari fall back to
  IndexedDB + archive. No database, no accounts. See ADR 0007.

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
- **Pet** — a Pet Health profile (name, species, breed, etc.) that scopes its own records and chat.
- **Record** — a Pet Health document (vet medical record or sign-out/discharge) uploaded as a PDF or
  image, stored locally with metadata, the original file Blob, and extracted text.
- **Extracted text** — machine-readable text pulled from a record (PDF text layer, or OCR/vision for
  scans) that the AI chat uses as context.
- **AI provider key** — the user's own OpenAI/Anthropic API key, stored locally under `hub:ai-provider`
  and excluded from export, used to call the provider directly for Pet Health chat.
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
