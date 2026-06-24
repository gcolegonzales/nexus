---
id: FEAT-hub-shell-7
title: Calendar-provider OAuth integrations (Google & Microsoft)
epic: hub-shell
status: ready
depends_on: [FEAT-hub-shell-5]
---

## Summary
Shared OAuth plumbing that tools (today, Home Maintenance) reuse to obtain calendar-write access to
Google Calendar and Microsoft Outlook/365. The authorization handshake runs through Next route
handlers under `/api/auth/*`; access/refresh tokens land in IndexedDB and are refreshed on demand.
The only outbound integration in the product, and fully optional.

## User stories
- As a user, I want to connect my Google or Microsoft calendar so a tool can push reminders.
- As a user, I want my tokens stored locally and to be able to disconnect at any time.
- As a privacy-conscious user, I want everything to work (via `.ics`) even if I never connect.

## Acceptance criteria
- [ ] Google scopes are `openid email https://www.googleapis.com/auth/calendar`; Microsoft scopes
      are `openid profile offline_access Calendars.ReadWrite`. Microsoft tenant defaults to `common`
      (override via `MICROSOFT_TENANT_ID`).
- [ ] `isGoogleConfigured()` / `isMicrosoftConfigured()` return true only when the respective
      `NEXT_PUBLIC_*_CLIENT_ID` is set; when false, connect actions are disabled but `.ics` export is
      unaffected.
- [ ] Starting a connection navigates to `/api/auth/{provider}`, which redirects to the provider's
      authorize endpoint with the configured client id, redirect URI, scopes, and consent/offline
      params (Google: `access_type=offline`, `prompt=consent`, `include_granted_scopes=true`).
- [ ] The callback handler exchanges the `code` for tokens server-side (using the server-only client
      secret), stashes them into `sessionStorage` under
      `nexus_{provider}_auth_pending`, and redirects to
      `/tools/home-maintenance/sync?{connected flag}`; the client then moves them into IndexedDB and
      clears the session key.
- [ ] Tokens are stored as `{ accessToken, refreshToken?, expiresAt, scope?, tokenType? }` where
      `expiresAt` is epoch-ms with a ~1-minute safety buffer applied; Google under `hub:google-auth`,
      Microsoft under `hub:microsoft-auth`.
- [ ] `getValid{Google,Microsoft}AccessToken()` returns a non-expired access token, transparently
      refreshing via `/api/auth/{provider}/refresh` when expired and a refresh token exists, else null.
- [ ] On the provider returning an `error`, the callback redirects back to the sync page with an
      error query param (no tokens stored).
- [ ] `disconnect{Google,Microsoft}()` removes the stored tokens; `isConnected` is true when an
      access or refresh token is present.

## Constraints / non-goals
- Tokens never leave the device except in calls to the provider's own APIs; Nexus has no server-side
  token store.
- This feature provides auth only; turning tasks into calendar events is `FEAT-home-maintenance-7`.

## Affected areas
- `src/core/integrations/google/*`, `src/core/integrations/microsoft/*`,
  `src/app/api/auth/{google,microsoft}/{route.ts,callback/route.ts,refresh/route.ts}`, `.env.example`.

## Dependencies
- Local-first storage (`FEAT-hub-shell-5`).

## Open questions
- [ ] None. (The brief `sessionStorage` hand-off window is a documented design trade-off; see
      `spec/known-discrepancies.md`.)
