// ---------------------------------------------------------------------------
// Pet Health — chat provider dispatch.
//
// Routes a chat request to the correct adapter based on config.provider.
// Both adapters call their provider's API directly from the browser using the
// user's key (non-streaming). No server route.
// ---------------------------------------------------------------------------

import type { AiProviderConfig } from "../../types/ai";
import type { ChatMessage } from "../../types/state";
import { sendChatAnthropic } from "./anthropic";
import { sendChatOpenAI } from "./openai";

export { sendChatOpenAI } from "./openai";
export { sendChatAnthropic } from "./anthropic";

/**
 * Send a chat request to the configured provider.
 *
 * @param config        Provider config (provider, apiKey, model).
 * @param systemPrompt  System / grounding content.
 * @param messages      Conversation history + new user message, in order.
 * @returns             The assistant's reply text.
 * @throws              A readable Error on provider/auth/quota/network failures.
 */
export function sendChat(
  config: AiProviderConfig,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  switch (config.provider) {
    case "openai":
      return sendChatOpenAI(config, systemPrompt, messages);
    case "anthropic":
      return sendChatAnthropic(config, systemPrompt, messages);
    default: {
      const exhaustive: never = config.provider;
      return Promise.reject(
        new Error(`Unsupported AI provider: ${String(exhaustive)}`),
      );
    }
  }
}
