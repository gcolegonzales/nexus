import { NextResponse } from "next/server";
import {
  getMicrosoftTenantId,
  tokensFromMicrosoftResponse,
} from "@/core/integrations/microsoft/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Microsoft OAuth is not configured." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as { refreshToken?: string };
  if (!body.refreshToken) {
    return NextResponse.json(
      { error: "refreshToken is required." },
      { status: 400 },
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
        refresh_token: body.refreshToken,
        grant_type: "refresh_token",
      }),
    },
  );

  if (!tokenResponse.ok) {
    return NextResponse.json(
      { error: "Failed to refresh access token." },
      { status: 401 },
    );
  }

  const payload = await tokenResponse.json();
  const tokens = tokensFromMicrosoftResponse(payload, body.refreshToken);

  return NextResponse.json({
    accessToken: tokens.accessToken,
    expiresIn: Math.max(
      60,
      Math.floor((tokens.expiresAt - Date.now()) / 1000),
    ),
    refreshToken: tokens.refreshToken,
  });
}
