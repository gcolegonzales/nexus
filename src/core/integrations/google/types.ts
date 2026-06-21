export interface GoogleAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  scope?: string;
  tokenType?: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

export const GOOGLE_AUTH_SCOPES = [
  "openid",
  "email",
  GOOGLE_CALENDAR_SCOPE,
].join(" ");

export function isGoogleConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}

export function tokensFromResponse(
  response: GoogleTokenResponse,
  existingRefreshToken?: string,
): GoogleAuthTokens {
  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token ?? existingRefreshToken,
    expiresAt: Date.now() + response.expires_in * 1000 - 60_000,
    scope: response.scope,
    tokenType: response.token_type,
  };
}
