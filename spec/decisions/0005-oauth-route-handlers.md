# 0005. Optional calendar OAuth via server route handlers, tokens stored locally

- Status: accepted
- Date: 2026-06-23

## Context
Calendar sync needs provider OAuth (Google, Microsoft), which requires a client secret that must not
ship to the browser. But Nexus has no user backend and wants tokens to live on-device like the rest
of the user's data.

## Decision
The OAuth authorization-code exchange runs in Next.js route handlers under `/api/auth/{provider}/*`,
which hold the server-only client secret. After exchange, the callback hands tokens to the client
briefly via `sessionStorage` (`nexus_{provider}_auth_pending`), and the client persists them into
IndexedDB (`hub:google-auth` / `hub:microsoft-auth`). Access tokens are refreshed on demand through
a refresh route. Connecting is optional; when a provider's public client id is unset, connect is
disabled but `.ics` export still works.

## Consequences
- The client secret never reaches the browser; tokens still live on-device, consistent with ADR 0001.
- There is a brief `sessionStorage` hand-off window (documented in `spec/known-discrepancies.md`).
- The product retains a fully local fallback (`.ics`) so calendar features never require an account.
- Per-home calendar ids and orphaned-event queues are stored in the Home Maintenance slice, not here.
