---
id: EPIC-room-coat
title: Room Coat
status: ready
---

## Intent
A 3D spatial-planning and paint-scheduling tool. Users design **units** made of **floors**, place
catalog **rooms**, draw **hallways**, add **doors/windows/openings**, and arrange **furnishings**
with **snap points** — all in an interactive three.js editor. They build a per-unit **paint
library**, assign **coats** (unit default → per-space → per-surface override) plus floor finishes,
review the resolved **surface schedule**, and export it as CSV for purchasing or a contractor.
All geometry is stored in millimetres with imperial/metric display. Accent color: sky.
Route root: `/tools/room-coat`.

## Features
- `FEAT-room-coat-1` — Units, floors & display preference
- `FEAT-room-coat-2` — Room catalog
- `FEAT-room-coat-3` — 3D editor & room placement
- `FEAT-room-coat-4` — Hallways & wall openings
- `FEAT-room-coat-5` — Doors & windows
- `FEAT-room-coat-6` — Furnishings & snap points
- `FEAT-room-coat-7` — Paint library
- `FEAT-room-coat-8` — Coats, surface paint resolution & floor finishes
- `FEAT-room-coat-9` — Surface schedule & CSV export
- `FEAT-room-coat-10` — View settings & editor overlays
