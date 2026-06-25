// ---------------------------------------------------------------------------
// Pet Health — context trimming.
//
// Fits a system prompt + conversation history + new user message into a
// model's context budget using a coarse char-based token estimate
// (~4 chars/token). A portion of the context is reserved for the reply.
//
//   1. Trim conversation history OLDEST-FIRST until it fits.
//   2. If still over budget after dropping all history, truncate the
//      record-context portion of the system prompt and flag it.
//
// PURE: no React, no DOM, no I/O. Deterministic.
// ---------------------------------------------------------------------------

import type { ChatMessage } from "../types/state";

/** Average characters per token for the coarse estimate. */
const CHARS_PER_TOKEN = 4;

/** Fraction of the model context reserved for the assistant's reply. */
const REPLY_RESERVE_FRACTION = 0.25;

/** Marker appended when record context is truncated to fit. */
const TRUNCATION_MARKER =
  "\n\n[Note: some record context was truncated to fit the conversation. " +
  "Tell the user that not all of this pet's records could be included.]";

export interface TrimContextInput {
  /** The full system prompt (profile + record context + disclaimer). */
  systemPrompt: string;
  /** Conversation history, oldest first. */
  history: ChatMessage[];
  /** The new user message about to be sent. */
  newMessage: ChatMessage;
  /** The target model's context window, in tokens. */
  modelContextTokens: number;
}

export interface TrimContextResult {
  /** The system prompt, possibly truncated. */
  systemPrompt: string;
  /** The kept history followed by the new message. */
  messages: ChatMessage[];
  /** True if the system prompt's record context was truncated. */
  truncated: boolean;
}

/** Estimate token count from character length (~4 chars/token, rounded up). */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function messageTokens(message: ChatMessage): number {
  // Small per-message overhead approximates role framing / separators.
  return estimateTokens(message.content) + 4;
}

function sumTokens(messages: ChatMessage[]): number {
  return messages.reduce((total, m) => total + messageTokens(m), 0);
}

/**
 * Trim the system prompt and history to fit the model's input budget.
 *
 * @returns the possibly-truncated system prompt, the kept messages (history +
 *          new message), and whether record context was truncated.
 */
export function trimContext(input: TrimContextInput): TrimContextResult {
  const { systemPrompt, history, newMessage, modelContextTokens } = input;

  const safeContext = Math.max(0, Math.floor(modelContextTokens));
  // Budget available for input (system + messages), reserving room for the reply.
  const inputBudget = Math.max(0, Math.floor(safeContext * (1 - REPLY_RESERVE_FRACTION)));

  const systemTokens = estimateTokens(systemPrompt);
  const newMessageTokens = messageTokens(newMessage);

  // 1. Trim history oldest-first to fit alongside the system prompt + new message.
  const kept = [...history];
  while (kept.length > 0 && systemTokens + sumTokens(kept) + newMessageTokens > inputBudget) {
    kept.shift();
  }

  // 2. If even system prompt + new message alone exceed the budget, truncate
  //    the record-context portion of the system prompt.
  let finalSystemPrompt = systemPrompt;
  let truncated = false;

  if (systemTokens + newMessageTokens > inputBudget) {
    truncated = true;
    const markerTokens = estimateTokens(TRUNCATION_MARKER);
    const allowedSystemTokens = Math.max(0, inputBudget - newMessageTokens - markerTokens);
    const allowedChars = allowedSystemTokens * CHARS_PER_TOKEN;
    const head = systemPrompt.slice(0, allowedChars);
    finalSystemPrompt = head + TRUNCATION_MARKER;
  }

  return {
    systemPrompt: finalSystemPrompt,
    messages: [...kept, newMessage],
    truncated,
  };
}
