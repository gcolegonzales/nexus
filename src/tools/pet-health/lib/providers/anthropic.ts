// ---------------------------------------------------------------------------
// Pet Health — Anthropic (Claude) chat adapter.
//
// Calls the Anthropic Messages API directly from the browser using the user's
// key. Non-streaming. Surfaces provider/auth/quota errors as readable Errors.
//
// Wire details (per the Anthropic Messages API):
//   - Endpoint: POST https://api.anthropic.com/v1/messages
//   - Headers:  x-api-key: <key>
//               anthropic-version: 2023-06-01
//               anthropic-dangerous-direct-browser-access: true  (enables the
//                 direct browser call without CORS rejection)
//   - Body:     top-level `system` string (separate from `messages`),
//               `messages` are user/assistant with string content,
//               `max_tokens` is REQUIRED.
//   - Response: content[0].text.
//
// CLIENT-ONLY (direct fetch with the user's key). No server route.
// ---------------------------------------------------------------------------

import type { AiProviderConfig } from "../../types/ai";
import type { ChatMessage } from "../../types/state";

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/** Required by the Messages API; a generous ceiling for a chat reply. */
const MAX_TOKENS = 4096;

interface AnthropicMessagesResponse {
  content?: Array<{ type?: string; text?: string }>;
  error?: { message?: string };
}

/** Map an Anthropic error response to a readable, retryable-aware Error. */
function anthropicError(status: number, body: AnthropicMessagesResponse | null): Error {
  const detail = body?.error?.message?.trim();
  if (status === 401) {
    return new Error(
      "Anthropic rejected the API key (401). Check your key in AI settings.",
    );
  }
  if (status === 429) {
    return new Error(
      "Anthropic rate limit or quota reached (429). Wait a moment and try again." +
        (detail ? ` Details: ${detail}` : ""),
    );
  }
  return new Error(
    `Anthropic request failed (${status}).` + (detail ? ` ${detail}` : ""),
  );
}

/**
 * Send a message request to Anthropic's Messages API.
 *
 * @param config        Provider config (apiKey, model).
 * @param systemPrompt  Top-level system content (separate from messages).
 * @param messages      Conversation history + new user message, in order.
 * @returns             The assistant's reply text.
 * @throws              A readable Error on non-OK responses or empty content.
 */
export async function sendChatAnthropic(
  config: AiProviderConfig,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const payload = {
    model: config.model,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  };

  let response: Response;
  try {
    response = await fetch(ANTHROPIC_MESSAGES_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Could not reach Anthropic. Check your network connection and try again.",
    );
  }

  let body: AnthropicMessagesResponse | null = null;
  try {
    body = (await response.json()) as AnthropicMessagesResponse;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw anthropicError(response.status, body);
  }

  const text = body?.content
    ?.filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("")
    .trim();

  if (!text) {
    throw new Error("Anthropic returned an empty response. Please try again.");
  }

  return text;
}
