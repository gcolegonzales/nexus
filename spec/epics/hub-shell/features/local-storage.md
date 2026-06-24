---
id: FEAT-hub-shell-5
title: Local-first storage & schema versioning
epic: hub-shell
status: ready
depends_on: []
---

## Summary
The persistence foundation every tool and the profile build on: a single IndexedDB database with a
key/value object store, a fixed set of storage keys, async get/set/remove/clear helpers, and a
schema-version marker. Each tool layers its own slice normalization + migration on top of these
primitives. This is the backbone of the local-first promise.

## User stories
- As any feature, I want a simple async KV API over IndexedDB so I can persist a serializable slice
  under a known key.
- As a user, I want my data to persist across reloads and browser sessions with no account.

## Acceptance criteria
- [ ] One IndexedDB database `nexus` (version 1) with a single object store `kv` is opened lazily and
      the open promise is cached/reused.
- [ ] `STORAGE_KEYS` defines exactly: `profile` → `hub:profile`, `homeMaintenance` →
      `tool:home-maintenance`, `roomCoat` → `tool:room-coat`, `googleAuth` → `hub:google-auth`,
      `microsoftAuth` → `hub:microsoft-auth`, `schemaVersion` → `meta:schema-version`.
- [ ] The store exposes `getItem<T>(key)` (→ `T | undefined`), `setItem<T>(key,value)`,
      `removeItem(key)`, and `clearAll()` (empties the store).
- [ ] `ensureSchemaVersion()` sets the app-level `meta:schema-version` to the current value (1) when
      absent; it is idempotent and safe to call on every app load.
- [ ] Writes are durable: a value set under a key is returned by a subsequent `getItem` after reload.
- [ ] All storage operations are async and never throw on a missing key (`getItem` returns
      `undefined`).

## Constraints / non-goals
- This layer is intentionally schema-agnostic: it stores opaque serializable values. Slice-shape
  validation and per-tool migrations live in each tool's `storage`/`lib` (see tool features), not here.
- No encryption at rest (data is local to the browser profile).

## Affected areas
- `src/core/storage/{db.ts,keys.ts}`.

## Dependencies
- None (foundation).

## Open questions
- [ ] None. (The app-level `meta:schema-version` is currently a constant `1`; per-tool slices carry
      their own independent `schemaVersion`. This separation is intentional.)
