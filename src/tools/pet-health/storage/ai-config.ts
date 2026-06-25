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
