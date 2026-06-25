# 0008. Title Case for labels and titles via a shared design-system utility

- Status: accepted
- Date: 2026-06-25

## Context
We want a single, consistent capitalization rule across the whole hub: every interactive
button/action label and every UI title/heading renders in **Title Case**, in all tools (Home
Maintenance, Room Coat, Pet Health) and the hub shell. Today casing is ad hoc — "Add another pet",
"Open tool", "Coming soon" sit next to "Surface schedule" and "AI Chat".

Two forces make this non-trivial:
1. **Acronyms / proper nouns must survive.** A blunt `text-transform: capitalize` (or a dumb
   word-by-word upper-first) corrupts "AI Chat" → "Ai Chat", and would mangle "HVAC", "ICS", "CSV",
   "PDF", "OAuth", "OpenAI", "3D". So casing must be content-aware, not a CSS transform.
2. **Some "titles" render user-entered content.** `PageHeader title` is often "Buddy's Records";
   cards show a pet's name; record rows show a user-typed record title. Title-casing those would
   alter the user's own data and is out of scope.

## Decision
Introduce a shared **`titleCase(input: string): string`** utility in `@nexus/ui` (re-exported by
`@nexus/next`) and apply it at the design-system primitive level, not by hand-editing every string.

1. **Casing rules.** Capitalize the first and last word and all major words; lowercase a fixed set
   of minor words (a, an, and, as, at, but, by, for, if, in, nor, of, on, or, per, the, to, vs, via)
   when they are neither first nor last.
2. **Preserve verbatim** any token in a code-maintained **allow-list** of acronyms/proper nouns
   (AI, HVAC, ICS, CSV, PDF, PNG, JPEG, WebP, HEIC, OCR, JSON, URL, API, OAuth, OpenAI, GPT,
   Anthropic, Claude, ID, UI, 3D, Nexus, …). Adding one is a one-line change.
3. **Preserve inner-caps tokens.** Any word that already contains an interior uppercase letter
   (OpenAI, McFluff, iPad) is left exactly as-is. This makes the function **idempotent**
   (`titleCase(titleCase(x)) === titleCase(x)`) and safe against re-casing already-correct copy and
   unusual user names.
4. **Transform string text only.** In components that take `children: ReactNode` (e.g. Button), only
   string leaves are transformed; icons, arrows ("→"), and other nodes pass through untouched.
5. **Auto-apply to static-copy primitives:** Button / PrimaryButton labels, Badge labels,
   ToolSectionHeader titles, ToolNavBar item labels, and the landing ToolCard tool name. These
   always render fixed UI chrome, so every button/badge/nav/section title across the app becomes
   Title Case with no per-call work.
6. **Do NOT auto-transform user-content-bearing titles** — `PageHeader`, `Modal`, and `Card` titles
   can carry user data. Instead: hardcoded/static titles passed to them are authored in Title Case,
   and those components expose an optional `titleCase?: boolean` (default **false**) to opt in for
   static dynamic labels. User-entered values are never transformed.
7. **Out of scope:** body paragraphs, descriptions, helper text, input placeholders, toasts, and any
   free-form user content keep their natural casing.

## Consequences
- One utility, one allow-list — consistent casing without sprinkling transforms or rewriting copy,
  and acronyms/brands stay correct.
- The static-vs-user-content split means "ALWAYS Title Case" holds for UI chrome while the user's own
  text (pet names, their record titles) is never rewritten. This is the deliberate boundary of the
  rule.
- A genuinely all-lowercase static label that is *intended* to be lowercase would need to opt out;
  none exist today, and the inner-caps rule covers stylized brand tokens.
- The allow-list must be maintained as new acronyms/brands appear (cheap, one line each).
