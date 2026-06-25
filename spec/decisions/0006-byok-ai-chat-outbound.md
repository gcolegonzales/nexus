# 0006. Bring-your-own-key AI chat as an opt-in, browser-direct outbound integration

- Status: accepted
- Date: 2026-06-25

## Context
The Pet Health tool (`EPIC-pet-health`) adds an AI chat that answers questions about a pet using the
extracted text of its medical records. This is the first feature that sends *user content* off the
device. It sits against two standing promises in `product.md`:
- "Your data stays on this device. No account required."
- Calendar OAuth is described as "the only optional network dependency" / "the only outbound
  integration", and the non-goals list "no telemetry / analytics / remote logging."

Nexus has no backend (ADR 0001), so there is no server to encrypt a key against or to proxy provider
calls through. We still want to honor the privacy posture: local-first by default, network strictly
opt-in and user-initiated.

## Decision
1. **Opt-in only.** AI chat does nothing until the user explicitly configures a provider and pastes
   their own API key. Pet/record storage and text extraction (non-vision path) work fully offline
   with no key. No AI calls happen implicitly or in the background.
2. **Bring-your-own-key, no Nexus-hosted AI.** The user supplies their own OpenAI or Anthropic key.
   There is no Nexus account, no shared/org key, and no Nexus-operated inference. (Contrast the CRM
   reference, which proxies and server-encrypts keys — not applicable without a backend.)
3. **Browser-direct calls.** The browser calls the chosen provider's API directly with the user's
   key. The only data egress is: (a) the chat request payload — the pet profile, the extracted
   record text, and the conversation — and (b) optionally a record image, if the vision OCR fallback
   (`FEAT-pet-health-3`) is used. Egress goes only to the provider the user chose, only when they
   send a message.
4. **Key is a local secret, excluded from export.** The provider config + key are stored under a
   dedicated hub key (`hub:ai-provider`), parallel to OAuth tokens, and are **never** included in the
   export bundle (ADR 0003 / `FEAT-hub-shell-6`). The key is stored in plaintext in IndexedDB; with
   no backend there is nothing to encrypt against, so we mitigate by keeping it out of exports and
   masking it in the UI rather than adding bespoke client-side crypto.
5. **Honest framing.** `product.md` is amended so the privacy promise is accurate: local-first and
   account-free remain true for storage; the AI chat is the second optional outbound integration
   (after calendar sync), is opt-in, and sends record content to the user's chosen provider when
   used. A non-clinical disclaimer is shown in the chat.

## Consequences
- The "only outbound integration is calendar" statement in `product.md` is updated to "calendar sync
  and opt-in AI chat are the two optional outbound integrations."
- Users who never configure a key get the original local-only guarantee unchanged.
- Sending medical record text to a third party is an inherent property of the feature; it is
  disclosed, opt-in, and scoped to the user's own provider/key. Nexus itself still stores nothing
  server-side and does no telemetry.
- Plaintext key in IndexedDB is a known, documented tradeoff of the no-backend architecture; keeping
  it out of exports limits accidental disclosure.
- Supporting two providers means two request adapters (OpenAI chat vs. Anthropic messages) and
  provider-aware token budgeting.
