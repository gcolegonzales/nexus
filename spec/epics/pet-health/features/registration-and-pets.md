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
- [ ] All pet mutations persist to IndexedDB and survive reload.

## Constraints / non-goals
- One tool, one IndexedDB slice, one route subtree, one registry manifest (per project conventions).
- No multi-user or sharing of pets between devices except via export/import.

## Affected areas
- `src/core/registry/tools.ts`, `src/core/storage/keys.ts` (add `petHealth` key), `src/app/page.tsx`
  (tile icon), `src/shared/ui/illustrations/` (new tool icon), `src/app/tools/pet-health/**`
  (layout + routes), `src/tools/pet-health/**` (`PetHealthProvider`, `types`, `storage`, `components`).

## Dependencies
- Landing & registry (`FEAT-hub-shell-1`), navigation shell (`FEAT-hub-shell-4`), local-first
  storage (`FEAT-hub-shell-5`).

## Open questions
- [ ] None blocking.
