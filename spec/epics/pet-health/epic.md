---
id: EPIC-pet-health
title: Pet Health
status: done
---

## Intent
A tool for keeping a pet's medical history in one place and talking to an AI about it. Users
register **pets** (per-pet profiles), upload **records** — vet medical records and sign-out /
discharge documents (PDFs and images) — which are stored locally, and the tool **extracts text**
from each upload so its content is machine-readable. Users can then open a **pet chat**: an AI
assistant that receives the selected pet's profile plus the extracted text of all its records as
context, so it can answer questions grounded in that pet's actual history. The AI is strictly
**opt-in and bring-your-own-key**: a settings panel lets the user choose a provider (OpenAI,
Anthropic, or xAI / Grok) and paste their own API key, which is stored locally; the browser calls the provider
directly. Record storage and the rest of the tool work fully offline with no key. Accent color:
mint. Route root: `/tools/pet-health`.

## Features
- `FEAT-pet-health-1` — Tool registration & pets registry
- `FEAT-pet-health-2` — Medical records & document vault
- `FEAT-pet-health-3` — In-browser text extraction
- `FEAT-pet-health-4` — AI provider settings (bring-your-own-key)
- `FEAT-pet-health-5` — Pet AI chat with record context
- `FEAT-pet-health-6` — Durable local storage — own folder & full archive

This is an **AI-required** tool: its manifest sets `requiresAI`, and the landing tile shows an
"AI Required" badge. The document-vault half (pets, records, storage, extraction) still works without
a key; only the chat is gated.

## Cross-cutting impact
- Amends `FEAT-hub-shell-1` (Landing & registry): `ToolManifest` gains optional `requiresAI`, cards
  render an "AI Required" badge, and the registry now lists three tools.
- Amends `FEAT-hub-shell-6` (Backup & restore): the export bundle gains the `pet-health` slice
  (metadata + extracted text) and the export version bumps from 2 to 3.
- Introduces `ADR 0006` (bring-your-own-key AI chat as an opt-in outbound integration) and `ADR 0007`
  (durable local-first storage without a backend: persistent storage + File System Access), which
  together amend the "calendar sync is the only outbound integration" framing in `product.md`.
