import { NextResponse } from "next/server";
import {
  getMicrosoftTenantId,
  MICROSOFT_GRAPH_SCOPES,
} from "@/core/integrations/microsoft/types";

export const dynamic = "force-static";

function getRedirectUri(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/api/auth/microsoft/callback`;
}

export function GET(request: Request) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "MICROSOFT_CLIENT_ID is not configured." },
      { status: 500 },
    );
  }

  const tenant = getMicrosoftTenantId();
  const redirectUri = getRedirectUri(request);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: MICROSOFT_GRAPH_SCOPES,
    response_mode: "query",
    prompt: "consent",
  });

  return NextResponse.redirect(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`,
  );
}
