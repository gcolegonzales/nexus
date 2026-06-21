import {
  clearGoogleAuth,
  loadGoogleAuth,
  saveGoogleAuth,
} from "@/core/integrations/google/store";
import type { GoogleAuthTokens } from "@/core/integrations/google/types";

export async function refreshAccessToken(
  refreshToken: string,
): Promise<GoogleAuthTokens> {
  const response = await fetch("/api/auth/google/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh Google access token.");
  }

  const data = (await response.json()) as {
    accessToken: string;
    expiresIn: number;
    refreshToken?: string;
  };

  const existing = await loadGoogleAuth();
  const tokens: GoogleAuthTokens = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? refreshToken,
    expiresAt: Date.now() + data.expiresIn * 1000 - 60_000,
    scope: existing?.scope,
    tokenType: existing?.tokenType,
  };

  await saveGoogleAuth(tokens);
  return tokens;
}

export async function getValidGoogleAccessToken(): Promise<string | null> {
  const tokens = await loadGoogleAuth();
  if (!tokens) return null;

  if (tokens.expiresAt > Date.now()) {
    return tokens.accessToken;
  }

  if (!tokens.refreshToken) {
    return null;
  }

  const refreshed = await refreshAccessToken(tokens.refreshToken);
  return refreshed.accessToken;
}

export async function disconnectGoogle(): Promise<void> {
  await clearGoogleAuth();
}

export function startGoogleConnect(): void {
  window.location.href = "/api/auth/google";
}

export function stashGoogleTokensFromSession(): GoogleAuthTokens | null {
  const raw = sessionStorage.getItem("nexus_google_auth_pending");
  if (!raw) return null;

  sessionStorage.removeItem("nexus_google_auth_pending");
  try {
    return JSON.parse(raw) as GoogleAuthTokens;
  } catch {
    return null;
  }
}
