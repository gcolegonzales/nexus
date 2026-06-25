// ---------------------------------------------------------------------------
// Pet Health — in-browser PDF text-layer extraction.
//
// CLIENT-ONLY. pdfjs-dist is dynamically imported inside each function so that
// nothing touches the worker / DOM / `import.meta.url` worker URL during SSR or
// the server build. Never import pdfjs at module top-level.
//
// The pdf.js worker is wired with the bundler-friendly approach documented for
// this customized Next.js (Turbopack): `new Worker(new URL(..., import.meta.url))`
// is understood by Turbopack and emitted as a real worker chunk. We assign it to
// `GlobalWorkerOptions.workerPort` so pdf.js uses our worker instance directly
// (no separate fetch of `workerSrc`).
// ---------------------------------------------------------------------------

const PAGE_MARKER = (n: number) => `\n\n--- Page ${n} ---\n\n`;

// Use a loose type for the pdfjs module — its published types are not bundled
// under a stable path and we only touch a small, stable surface.
type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

/**
 * Load pdfjs-dist once (per page session) and configure its worker exactly
 * once. Subsequent calls reuse the same module instance. This is safe to call
 * repeatedly and is idempotent with respect to worker setup.
 */
async function loadPdfjs(): Promise<PdfjsModule> {
  if (typeof window === "undefined") {
    throw new Error("PDF extraction is only available in the browser.");
  }
  if (pdfjsPromise) return pdfjsPromise;

  pdfjsPromise = (async () => {
    const pdfjs = await import("pdfjs-dist");
    // Configure the worker via a real Worker instance. Turbopack/webpack both
    // understand `new Worker(new URL('...', import.meta.url))` and will emit the
    // worker as its own chunk rather than trying to execute it on the server.
    if (!pdfjs.GlobalWorkerOptions.workerPort && !pdfjs.GlobalWorkerOptions.workerSrc) {
      try {
        const worker = new Worker(
          new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
          { type: "module" },
        );
        pdfjs.GlobalWorkerOptions.workerPort = worker;
      } catch {
        // Fall back to a same-origin worker URL if constructing the Worker via
        // import.meta.url is unavailable. pdf.js will fetch and spawn it itself.
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
      }
    }
    return pdfjs;
  })();

  return pdfjsPromise;
}

function toArrayBuffer(input: Blob | ArrayBuffer): Promise<ArrayBuffer> {
  if (input instanceof ArrayBuffer) return Promise.resolve(input);
  return input.arrayBuffer();
}

/**
 * Extract the embedded text layer from a PDF. Returns the concatenated text of
 * all pages, separated by page markers. Pages with no text layer contribute an
 * empty section (still preceded by their marker). Returns an empty string when
 * the document contains no extractable text (e.g. a scanned PDF).
 */
export async function extractPdfText(input: Blob | ArrayBuffer): Promise<string> {
  const pdfjs = await loadPdfjs();
  const data = await toArrayBuffer(input);

  // pdf.js takes ownership of the buffer; pass a copy so callers can reuse the
  // original Blob/ArrayBuffer (keeps the function idempotent / side-effect free).
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) });
  const doc = await loadingTask.promise;

  try {
    const parts: string[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      try {
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => (typeof (item as { str?: unknown }).str === "string" ? (item as { str: string }).str : ""))
          .join(" ")
          .replace(/[ \t]+/g, " ")
          .trim();
        parts.push(`${PAGE_MARKER(pageNum)}${pageText}`);
      } finally {
        // Release page resources eagerly to keep memory flat on large PDFs.
        page.cleanup();
      }
    }
    return parts.join("").trim();
  } finally {
    await doc.cleanup();
    await loadingTask.destroy();
  }
}

/**
 * Rasterize each PDF page to a PNG image Blob using pdf.js canvas rendering.
 * Used by the OCR fallback for scanned (text-less) PDFs. Runs client-only.
 * Returns an empty array if the document has no pages.
 */
export async function rasterizePdfPages(
  input: Blob | ArrayBuffer,
  scale = 2,
): Promise<Blob[]> {
  const pdfjs = await loadPdfjs();
  const data = await toArrayBuffer(input);
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)) });
  const doc = await loadingTask.promise;

  try {
    const blobs: Blob[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      try {
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const canvasContext = canvas.getContext("2d");
        if (!canvasContext) continue;

        await page.render({ canvas, canvasContext, viewport }).promise;

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), "image/png"),
        );
        if (blob) blobs.push(blob);
      } finally {
        page.cleanup();
      }
    }
    return blobs;
  } finally {
    await doc.cleanup();
    await loadingTask.destroy();
  }
}
