---
id: FEAT-pet-health-1
title: Tool registration & pets registry
epic: pet-health
status: ready
depends_on: [FEAT-hub-shell-1, FEAT-hub-shell-4, FEAT-hub-shell-5]
---

## Summary
Register Pet Health as a first-class tool in the hub and let users manage **pets**. The tool appears
on the landing grid with its own tile/icon and accent (mint), owns the route subtree
`/tools/pet-health`, and persists its state under one IndexedDB slice via a provider. Within the
tool, users create, edit, and delete pet profiles; a selected/active pet scopes the records and chat
features that build on this one.

## User stories
- As a pet owner, I want to find Pet Health on the hub landing page like the other tools.
- As a pet owner with more than one animal, I want a profile per pet so records and chat stay
  separated by pet.
- As a pet owner, I want to record the basics about each pet (name, species, vet) so the assistant
  has identity context.

## Acceptance criteria
- [ ] A `ToolManifest` with `id: "pet-health"`, `name: "Pet Health"`, `href: "/tools/pet-health"`,
      `status: "available"`, `accent: "mint"`, `requiresAI: true` is registered in
      `src/core/registry/tools.ts` and the tool renders on the landing grid with a dedicated icon (no
      placeholder) and an "AI Required" badge (badge rendering per `FEAT-hub-shell-1`).
- [ ] The tool degrades gracefully without an AI key: pets, records, and document storage all work
      with no key configured; only the chat (`FEAT-pet-health-5`) is gated. The empty/overview state
      makes clear the chat needs the user's own key while the vault is usable regardless.
- [ ] Visiting `/tools/pet-health` loads a tool layout wrapping a `PetHealthProvider` and renders an
      overview; the provider exposes an `isReady` flag and pages show a loading state until ready.
- [ ] The tool persists its state under a single new storage key `tool:pet-health`; the state object
      carries a `schemaVersion` and is normalized/migrated on load like other tools.
- [ ] A pet has at least: `id` (via `createId()`), `name`, `species`, `breed`, `dateOfBirth`, `sex`,
      `weight`, `microchipId`, `vetName`/`clinic`, and free-text `notes`; only `name` and `species`
      are required, the rest optional.
- [ ] Users can create a pet, edit any field, and delete a pet (deleting a pet also removes its
      records and chat history — see `FEAT-pet-health-2`, `FEAT-pet-health-5`); deletion asks for
      confirmation via the in-app confirm modal (not native `window.confirm`).
- [ ] The tool tracks an active/selected pet; when no pets exist, the overview shows an empty state
      prompting the user to add their first pet.
- [ ] **Pet selector at top-right.** The active pet is chosen from a selector pinned to the top-right
      of the tool shell — using the shared `ToolShell` `headerActions` slot, mirroring Room Coat's
      `UnitSwitcher` (`src/tools/room-coat/components/UnitSwitcher.tsx`). It lists pets, shows the
      active one, switches via `setActivePet`, and offers "Add Pet". It appears on every Pet Health
      section (overview, records, chat, settings), not just the overview.
- [ ] **No duplicated navigation.** The overview does NOT repeat the section links already in the tool
      nav bar — the "Jump to a section" block with View Records / AI Chat / Settings buttons is
      removed (the top nav is the single way to move between sections).
- [ ] **Overview is an informative dashboard** for the active pet, not just a list. It surfaces
      valuable at-a-glance info: the pet's key facts (species, breed, age from DOB, sex, weight, vet /
      clinic), and summary stats from its records — total records, how many are readable (extraction
      `done`) vs. unreadable, and the most recent record date — plus a compact "recent records"
      preview and a primary action to open Records. Static titles/labels follow Title Case
      (`FEAT-hub-shell-8`); the pet's name and other user content are shown as entered.
- [ ] All pet mutations persist to IndexedDB and survive reload.

## Constraints / non-goals
- One tool, one IndexedDB slice, one route subtree, one registry manifest (per project conventions).
- No multi-user or sharing of pets between devices except via export/import.

## Affected areas
- `src/core/registry/tools.ts`, `src/core/storage/keys.ts` (add `petHealth` key), `src/app/page.tsx`
  (tile icon), `src/shared/ui/illustrations/` (new tool icon), `src/app/tools/pet-health/**`
  (layout + routes), `src/tools/pet-health/**` (`PetHealthProvider`, `types`, `storage`, `components`).
- Redesign: new `src/tools/pet-health/components/PetSelector.tsx` (top-right, mirrors `UnitSwitcher`),
  `ToolLayout.tsx` passes it as `headerActions`; `src/app/tools/pet-health/page.tsx` reworked into the
  dashboard and the duplicated section-jump block removed.

## Dependencies
- Landing & registry (`FEAT-hub-shell-1`), navigation shell (`FEAT-hub-shell-4`), local-first
  storage (`FEAT-hub-shell-5`).

## Open questions
- [ ] None blocking.
