---
id: FEAT-pet-health-6
title: Durable local storage — automatic persistence & archive export
epic: pet-health
status: ready
depends_on: [FEAT-pet-health-2]
---

## Summary
Make "you own your data forever" real without a backend, and make it **automatic** — no durability
chores for the user. Persistent storage is requested automatically so the browser will not silently
evict pet data. The only manual control is a **Export Archive** action (a single downloadable zip of
the original files + a JSON index) for a portable backup the user keeps wherever they like. The
prior "current posture" readout and the manual "connect document folder" flow are removed from the UI
(persistence is automatic; the File System Access folder cannot be automatic — it needs a user
gesture and re-prompts — so it is de-scoped from v1; the underlying lib may remain for a future
opt-in). IndexedDB remains the working store; persistence + archive cover the "own your data" story.

## User stories
- As a pet owner, I want my documents to keep existing even if my browser runs low on space — without
  having to flip any switches.
- As a pet owner, I want a one-click portable backup I can keep anywhere.

## Acceptance criteria
- [ ] Persistent storage is requested **automatically** — the tool calls `navigator.storage.persist()`
      on load / first data write, with no user-facing button. It degrades silently if the API is
      unavailable or the request is denied (data still works); failure is not surfaced as a chore.
- [ ] There is **no "Current posture" section** and **no "Make storage persistent" button** in the UI;
      persistence is automatic and invisible.
- [ ] **Export Archive** remains a manual action: it produces a single downloadable zip containing the
      original files + a JSON index (`pet-health.json` with pets, record metadata, extracted text); a
      matching import restores them. This is the portable, user-owned backup.
- [ ] The **Connect document folder** (File System Access) flow is **removed from the v1 UI** — it
      cannot be made automatic (requires a user gesture and re-prompts each session). The folder lib
      may remain in the codebase, unused by the UI, for a possible future opt-in.
- [ ] No backend, account, or network is involved; all writes are local. (See ADR 0007.)

## Constraints / non-goals
- No cross-device sync (explicit non-goal; a future opt-in sync could layer on top).
- Durability is automatic (persistent storage) plus a manual archive export; no folder mirroring in v1.
- IndexedDB remains the always-available working store.

## Affected areas
- `src/tools/pet-health/lib/{persistent-storage,archive}.ts` (folder lib retired from UI),
  `src/tools/pet-health/components/StorageSettings*` (simplified to just Export Archive),
  auto-persist call wired into the provider/tool load.

## Dependencies
- Records vault (`FEAT-pet-health-2`).

## Open questions
- [ ] Confirm dropping the **Document Folder** UI in v1 (recommended: yes — it can't be automatic and
      adds clutter; persistence is automatic and archive export covers portability). The lib stays for
      a possible future opt-in.
