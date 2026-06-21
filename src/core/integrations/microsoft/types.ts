export interface MicrosoftAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  tokenType?: string;
}

export interface MicrosoftTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

export const MICROSOFT_GRAPH_SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "Calendars.ReadWrite",
].join(" ");

export function getMicrosoftTenantId(): string {
  return process.env.MICROSOFT_TENANT_ID || "common";
}

export function isMicrosoftConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID);
}

export function tokensFromMicrosoftResponse(
  response: MicrosoftTokenResponse,
  existingRefreshToken?: string,
): MicrosoftAuthTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? existingRefreshToken,
    expiresAt: Date.now() + response.expires_in * 1000 - 60_000,
    scope: response.scope,
    tokenType: response.token_type,
  };
}
