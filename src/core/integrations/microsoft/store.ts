import { getItem, removeItem, setItem } from "@/core/storage/db";
import { STORAGE_KEYS } from "@/core/storage/keys";
import type { MicrosoftAuthTokens } from "@/core/integrations/microsoft/types";

export async function loadMicrosoftAuth(): Promise<MicrosoftAuthTokens | null> {
  const stored = await getItem<MicrosoftAuthTokens>(STORAGE_KEYS.microsoftAuth);
  return stored ?? null;
}

export async function saveMicrosoftAuth(
  tokens: MicrosoftAuthTokens,
): Promise<void> {
  await setItem(STORAGE_KEYS.microsoftAuth, tokens);
}

export async function clearMicrosoftAuth(): Promise<void> {
  await removeItem(STORAGE_KEYS.microsoftAuth);
}

export async function isMicrosoftConnected(): Promise<boolean> {
  const tokens = await loadMicrosoftAuth();
  return Boolean(tokens?.accessToken || tokens?.refreshToken);
}
