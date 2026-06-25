---
id: FEAT-pet-health-4
title: AI provider settings (bring-your-own-key)
epic: pet-health
status: ready
depends_on: [FEAT-pet-health-1]
---

## Summary
A settings panel that configures the AI used by the pet chat. The user picks a **provider** (OpenAI
or Anthropic), pastes their **own API key**, and optionally picks a model; the configuration is
stored locally and used to call the provider directly from the browser. The key is treated as a
local secret — stored under a dedicated hub-level storage key (like OAuth tokens), masked in the UI,
and **excluded from the export bundle**. When no key is configured, the chat feature is gated off
with a clear call to action, but records storage and extraction (for the non-key path) still work.

## User stories
- As a pet owner, I want to use my own AI subscription by pasting my API key.
- As a pet owner, I want to choose between OpenAI and Anthropic depending on what I have.
- As a privacy-conscious user, I want my key to stay on this device and never be included in a data
  export I might share.

## Acceptance criteria
- [ ] A settings section within the tool lets the user select `provider` (`openai` | `anthropic`),
      enter an API key, and optionally choose a `model` (sensible latest-capable default per
      provider pre-filled); a non-default base URL is out of scope.
- [ ] The configuration persists under a dedicated storage key (e.g. `hub:ai-provider`, added to
      `STORAGE_KEYS`) — **separate** from the `tool:pet-health` slice, mirroring how OAuth tokens are
      stored as their own hub keys.
- [ ] The API key input is masked; after saving, the UI shows a "configured" state (provider + masked
      key + model) and offers Clear; the raw key is never rendered back in full.
- [ ] The export bundle (`FEAT-hub-shell-6`) **does not** include the AI provider config / key (same
      treatment as OAuth tokens, which are excluded from export).
- [ ] An availability check derives "AI ready" = a provider + non-empty key are configured; the chat
      feature (`FEAT-pet-health-5`) reads this gate and shows a configure-key prompt when not ready.
- [ ] Saving validates the shape minimally (non-empty key, known provider); a basic connectivity test
      (a cheap models/ping call) is optional and, if included, must not block saving.

## Constraints / non-goals
- No Nexus-hosted AI, no server proxy, no shared/org keys — strictly the user's own key,
  device-local. (See ADR 0006.)
- The key is stored in plaintext in IndexedDB (no server to encrypt against); this tradeoff is
  documented and the key is kept out of exports. No additional client-side encryption in scope.
- Only OpenAI and Anthropic in scope for now.

## Affected areas
- `src/core/storage/keys.ts` (add `aiProvider` key), `src/tools/pet-health/storage/ai-config.ts`,
  `src/tools/pet-health/components/AiSettings*`, `src/core/export/bundle.ts` (ensure key is excluded).

## Dependencies
- Pets registry / tool shell (`FEAT-pet-health-1`).

## Open questions
- None. (Resolved during planning: AI config lives at **hub level** under `hub:ai-provider` so future
  AI tools can reuse it, and is treated like OAuth tokens — excluded from export.)
