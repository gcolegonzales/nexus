import {
  clearMicrosoftAuth,
  loadMicrosoftAuth,
  saveMicrosoftAuth,
} from "@/core/integrations/microsoft/store";
import type { MicrosoftAuthTokens } from "@/core/integrations/microsoft/types";

export async function refreshMicrosoftAccessToken(
  refreshToken: string,
): Promise<MicrosoftAuthTokens> {
  const response = await fetch("/api/auth/microsoft/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Microsoft access token.");
  }

  const data = (await response.json()) as {
    accessToken: string;
    expiresIn: number;
    refreshToken?: string;
  };

  const existing = await loadMicrosoftAuth();
  const tokens: MicrosoftAuthTokens = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? refreshToken,
    expiresAt: Date.now() + data.expiresIn * 1000 - 60_000,
    scope: existing?.scope,
    tokenType: existing?.tokenType,
  };

  await saveMicrosoftAuth(tokens);
  return tokens;
}

export async function getValidMicrosoftAccessToken(): Promise<string | null> {
  const tokens = await loadMicrosoftAuth();
  if (!tokens) return null;

  if (tokens.expiresAt > Date.now()) {
    return tokens.accessToken;
  }

  if (!tokens.refreshToken) {
    return null;
  }

  const refreshed = await refreshMicrosoftAccessToken(tokens.refreshToken);
  return refreshed.accessToken;
}

export async function disconnectMicrosoft(): Promise<void> {
  await clearMicrosoftAuth();
}

export function startMicrosoftConnect(): void {
  window.location.href = "/api/auth/microsoft";
}

export function stashMicrosoftTokensFromSession(): MicrosoftAuthTokens | null {
  const raw = sessionStorage.getItem("nexus_microsoft_auth_pending");
  if (!raw) return null;

  sessionStorage.removeItem("nexus_microsoft_auth_pending");
  try {
    return JSON.parse(raw) as MicrosoftAuthTokens;
  } catch {
    return null;
  }
}
