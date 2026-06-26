---
id: FEAT-pet-health-4
title: AI provider settings (bring-your-own-key)
epic: pet-health
status: ready
depends_on: [FEAT-pet-health-1, FEAT-hub-shell-4]
---

## Summary
The bring-your-own-key AI configuration. The user picks a **provider** (OpenAI or Anthropic), pastes
their **own API key**, and chooses a **model from a dropdown** of the provider's available models;
the configuration is stored locally and used to call the provider directly from the browser. The key
is a local secret — stored under a dedicated hub-level key (like OAuth tokens), masked in the UI, and
**excluded from the export bundle**. This config now lives in the **hub-wide app Settings**
(`/settings`, `FEAT-hub-shell-4`), not in the Pet Health tool — it is app-level config any AI feature
can use. Pet Health chat reads availability from it; when no key is configured the chat is gated, but
records storage and extraction still work.

## User stories
- As a pet owner, I want to use my own AI subscription by pasting my API key.
- As a pet owner, I want to choose between OpenAI and Anthropic depending on what I have.
- As a privacy-conscious user, I want my key to stay on this device and never be included in a data
  export I might share.

## Acceptance criteria
- [ ] The AI provider settings UI lives in the **hub app Settings** (`/settings`), as the "AI Provider"
      section (`FEAT-hub-shell-4`). The per-tool Pet Health AI settings UI is **removed** (Pet Health's
      own Settings keeps only durability). Lets the user select `provider` (`openai` | `anthropic`) and
      enter an API key.
- [ ] **Model dropdown (based on the key):** the model is chosen from a dropdown rather than free
      text, and the list is derived from the user's key. **Before a key is entered the model selector
      is gated** — no model list is shown, just a prompt to enter the key. Once a key is entered, the
      list is fetched from the provider (OpenAI `GET /v1/models`; Anthropic `GET /v1/models`), filtered
      to chat-capable models and sorted, with a sensible default preselected. A curated fallback list
      is used **only if the live fetch fails** (e.g. network/CORS) while a key is present. Refreshing
      re-fetches.
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
- `src/tools/pet-health/storage/ai-config.ts` (config + a `fetchModels(provider, key)` helper hitting
  the provider `/v1/models` endpoints with a curated fallback), the AI settings UI relocated to the hub
  settings panel (`src/app/settings/SettingsPanel.tsx` + a shared `AiSettings` component, moved out of
  `src/tools/pet-health/components/`), removal of the AI section from
  `src/app/tools/pet-health/settings/page.tsx`. Storage key + export exclusion unchanged.

## Dependencies
- Pets registry / tool shell (`FEAT-pet-health-1`); hub Settings page (`FEAT-hub-shell-4`).

## Open questions
- None. (AI config is hub-level under `hub:ai-provider`, excluded from export; the UI now lives in hub
  Settings; model is chosen from a provider-fetched dropdown with a curated fallback.)
