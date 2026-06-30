// ---------------------------------------------------------------------------
// Pet Health — OpenAI-compatible chat adapter (shared core).
//
// Both OpenAI and xAI (Grok) expose the same Chat Completions wire format:
//   POST <baseUrl>/chat/completions
//   Authorization: Bearer <key>
//   body { model, messages:[{role,content}], … }   →  choices[0].message.content
//
// This module is parameterized by base URL + a human label (used in error
// copy) so a single implementation serves every OpenAI-compatible provider.
// The system prompt is passed through unchanged — identical across providers.
//
// CLIENT-ONLY (direct fetch with the user's key). No server route.
// ---------------------------------------------------------------------------

import type { AiProviderConfig } from "../../types/ai";
import type { ChatMessage } from "../../types/state";

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

/** Describes one OpenAI-compatible endpoint. */
export interface OpenAiCompatibleTarget {
  /** Base URL without a trailing slash, e.g. "https://api.openai.com/v1". */
  baseUrl: string;
  /** Human-facing provider name used in error messages, e.g. "OpenAI", "xAI". */
  label: string;
}

/** Map an error response to a readable, retry-aware Error. */
function compatError(
  label: string,
  status: number,
  body: OpenAiChatResponse | null,
): Error {
  const detail = body?.error?.message?.trim();
  if (status === 401) {
    return new Error(
      `${label} rejected the API key (401). Check your key in AI settings.`,
    );
  }
  if (status === 429) {
    return new Error(
      `${label} rate limit or quota reached (429). Wait a moment and try again.` +
        (detail ? ` Details: ${detail}` : ""),
    );
  }
  return new Error(
    `${label} request failed (${status}).` + (detail ? ` ${detail}` : ""),
  );
}

/**
 * Send a chat completion request to an OpenAI-compatible provider.
 *
 * @param target        Base URL + provider label.
 * @param config        Provider config (apiKey, model).
 * @param systemPrompt  System message content (provider-agnostic).
 * @param messages      Conversation history + new user message, in order.
 * @returns             The assistant's reply text.
 * @throws              A readable Error on non-OK responses or empty content.
 */
export async function sendChatOpenAiCompatible(
  target: OpenAiCompatibleTarget,
  config: AiProviderConfig,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const payload = {
    model: config.model,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  };

  let response: Response;
  try {
    response = await fetch(`${target.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      `Could not reach ${target.label}. Check your network connection and try again.`,
    );
  }

  let body: OpenAiChatResponse | null = null;
  try {
    body = (await response.json()) as OpenAiChatResponse;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw compatError(target.label, response.status, body);
  }

  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error(`${target.label} returned an empty response. Please try again.`);
  }

  return content;
}
