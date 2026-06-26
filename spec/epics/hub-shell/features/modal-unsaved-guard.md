---
id: FEAT-hub-shell-9
title: Modal unsaved-changes guard
epic: hub-shell
status: ready
depends_on: [FEAT-hub-shell-2]
---

## Summary
The shared `@nexus/ui` `Modal` confirms before discarding unsaved edits. When a modal that has
in-progress changes is closed via the backdrop, the Escape key, or its close button, it first asks
"Unsaved changes will be lost" (Discard / Keep editing) via the existing in-app confirm flow; it only
closes on confirm. Clean modals close immediately. See ADR 0009.

## User stories
- As a user, I don't want to lose what I typed because I clicked outside a dialog by accident.
- As a developer, I want this handled once in the shared Modal, not re-implemented per form.

## Acceptance criteria
- [ ] `Modal` guards by default: when no explicit `dirty` prop is given, it **auto-detects** unsaved
      changes by watching for `input`/`change` events on fields inside it since it opened, so any modal
      containing inputs is protected automatically. An explicit `dirty?: boolean` prop overrides the
      auto-detection for value-accurate dirtiness (e.g. forms that also track non-native controls like
      the custom Select). A modal with no inputs (and no `dirty`) closes immediately.
- [ ] When dirty, attempting to close via backdrop click, Escape, or the close (×) button triggers an
      in-app confirmation ("Unsaved changes will be lost." with Discard / Keep editing) via
      `useConfirm`/`ConfirmProvider`; the modal closes only if the user confirms discard.
- [ ] When not dirty, the modal closes immediately with no prompt.
- [ ] A successful save closes the modal WITHOUT the prompt (the form clears its dirty state before
      requesting close), so normal submit-and-close is unaffected.
- [ ] The edit forms in the app that can hold unsaved input report their dirty state to the Modal —
      at minimum the Pet add/edit form and the Record edit form (compare current values to initial).
- [ ] No native `window.confirm` is used; the confirmation matches the app's confirm-modal styling.

## Constraints / non-goals
- The guard fires only for genuinely dirty modals; pristine forms and non-form modals are unaffected.
- Dirty-tracking granularity is per-form (a simple "changed vs initial" check is sufficient; no
  field-level diffing required).

## Affected areas
- `packages/ui/src/Modal.tsx` (guard logic via `useConfirm`), forms that opt in:
  `src/tools/pet-health/components/PetForm.tsx`, `RecordEditModal.tsx`, and other edit modals as found.

## Dependencies
- Navigation shell / confirm provider (`FEAT-hub-shell-2`); the existing `ConfirmProvider` is already
  mounted app-wide.

## Open questions
- [ ] None.
