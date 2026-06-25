"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirm } from "@nexus/ui";
import { Button } from "@nexus/next";
import { usePetHealth } from "@/tools/pet-health/PetHealthProvider";
import type { Pet } from "@/tools/pet-health/types/state";
import type { ChatMessage as ChatMessageType } from "@/tools/pet-health/types/state";
import { ChatMessage } from "@/tools/pet-health/components/ChatMessage";
import { buildSystemPrompt } from "@/tools/pet-health/lib/build-system-prompt";
import { trimContext } from "@/tools/pet-health/lib/trim-history";
import { loadAiConfig } from "@/tools/pet-health/storage/ai-config";
import { sendChat } from "@/tools/pet-health/lib/providers/index";

// ---------------------------------------------------------------------------
// Default context window to use when we don't know the exact model limit.
// 128 000 is the current Claude 3 / GPT-4o upper bound; erring large is safe
// because trimContext uses a conservative 75% budget anyway.
// ---------------------------------------------------------------------------
const DEFAULT_MODEL_CONTEXT_TOKENS = 128_000;

interface ChatPanelProps {
  pet: Pet;
}

export function ChatPanel({ pet }: ChatPanelProps) {
  const { state, getMessages, appendMessage, clearConversation } = usePetHealth();
  const confirm = useConfirm();

  const messages = getMessages(pet.id);
  const records = state.records.filter((r) => r.petId === pet.id);

  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Text that failed to send — kept so user can retry without retyping
  const [pendingText, setPendingText] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const doSend = useCallback(
    async (text: string) => {
      const trimmedText = text.trim();
      if (!trimmedText || sending) return;

      setSending(true);
      setError(null);
      setTruncated(false);
      setPendingText(null);

      const userMessage: ChatMessageType = {
        role: "user",
        content: trimmedText,
        createdAt: new Date().toISOString(),
      };

      // Append the user message immediately so the UI shows it right away.
      await appendMessage(pet.id, userMessage);
      setInputText("");

      try {
        const systemPrompt = buildSystemPrompt(pet, records);
        const history = getMessages(pet.id); // re-read after appending

        const trimResult = trimContext({
          systemPrompt,
          // exclude the just-appended user message from history — it becomes newMessage
          history: history.slice(0, -1),
          newMessage: userMessage,
          modelContextTokens: DEFAULT_MODEL_CONTEXT_TOKENS,
        });

        if (trimResult.truncated) {
          setTruncated(true);
        }

        const config = await loadAiConfig();
        if (!config) {
          throw new Error("AI is not configured. Add an API key in Settings.");
        }

        const replyText = await sendChat(
          config,
          trimResult.systemPrompt,
          trimResult.messages,
        );

        const assistantMessage: ChatMessageType = {
          role: "assistant",
          content: replyText,
          createdAt: new Date().toISOString(),
        };

        await appendMessage(pet.id, assistantMessage);
      } catch (err) {
        // Remove the user message we optimistically appended so history stays
        // clean on failure — but the user message was already persisted.
        // Per spec: do NOT corrupt history. We keep the user turn (already
        // persisted) but never add a dangling assistant turn. Show the error
        // with the original text available for retry.
        const msg =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setError(msg);
        setPendingText(trimmedText);
      } finally {
        setSending(false);
      }
    },
    [sending, pet, records, getMessages, appendMessage],
  );

  async function handleSend() {
    const text = inputText.trim();
    if (!text) return;
    await doSend(text);
  }

  async function handleRetry() {
    if (!pendingText) return;
    setInputText(pendingText);
    setPendingText(null);
    setError(null);
  }

  async function handleClear() {
    const confirmed = await confirm({
      title: "Clear conversation?",
      message: `Delete all chat history for ${pet.name}? This cannot be undone.`,
      confirmLabel: "Clear",
      destructive: true,
    });
    if (!confirmed) return;
    await clearConversation(pet.id);
    setError(null);
    setTruncated(false);
    setPendingText(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* -------------------------------------------------------------------- */}
      {/* Disclaimer — always visible                                            */}
      {/* -------------------------------------------------------------------- */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/40 dark:bg-amber-900/20 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-300 mb-4 flex-shrink-0">
        <span className="font-medium">Informational only</span> — not veterinary
        advice. Consult your vet for any health concerns.
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Truncation notice                                                      */}
      {/* -------------------------------------------------------------------- */}
      {truncated && (
        <div className="rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-muted mb-3 flex-shrink-0">
          Some records were truncated to fit the context window.
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Message list                                                           */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted py-12">
            <div className="text-center space-y-2">
              <p className="font-medium text-text">Start a conversation</p>
              <p>
                Ask anything about {pet.name}&apos;s health, medications, or
                records.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <ChatMessage key={i} message={msg} />)
        )}

        {/* Processing indicator */}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-muted animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-muted animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-muted animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Error banner                                                           */}
      {/* -------------------------------------------------------------------- */}
      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger mb-3 flex-shrink-0 flex items-start justify-between gap-3">
          <span>{error}</span>
          {pendingText && (
            <button
              type="button"
              onClick={() => void handleRetry()}
              className="shrink-0 text-xs font-medium underline underline-offset-2 hover:no-underline"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------------- */}
      {/* Input area                                                             */}
      {/* -------------------------------------------------------------------- */}
      <div className="flex-shrink-0 border-t border-border pt-4 space-y-3">
        <div className="flex gap-2 items-end">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            placeholder={`Ask about ${pet.name}…`}
            rows={3}
            className="flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <Button
            onClick={() => void handleSend()}
            disabled={sending || !inputText.trim()}
          >
            {sending ? "Sending…" : "Send"}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">
            Press <kbd className="font-mono">Enter</kbd> to send,{" "}
            <kbd className="font-mono">Shift+Enter</kbd> for a new line.
          </p>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => void handleClear()}
              className="text-xs text-muted hover:text-danger transition-colors"
            >
              Clear conversation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
