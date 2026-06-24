# 0003. Per-tool schema versioning, migrations, and a versioned export bundle

- Status: accepted
- Date: 2026-06-23

## Context
Local data outlives any single release. Tool data shapes will change, and users must be able to move
their data between browsers/devices without loss. There is no server to run migrations centrally.

## Decision
Every tool state slice carries its own `schemaVersion`. On load, the tool's storage layer
normalizes and migrates the stored slice forward through a sequential migration chain
(Home Maintenance currently v3; Room Coat currently v10) and always writes the current version.
The backup/restore bundle is itself versioned (currently export version 2) and import accepts older
versions (v1 = profile + home-maintenance only), delegating slice normalization/migration to each
tool's importer.

## Decision
- Changing a tool's persisted shape requires bumping that tool's `schemaVersion` and adding a
  forward migration; if the bundle's shape changes, bump the export version and handle older imports.
- Import is **replace**, not merge, and reloads the app afterward.

## Consequences
- Old local data and old backup files keep working across releases.
- Migrations are append-only and must be idempotent and lossless with respect to user edits.
- The app-level `meta:schema-version` (currently constant 1) is separate from per-tool slice
  versions; the per-tool versions are the ones that matter for data evolution.
