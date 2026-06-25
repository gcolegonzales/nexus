---
id: FEAT-pet-health-5
title: Pet AI chat with record context
epic: pet-health
status: done
depends_on: [FEAT-pet-health-1, FEAT-pet-health-3, FEAT-pet-health-4]
---

## Summary
A chat panel scoped to the selected pet. Each message sends a system prompt built from that pet's
profile plus the extracted text of all its records, so the assistant answers grounded in the pet's
real history. Calls go directly from the browser to the configured provider (OpenAI or Anthropic)
using the user's key. Conversation history is kept per pet locally and trimmed to fit a token
budget. Responses are non-streaming to start. The assistant is explicitly framed as an informational
aid, not a veterinarian.

## User stories
- As a pet owner, I want to ask questions about my pet and get answers that reflect its uploaded
  records and profile.
- As a pet owner, I want the conversation to persist per pet so I can come back to it.
- As a pet owner, I want clear footing that this is informational, not a substitute for my vet.

## Acceptance criteria
- [ ] Within a pet, a chat UI lets the user type a message and receive an assistant reply; while
      awaiting a reply the input is disabled and a processing indicator shows (non-streaming: one
      request, full response).
- [ ] Each request sends: a system prompt containing the pet's profile fields + the concatenated
      `extractedText` of that pet's records (with per-record titles/dates as headers), followed by the
      trimmed conversation history and the new user message.
- [ ] The request is routed to the provider chosen in `FEAT-pet-health-4` using the stored key, via
      the correct API shape per provider (OpenAI chat vs. Anthropic messages) and the configured
      model; the browser calls the provider directly (no Nexus server).
- [ ] If no key/provider is configured, the chat is gated with a prompt to open AI settings; it does
      not attempt a call.
- [ ] When the combined record context + history would exceed a token budget, history is trimmed
      (oldest-first) and, if necessary, record context is truncated with a visible "some records
      truncated" notice rather than failing silently.
- [ ] Conversation history is stored per pet in the `tool:pet-health` slice and survives reload; the
      user can clear a pet's conversation; deleting a pet removes its conversation.
- [ ] Provider/network/quota errors surface a readable message (e.g. invalid key, rate limited) and
      let the user retry; a failed send does not corrupt stored history.
- [ ] The chat shows a persistent non-clinical disclaimer ("Informational only — not veterinary
      advice. Consult your vet.").

## Constraints / non-goals
- Non-streaming for the first version; streaming is a later enhancement.
- No function-calling/actions (unlike the CRM reference) — this is read-only Q&A over the pet's data.
- No automatic medical advice, triage, or diagnosis claims; disclaimer required.
- Record context is whatever extraction produced; the assistant cannot read files extraction failed
  on (those are excluded with their status noted in the prompt where helpful).

## Affected areas
- `src/tools/pet-health/lib/build-system-prompt.ts`, `src/tools/pet-health/lib/providers/{openai,anthropic}.ts`,
  `src/tools/pet-health/lib/trim-history.ts`, chat state + UI under
  `src/tools/pet-health/components/Chat*`, conversation types/storage in the slice.

## Dependencies
- Pets registry (`FEAT-pet-health-1`), text extraction (`FEAT-pet-health-3`), AI provider settings
  (`FEAT-pet-health-4`).

## Open questions
- None. (Resolved during planning: use a char-based token estimate (~4 chars/token), reserve a
  portion of the model's context for the reply, then trim history oldest-first and, if still over,
  truncate record context with a visible notice. Default context target is a conservative per-model
  constant, overridable; this mirrors the CRM's `trimChatHistory` adapted to both providers.)
