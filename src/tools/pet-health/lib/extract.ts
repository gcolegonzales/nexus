// ---------------------------------------------------------------------------
// Pet Health — text-extraction orchestrator.
//
// Decides how to turn an uploaded record into plain text:
//   - PDFs: try the embedded text layer first; if empty, fall back to OCR by
//     rasterizing each page and running local Tesseract OCR.
//   - Images: run local Tesseract OCR.
//   - Anything else: returns method 'none'.
//
// CLIENT-ONLY (the underlying libs dynamically import browser-only modules).
// Never throws: any failure is caught and reported as status 'failed'.
// Idempotent: no shared mutable state across calls.
// ---------------------------------------------------------------------------

import type { ExtractionMethod } from "../types/state";

export type ExtractMethod = Extract<ExtractionMethod, "pdf-text" | "ocr" | "none">;
export type ExtractStatus = "done" | "empty" | "failed";

export interface ExtractResult {
  text: string;
  method: ExtractMethod;
  status: ExtractStatus;
}

const EMPTY: ExtractResult = { text: "", method: "none", status: "empty" };
const FAILED: ExtractResult = { text: "", method: "none", status: "failed" };

function isNonEmpty(text: string): boolean {
  return text.trim().length > 0;
}

function done(text: string, method: Exclude<ExtractMethod, "none">): ExtractResult {
  return { text: text.trim(), method, status: "done" };
}

/**
 * Extract plain text from a record's file.
 *
 * @param blob     The file contents.
 * @param mimeType The record's MIME type (e.g. "application/pdf", "image/png").
 * @returns        { text, method, status }. Never throws.
 */
export async function extractRecordText(
  blob: Blob,
  mimeType: string,
): Promise<ExtractResult> {
  const type = (mimeType || blob.type || "").toLowerCase();

  try {
    if (type === "application/pdf") {
      return await extractFromPdf(blob);
    }
    if (type.startsWith("image/")) {
      const text = await ocrBlob(blob);
      return isNonEmpty(text) ? done(text, "ocr") : EMPTY;
    }
    // Unsupported type: nothing we can read.
    return EMPTY;
  } catch {
    return FAILED;
  }
}

async function extractFromPdf(blob: Blob): Promise<ExtractResult> {
  const { extractPdfText } = await import("./extract-pdf");
  const text = await extractPdfText(blob);
  if (isNonEmpty(stripPageMarkers(text))) {
    return done(text, "pdf-text");
  }

  // No usable text layer — attempt OCR by rasterizing pages. This path is the
  // most fragile; if rasterization fails for any reason we degrade to 'empty'
  // rather than failing the whole extraction.
  try {
    const ocrText = await ocrPdfPages(blob);
    return isNonEmpty(ocrText) ? done(ocrText, "ocr") : EMPTY;
  } catch {
    return EMPTY;
  }
}

async function ocrPdfPages(blob: Blob): Promise<string> {
  const { rasterizePdfPages } = await import("./extract-pdf");
  const pages = await rasterizePdfPages(blob);
  if (pages.length === 0) return "";

  const parts: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    const pageText = await ocrBlob(pages[i]);
    parts.push(`\n\n--- Page ${i + 1} ---\n\n${pageText}`);
  }
  return parts.join("").trim();
}

async function ocrBlob(blob: Blob): Promise<string> {
  const { ocrImage } = await import("./extract-ocr");
  return ocrImage(blob);
}

/** Remove page markers so whitespace-only PDFs are detected as empty. */
function stripPageMarkers(text: string): string {
  return text.replace(/---\s*Page\s+\d+\s*---/g, "");
}
