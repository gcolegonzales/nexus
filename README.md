# Nexus

Your central hub for personal tech tools. Local-first, private, and built to grow with you.

## What is Nexus?

Nexus is a single web app that hosts small, focused utilities — each with its own data and config, sharing only what makes sense (like profile info and date formatting). Your data stays in the browser; no account required for the MVP.

**First tool:** Home Maintenance Calendar — build appliance maintenance schedules and sync to your calendar.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm start
```

## Deploy

Optimized for [Vercel](https://vercel.com). Connect the repo and deploy.

For calendar sync, copy `.env.example` to `.env.local`:

- **Google:** enable Google Calendar API, add OAuth credentials and redirect URI.
- **Microsoft:** register an app in Azure, add `Calendars.ReadWrite` + `offline_access`, set redirect URI.

OAuth tokens are stored in the browser only — not on a Nexus server.

## Project structure

```
packages/
├── ui/               # @nexus/ui — design tokens, theme, primitives
└── next/             # @nexus/next — Next.js adapters (Button with Link, etc.)
src/
├── app/              # Next.js routes (thin pages)
├── core/             # Hub: profile, tool registry, future export/sync
├── shared/           # App-specific UI (hub shell, illustrations)
└── tools/            # Individual tools (home-maintenance first)
```

Shared components live in `@nexus/ui` and `@nexus/next`. Import tokens in your app's CSS:

```css
@import "tailwindcss";
@import "../../packages/ui/src/styles/tokens.css";
@source "../../packages/ui/src";
```

TypeScript components still import from `@nexus/ui` and `@nexus/next`.

A hidden component reference lives at [/component-library](http://localhost:3000/component-library) (not linked from the hub nav).

## Roadmap

- [x] Landing page and tool registry
- [x] IndexedDB storage and JSON export/import
- [x] Home Maintenance: assets, tasks, schedule builder
- [x] `.ics` calendar export (Apple, Outlook, universal)
- [x] Google Calendar OAuth sync
- [x] Microsoft Graph / Outlook sync
