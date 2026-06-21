import { NextResponse } from "next/server";
import { GOOGLE_AUTH_SCOPES } from "@/core/integrations/google/types";

export const dynamic = "force-static";

function getRedirectUri(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/api/auth/google/callback`;
}

export function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_CLIENT_ID is not configured." },
      { status: 500 },
    );
  }

  const redirectUri = getRedirectUri(request);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_AUTH_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
