import { getItem, removeItem, setItem } from "@/core/storage/db";
import { STORAGE_KEYS } from "@/core/storage/keys";
import type { GoogleAuthTokens } from "@/core/integrations/google/types";

export async function loadGoogleAuth(): Promise<GoogleAuthTokens | null> {
  const stored = await getItem<GoogleAuthTokens>(STORAGE_KEYS.googleAuth);
  return stored ?? null;
}

export async function saveGoogleAuth(tokens: GoogleAuthTokens): Promise<void> {
  await setItem(STORAGE_KEYS.googleAuth, tokens);
}

export async function clearGoogleAuth(): Promise<void> {
  await removeItem(STORAGE_KEYS.googleAuth);
}

export async function isGoogleConnected(): Promise<boolean> {
  const tokens = await loadGoogleAuth();
  return Boolean(tokens?.accessToken || tokens?.refreshToken);
}
