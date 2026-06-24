# 0001. Local-first persistence in IndexedDB, no backend

- Status: accepted
- Date: 2026-06-23

## Context
Nexus is positioned as a privacy-centric hub whose promise is "your data stays on this device, no
account required." Tools need durable, structured, reasonably large client storage that survives
reloads and works offline.

## Decision
All user data (profile + every tool's state slice + OAuth tokens) is stored in a single IndexedDB
database (`nexus`, store `kv`) via the `idb` library, behind a small KV API (`getItem`/`setItem`/
`removeItem`/`clearAll`) and a fixed `STORAGE_KEYS` map. There is no server-side database and no
Nexus account. Cross-device movement is via manual JSON export/import only.

## Consequences
- Strong privacy story; works without a network for everything except optional calendar sync.
- Pages that read data must be client components and tolerate an async "not ready" first render.
- No server-side validation or backup; data durability is tied to the browser profile, making
  export/import (ADR 0003) essential.
- No multi-user, no real-time collaboration, no server analytics — all explicit non-goals.
