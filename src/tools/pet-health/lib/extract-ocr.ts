// ---------------------------------------------------------------------------
// Pet Health — local OCR via Tesseract.js (WASM).
//
// CLIENT-ONLY. tesseract.js is dynamically imported so its WASM/worker assets
// never load during SSR or the server build. Each call spins up a fresh worker
// and terminates it, so there is no shared mutable state across calls
// (idempotent).
//
// No API key and no provider egress: Tesseract runs entirely in the browser.
// It fetches its own language-model assets at runtime by default (the library's
// own asset download, not our egress to an AI provider), which the spec accepts
// for v1.
// ---------------------------------------------------------------------------

/**
 * Run local OCR on an image Blob and return the recognized plain text.
 * Always tears down its worker, even on error. Returns trimmed text (possibly
 * empty if nothing was recognized).
 */
export async function ocrImage(blob: Blob): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("OCR is only available in the browser.");
  }

  const { createWorker } = await import("tesseract.js");

  // English by default. createWorker loads the language data and is ready to
  // recognize immediately in tesseract.js v5+/v7.
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(blob);
    return (result.data.text ?? "").trim();
  } finally {
    await worker.terminate();
  }
}
