// ---------------------------------------------------------------------------
// Pet Health — OpenAI chat adapter.
//
// Calls the OpenAI Chat Completions API directly from the browser using the
// user's key. Non-streaming. Surfaces provider/auth/quota errors as readable
// Error objects.
//
// CLIENT-ONLY (direct fetch with the user's key). No server route.
// ---------------------------------------------------------------------------

import type { AiProviderConfig } from "../../types/ai";
import type { ChatMessage } from "../../types/state";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

/** Map an OpenAI error response to a readable, retryable-aware Error. */
function openAiError(status: number, body: OpenAiChatResponse | null): Error {
  const detail = body?.error?.message?.trim();
  if (status === 401) {
    return new Error(
      "OpenAI rejected the API key (401). Check your key in AI settings.",
    );
  }
  if (status === 429) {
    return new Error(
      "OpenAI rate limit or quota reached (429). Wait a moment and try again." +
        (detail ? ` Details: ${detail}` : ""),
    );
  }
  return new Error(
    `OpenAI request failed (${status}).` + (detail ? ` ${detail}` : ""),
  );
}

/**
 * Send a chat completion request to OpenAI.
 *
 * @param config        Provider config (apiKey, model).
 * @param systemPrompt  System message content.
 * @param messages      Conversation history + new user message, in order.
 * @returns             The assistant's reply text.
 * @throws              A readable Error on non-OK responses or empty content.
 */
export async function sendChatOpenAI(
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
    response = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(
      "Could not reach OpenAI. Check your network connection and try again.",
    );
  }

  let body: OpenAiChatResponse | null = null;
  try {
    body = (await response.json()) as OpenAiChatResponse;
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw openAiError(response.status, body);
  }

  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenAI returned an empty response. Please try again.");
  }

  return content;
}
