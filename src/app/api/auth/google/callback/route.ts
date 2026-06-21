import { NextResponse } from "next/server";
import {
  tokensFromResponse,
  type GoogleTokenResponse,
} from "@/core/integrations/google/types";

export const dynamic = "force-static";

function getRedirectUri(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/api/auth/google/callback`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/tools/home-maintenance/sync?error=${encodeURIComponent(error)}`,
        url.origin,
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/tools/home-maintenance/sync?error=missing_code", url.origin),
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(
        "/tools/home-maintenance/sync?error=google_not_configured",
        url.origin,
      ),
    );
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(request),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      new URL(
        "/tools/home-maintenance/sync?error=token_exchange_failed",
        url.origin,
      ),
    );
  }

  const payload = (await tokenResponse.json()) as GoogleTokenResponse;
  const tokens = tokensFromResponse(payload);
  const tokenJson = JSON.stringify(tokens);

  const html = `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Connecting Google Calendar…</title></head>
  <body>
    <p>Connecting Google Calendar…</p>
    <script>
      sessionStorage.setItem("nexus_google_auth_pending", ${JSON.stringify(tokenJson)});
      window.location.replace("/tools/home-maintenance/sync?connected=1");
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
