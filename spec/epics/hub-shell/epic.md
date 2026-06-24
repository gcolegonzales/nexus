---
id: EPIC-hub-shell
title: Hub Shell & Core Platform
status: ready
---

## Intent
The shared platform that hosts every tool — "the general tool." It owns the landing experience,
the navigation chrome, identity (profile), app settings, theming, the local-first persistence
layer, portable backup/restore, and the optional OAuth integrations that individual tools reuse.
Tools plug into this shell via the tool registry; the shell knows nothing tool-specific beyond a
tool's manifest. This epic defines the contract every tool depends on.

## Features
- `FEAT-hub-shell-1` — Landing page & tool registry
- `FEAT-hub-shell-2` — Hub navigation shell (header, account menu, footer, tool shell)
- `FEAT-hub-shell-3` — Household profile
- `FEAT-hub-shell-4` — Settings & theming
- `FEAT-hub-shell-5` — Local-first storage & schema versioning
- `FEAT-hub-shell-6` — Backup & restore (export / import bundle)
- `FEAT-hub-shell-7` — Calendar-provider OAuth integrations (Google & Microsoft)
