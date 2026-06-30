// ---------------------------------------------------------------------------
// Pet Health — xAI (Grok) chat adapter.
//
// xAI's API is OpenAI-compatible, so this is a thin wrapper over the shared
// OpenAI-compatible adapter, bound to xAI's base URL. Calls the Chat
// Completions API directly from the browser using the user's key. Non-streaming.
//
// CLIENT-ONLY (direct fetch with the user's key). No server route.
// ---------------------------------------------------------------------------

import type { AiProviderConfig } from "../../types/ai";
import type { ChatMessage } from "../../types/state";
import { sendChatOpenAiCompatible } from "./openai-compatible";

const XAI_TARGET = { baseUrl: "https://api.x.ai/v1", label: "xAI" };

/**
 * Send a chat completion request to xAI (Grok).
 *
 * @param config        Provider config (apiKey, model).
 * @param systemPrompt  System message content.
 * @param messages      Conversation history + new user message, in order.
 * @returns             The assistant's reply text.
 * @throws              A readable Error on non-OK responses or empty content.
 */
export function sendChatXai(
  config: AiProviderConfig,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  return sendChatOpenAiCompatible(XAI_TARGET, config, systemPrompt, messages);
}
