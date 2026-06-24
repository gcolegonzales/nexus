import { NextResponse } from "next/server";
import {
  getMicrosoftTenantId,
  tokensFromMicrosoftResponse,
  type MicrosoftTokenResponse,
} from "@/core/integrations/microsoft/types";

// Must run at request time to read the provider's `?code=` query param.
export const dynamic = "force-dynamic";

function getRedirectUri(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/api/auth/microsoft/callback`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/tools/home-maintenance/sync?microsoft_error=${encodeURIComponent(error)}`,
        url.origin,
      ),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/tools/home-maintenance/sync?microsoft_error=missing_code",
        url.origin,
      ),
    );
  }

  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(
        "/tools/home-maintenance/sync?microsoft_error=not_configured",
        url.origin,
      ),
    );
  }

  const tenant = getMicrosoftTenantId();
  const tokenResponse = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getRedirectUri(request),
        grant_type: "authorization_code",
        code,
      }),
    },
  );

  if (!tokenResponse.ok) {
    return NextResponse.redirect(
      new URL(
        "/tools/home-maintenance/sync?microsoft_error=token_exchange_failed",
        url.origin,
      ),
    );
  }

  const payload = (await tokenResponse.json()) as MicrosoftTokenResponse;
  const tokens = tokensFromMicrosoftResponse(payload);
  const tokenJson = JSON.stringify(tokens);

  const html = `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Connecting Outlook…</title></head>
  <body>
    <p>Connecting Outlook…</p>
    <script>
      sessionStorage.setItem("nexus_microsoft_auth_pending", ${JSON.stringify(tokenJson)});
      window.location.replace("/tools/home-maintenance/sync?microsoft_connected=1");
    </script>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
