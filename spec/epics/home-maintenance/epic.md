---
id: EPIC-home-maintenance
title: Home Maintenance Calendar
status: ready
---

## Intent
A tool for tracking a household's appliances and systems and the recurring maintenance they need.
Users register **assets** (per **home**), the tool generates a recurring **task schedule** from
templates, surfaces what's **due now**, lets users **complete** tasks (capturing HVAC filter
condition where relevant), and optionally **syncs** reminders to Google Calendar / Microsoft
Outlook or exports a universal `.ics`. Supports multiple homes with isolated assets, tasks, and
calendar links. Accent color: coral. Route root: `/tools/home-maintenance`.

## Features
- `FEAT-home-maintenance-1` — Homes & multi-home management
- `FEAT-home-maintenance-2` — Assets & HVAC details
- `FEAT-home-maintenance-3` — Task templates & schedule generation
- `FEAT-home-maintenance-4` — Schedule view & task editing
- `FEAT-home-maintenance-5` — Overview dashboard & due-date engine
- `FEAT-home-maintenance-6` — Task completion & HVAC condition tracking
- `FEAT-home-maintenance-7` — Calendar sync (ICS, Google, Microsoft)
