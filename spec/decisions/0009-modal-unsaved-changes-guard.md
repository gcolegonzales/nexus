# 0009. Modal unsaved-changes guard via the shared Modal

- Status: accepted
- Date: 2026-06-25

## Context
Modals across the hub host edit forms (add/edit pet, edit record, etc.). Closing one accidentally —
backdrop click, Escape, the × button — silently discards in-progress edits. We want a consistent
"you have unsaved changes" confirmation before a dirty modal closes, everywhere, without each modal
re-implementing it.

## Decision
The shared `@nexus/ui` `Modal` owns the guard. A modal can report whether it currently has unsaved
changes (a `dirty` / `isDirty` prop, or an imperative "should block close" predicate). When a close
is attempted (backdrop, Escape, or close button) **and** the modal is dirty, the Modal first shows a
confirmation ("Unsaved changes will be lost. Close anyway?" / Discard vs. Keep editing) using the
existing `ConfirmProvider`/`useConfirm` flow; only on confirm does it actually close. When not dirty,
it closes immediately as today. Programmatic closes triggered by a successful save bypass the guard
(the form marks itself clean before closing). Forms opt in by reporting their dirty state to the
Modal.

## Consequences
- One implementation, consistent behavior for every modal; individual forms only declare "am I
  dirty," not the confirm wiring.
- Reuses the existing in-app confirm modal (no native `confirm`), consistent with the project's
  confirm convention.
- Forms must track a dirty flag (compare current values to initial) and clear it on successful save
  so the guard doesn't fire on a normal submit-and-close.
- Non-form modals (no edits) pass no dirty state and are unaffected.
