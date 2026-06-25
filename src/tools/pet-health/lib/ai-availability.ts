// ---------------------------------------------------------------------------
// Pet Health — AI availability gate
//
// Thin hook/helper that loads the stored AI config and surfaces whether the
// chat feature is usable. The chat task (T-015) consumes `useAiAvailable()` to
// gate the AI chat UI without coupling it to the config storage directly.
//
// PURE lib — no network calls. Safe to import in any client component.
// ---------------------------------------------------------------------------

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  loadAiConfig,
  isAiConfigured,
} from "@/tools/pet-health/storage/ai-config";
import type { AiProvider } from "@/tools/pet-health/types/ai";

export interface AiAvailability {
  /** True when a provider + non-empty API key are configured. */
  ready: boolean;
  /** The configured provider, or undefined when not configured. */
  provider: AiProvider | undefined;
  /** The configured model, or undefined when not configured. */
  model: string | undefined;
  /** Re-read the stored config (call after saving/clearing). */
  refresh: () => Promise<void>;
}

/**
 * React hook that returns the current AI availability state and a `refresh`
 * callback to re-check after saving or clearing the config.
 *
 * Usage:
 *   const { ready, provider, model, refresh } = useAiAvailable();
 */
export function useAiAvailable(): AiAvailability {
  const [ready, setReady] = useState(false);
  const [provider, setProvider] = useState<AiProvider | undefined>(undefined);
  const [model, setModel] = useState<string | undefined>(undefined);

  const refresh = useCallback(async () => {
    const config = await loadAiConfig();
    const configured = isAiConfigured(config);
    setReady(configured);
    setProvider(configured ? config!.provider : undefined);
    setModel(configured ? config!.model : undefined);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ready, provider, model, refresh };
}

/**
 * One-shot async check — useful outside React (e.g. in server actions or
 * utility code). Returns `true` when a provider + non-empty key are stored.
 */
export async function isAiReady(): Promise<boolean> {
  const config = await loadAiConfig();
  return isAiConfigured(config);
}
