---
id: FEAT-hub-shell-8
title: Title Case labels & titles (design-system convention)
epic: hub-shell
status: ready
depends_on: [FEAT-hub-shell-1, FEAT-hub-shell-2]
---

## Summary
A hub-wide convention, enforced through the design system: every interactive button/action label and
every static UI title/heading renders in **Title Case**, consistently across the hub shell and all
tools. A shared, acronym-aware `titleCase()` utility lives in `@nexus/ui` and is applied at the
shared primitive level so the rule holds automatically. Acronyms and proper nouns (AI, HVAC, CSV,
PDF, OpenAI, 3D, …) are preserved; user-entered content and long-form copy are never transformed.
See ADR 0008.

## User stories
- As a user, I want the interface to feel consistent — buttons and titles capitalized the same way
  everywhere, not a mix of "Add another pet" and "Surface Schedule".
- As a developer, I want casing handled by the design system so I don't hand-case every label and so
  acronyms never get mangled into "Ai" or "Csv".

## Acceptance criteria
- [ ] A shared `titleCase(input: string): string` exists in `@nexus/ui` and is re-exported from
      `@nexus/next`. It:
  - [ ] Capitalizes the first and last word and all major words; lowercases minor words (a, an, and,
        as, at, but, by, for, if, in, nor, of, on, or, per, the, to, vs, via) when not first/last.
  - [ ] Preserves verbatim any token in a code-maintained acronym/proper-noun allow-list (at least:
        AI, HVAC, ICS, CSV, PDF, PNG, JPEG, WebP, HEIC, OCR, JSON, URL, API, OAuth, OpenAI, GPT,
        Anthropic, Claude, ID, UI, 3D, Nexus).
  - [ ] Preserves any word that already contains an interior uppercase letter (OpenAI, McFluff, iPad).
  - [ ] Is idempotent: `titleCase(titleCase(x)) === titleCase(x)`.
  - [ ] Leaves numbers, punctuation, and trailing glyphs (e.g. "→") intact.
- [ ] The utility is auto-applied (string text only; non-string React children pass through) in the
      static-copy primitives so labels/titles are Title Case without per-call edits:
      `@nexus/next` Button & PrimaryButton labels, `@nexus/ui` Badge labels,
      `src/shared/ui/tool/ToolSectionHeader` titles, `src/shared/ui/tool/ToolNavBar` item labels, and
      the landing `src/shared/ui/ToolCard` tool name.
- [ ] Title components that may carry user-entered content — `PageHeader`, `Modal`, `Card` titles —
      are **not** auto-transformed. Their hardcoded/static titles are authored in Title Case, and each
      exposes an optional `titleCase?: boolean` (default false) for opt-in casing. User-entered values
      (pet names, user-typed record titles, home/unit names, etc.) are never transformed.
- [ ] After this change, static UI copy across the hub and all three tools reads in Title Case — e.g.
      "Add another pet"→"Add Another Pet", "Open tool"→"Open Tool", "Coming soon"→"Coming Soon",
      "View records"→"View Records" — while "AI Chat", "AI Required", "HVAC", "CSV", "3D", "OpenAI"
      keep their casing. Verify by loading each tool in `npm run dev`.
- [ ] Body paragraphs, descriptions, helper text, input placeholders, and toasts are unchanged.

## Constraints / non-goals
- No CSS `text-transform: capitalize` anywhere for this purpose (it breaks acronyms).
- Does not transform user-entered content or long-form prose.
- The rule targets buttons + titles/headings/nav/badges; it is not a general typography overhaul.

## Affected areas
- New: `packages/ui/src/title-case.ts` (+ `packages/ui/src/index.ts` export; `@nexus/next` re-export).
- Apply in: `packages/next/src/Button.tsx`, `packages/next/src/PrimaryButton.tsx`,
  `packages/ui/src/Badge.tsx`, `src/shared/ui/tool/ToolSectionHeader.tsx`,
  `src/shared/ui/tool/ToolNavBar.tsx`, `src/shared/ui/ToolCard.tsx`.
- Optional `titleCase` prop on `packages/ui/src/PageHeader.tsx`, `Modal.tsx`, `Card.tsx`.
- Audit static titles passed to PageHeader/Card/Modal across `src/app/**` and tool components; fix
  any not already Title Case (leave user-content slots alone).

## Dependencies
- Landing & registry (`FEAT-hub-shell-1`), navigation shell (`FEAT-hub-shell-2`).

## Open questions
- [ ] **User-content titles:** the spec defaults PageHeader/Card/Modal to *not* auto-transform (to
      protect user data like "Buddy's Records"); static titles there are authored in Title Case
      instead. Confirm this boundary (vs. auto-transforming and risking unusual user names).
- [ ] **IconActionButton aria-labels** (screen-reader-only text) are left in natural sentence case,
      not title-cased — confirm that's desired.
