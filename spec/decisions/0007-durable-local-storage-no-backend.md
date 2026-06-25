# 0007. Durable local-first storage without a backend (persistent storage + File System Access)

- Status: accepted
- Date: 2026-06-25

## Context
Pet Health stores medical documents users want to keep "forever." This raised whether to introduce a
backend database (for durability and cross-device sync) or stay local-first. A backend would improve
durability and enable sync, but it directly undercuts the product's core value — user ownership, no
account, nothing server-side (ADR 0001) — and adds hosting cost, a privacy surface, and lock-in.

The real weakness of pure IndexedDB is not ownership but **durability**: browser storage can be
evicted under pressure or wiped when the user clears browsing data, and it does not move between
devices.

## Decision
Stay local-first; do **not** add a backend or accounts. Strengthen durability on-device instead:
1. **Persistent storage.** Request `navigator.storage.persist()` so the browser will not silently
   evict Nexus data.
2. **Own-folder storage (File System Access).** Let the user connect a folder on their own disk where
   original files are written as real files plus a self-describing JSON index. This folder is the
   durable, portable, user-owned copy — it survives a browser wipe and the user can back it up by
   their own means. IndexedDB remains the always-available working store and fallback.
3. **Full-archive export** as the fallback for browsers without File System Access (Firefox/Safari):
   a single archive bundling original files + index, with a matching import.
4. **No cross-device sync now.** Deferred as an explicit non-goal. If added later it must be an
   opt-in integration layered on top of the local-owned copy (like calendar sync), never a server
   becoming the source of truth.

## Consequences
- Ownership and "forever" are served better than a database would serve them: the canonical copy is
  files on the user's own disk, with no custodian, no account, no ongoing cost.
- Durability is materially improved over plain IndexedDB without changing Nexus's architecture.
- File System Access is browser-dependent (best in Chromium); Firefox/Safari fall back to IndexedDB +
  archive export. This browser variance is the accepted cost of avoiding a backend.
- No automatic cross-device sync; users move data via the folder or export/import, consistent with
  the existing portability model (ADR 0003).
- Folder-vs-IndexedDB reconciliation (when they diverge) is an implementation detail to settle in
  planning.
