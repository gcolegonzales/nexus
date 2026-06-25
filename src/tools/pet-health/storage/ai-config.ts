import { getItem, removeItem, setItem } from "@/core/storage/db";
import { STORAGE_KEYS } from "@/core/storage/keys";
import type { AiProvider, AiProviderConfig } from "@/tools/pet-health/types/ai";

// ---------------------------------------------------------------------------
// Default models per provider
// ---------------------------------------------------------------------------

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
};

// ---------------------------------------------------------------------------
// Curated fallback models per provider
// ---------------------------------------------------------------------------
// Used before a key is set, or when a live /v1/models fetch fails.

export const FALLBACK_MODELS: Record<AiProvider, string[]> = {
  anthropic: [
    "claude-opus-4-8",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
  ],
  openai: [
    "gpt-4o",
    "gpt-4o-mini",
    "o3",
    "o3-mini",
    "gpt-4.1",
  ],
};

// ---------------------------------------------------------------------------
// Live model discovery via the provider's /v1/models endpoint
// ---------------------------------------------------------------------------

interface ModelsResponse {
  data?: Array<{ id?: unknown }>;
}

function parseModelIds(payload: unknown): string[] {
  const data = (payload as ModelsResponse | null)?.data;
  if (!Array.isArray(data)) return [];
  return data
    .map((entry) => (typeof entry?.id === "string" ? entry.id : null))
    .filter((id): id is string => id !== null);
}

/**
 * Fetch the list of available model ids for a provider using the user's key.
 * Never throws in a way that blocks the UI — returns FALLBACK_MODELS on any
 * error (missing key, network failure, non-OK response, malformed body).
 */
export async function fetchModels(
  provider: AiProvider,
  apiKey: string,
): Promise<string[]> {
  const key = apiKey.trim();
  if (!key) return FALLBACK_MODELS[provider] ?? [];

  try {
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!res.ok) return FALLBACK_MODELS.openai;
      const ids = parseModelIds(await res.json())
        .filter((id) => id.startsWith("gpt") || id.startsWith("o"))
        .sort((a, b) => b.localeCompare(a));
      return ids.length > 0 ? ids : FALLBACK_MODELS.openai;
    }

    // anthropic
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
    });
    if (!res.ok) return FALLBACK_MODELS.anthropic;
    const ids = parseModelIds(await res.json())
      .filter((id) => id.startsWith("claude"))
      .sort((a, b) => b.localeCompare(a));
    return ids.length > 0 ? ids : FALLBACK_MODELS.anthropic;
  } catch {
    return FALLBACK_MODELS[provider] ?? [];
  }
}

// ---------------------------------------------------------------------------
// load / save / clear
// ---------------------------------------------------------------------------

export async function loadAiConfig(): Promise<AiProviderConfig | null> {
  const stored = await getItem<AiProviderConfig>(STORAGE_KEYS.aiProvider);
  return stored ?? null;
}

export async function saveAiConfig(config: AiProviderConfig): Promise<void> {
  await setItem(STORAGE_KEYS.aiProvider, config);
}

export async function clearAiConfig(): Promise<void> {
  await removeItem(STORAGE_KEYS.aiProvider);
}

// ---------------------------------------------------------------------------
// Availability check
// ---------------------------------------------------------------------------

export function isAiConfigured(config: AiProviderConfig | null): boolean {
  if (!config) return false;
  const knownProviders: AiProvider[] = ["openai", "anthropic"];
  return knownProviders.includes(config.provider) && config.apiKey.length > 0;
}
