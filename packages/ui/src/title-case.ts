/**
 * titleCase() — Title Case utility for @nexus/ui
 *
 * Rules:
 * - Capitalize the first and last token and all "major" words.
 * - Lowercase a fixed set of minor words when NOT first or last.
 * - Preserve verbatim any token matching (case-insensitively) an acronym/proper-noun
 *   allow-list, emitting the allow-list's canonical casing.
 * - Preserve any token that already contains an interior uppercase letter as-is.
 * - Handle hyphenated words by title-casing each segment (unless a segment is in the
 *   allow-list or has an interior uppercase letter).
 * - Strip leading/trailing punctuation when deciding capitalization, then re-attach it.
 * - Leave numbers, standalone glyphs like "→", and punctuation-only tokens intact.
 * - Idempotent: titleCase(titleCase(x)) === titleCase(x).
 */

/** Minor words lowercased when not first or last. */
const MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for",
  "if", "in", "nor", "of", "on", "or", "per", "the",
  "to", "vs", "via",
]);

/**
 * Acronym / proper-noun allow-list.
 * Key: lowercased token → Value: canonical casing to emit.
 * Export as mutable so callers can extend it at runtime.
 */
export const ACRONYMS: Record<string, string> = {
  ai: "AI",
  hvac: "HVAC",
  ics: "ICS",
  csv: "CSV",
  pdf: "PDF",
  png: "PNG",
  jpeg: "JPEG",
  jpg: "JPG",
  webp: "WebP",
  heic: "HEIC",
  ocr: "OCR",
  json: "JSON",
  url: "URL",
  api: "API",
  oauth: "OAuth",
  openai: "OpenAI",
  gpt: "GPT",
  anthropic: "Anthropic",
  claude: "Claude",
  id: "ID",
  ui: "UI",
  "3d": "3D",
  nexus: "Nexus",
};

/** True if a token (or bare word) has an interior uppercase letter. */
function hasInteriorUpper(token: string): boolean {
  // At least one uppercase letter that is not at position 0
  for (let i = 1; i < token.length; i++) {
    if (token[i] >= "A" && token[i] <= "Z") return true;
  }
  return false;
}

/**
 * Capitalize the first letter of a bare word (no punctuation),
 * leaving the rest lowercase.
 */
function capitalizeWord(word: string): string {
  if (word.length === 0) return word;
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Apply casing to a single bare word (no surrounding punctuation):
 *  1. If in ACRONYMS allow-list → canonical form.
 *  2. If has interior uppercase → preserve as-is.
 *  3. Otherwise → capitalize (first letter upper, rest lower).
 */
function caseWord(word: string, isMinor: boolean): string {
  const lower = word.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ACRONYMS, lower)) {
    return ACRONYMS[lower];
  }
  if (hasInteriorUpper(word)) {
    return word; // preserve as-is (e.g. McFluff, iPad)
  }
  if (isMinor) {
    return word.toLowerCase();
  }
  return capitalizeWord(word);
}

/**
 * Strip leading and trailing non-letter, non-digit, non-hyphen punctuation from
 * a token, apply casing to the core, then reattach the stripped punctuation.
 *
 * Returns the processed token string.
 */
function processToken(token: string, isFirst: boolean, isLast: boolean): string {
  // Match leading punct / core / trailing punct
  const match = token.match(/^([^A-Za-z0-9]*)(.+?)([^A-Za-z0-9]*)$/);
  if (!match) {
    // Entirely non-alphanumeric — leave intact (e.g. "→", "--", "...")
    return token;
  }
  const [, leading, core, trailing] = match;

  const cased = processCoreWord(core, isFirst, isLast);
  return leading + cased + trailing;
}

/**
 * Process the "core" of a token (no leading/trailing punctuation).
 * Handles hyphenated compounds by recursing over each segment.
 */
function processCoreWord(core: string, isFirst: boolean, isLast: boolean): string {
  // If the core contains a hyphen, process each segment individually.
  if (core.includes("-")) {
    const parts = core.split("-");
    const processed = parts.map((part, idx) => {
      const partIsFirst = isFirst && idx === 0;
      const partIsLast = isLast && idx === parts.length - 1;
      return processCoreWord(part, partIsFirst, partIsLast);
    });
    return processed.join("-");
  }

  // No hyphen — single word
  const lower = core.toLowerCase();
  const isMinor = !isFirst && !isLast && MINOR_WORDS.has(lower);
  return caseWord(core, isMinor);
}

/**
 * Convert a string to Title Case using hub-shell conventions.
 *
 * @param input - The string to transform.
 * @returns The Title Case version of the string.
 */
export function titleCase(input: string): string {
  if (!input) return input;

  // Split on whitespace, preserving any run of whitespace as a separator
  // so we can reconstruct spacing faithfully.
  const parts = input.split(/(\s+)/);

  // Identify the indices in `parts` that are actual tokens (not whitespace runs).
  const tokenIndices: number[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (!/^\s+$/.test(parts[i]) && parts[i].length > 0) {
      tokenIndices.push(i);
    }
  }

  if (tokenIndices.length === 0) return input;

  const firstIdx = tokenIndices[0];
  const lastIdx = tokenIndices[tokenIndices.length - 1];

  const result = parts.map((part, i) => {
    // Whitespace segments — pass through
    if (/^\s+$/.test(part) || part.length === 0) return part;

    const isFirst = i === firstIdx;
    const isLast = i === lastIdx;
    return processToken(part, isFirst, isLast);
  });

  return result.join("");
}
