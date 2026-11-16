// Decompression budget for uploaded PDFs (#108). No server-only imports, so it is unit tested.
import { inflateSync } from "node:zlib";

/** Total decompressed size allowed across a PDF's streams before the PDF library sees it. */
export const MAX_PDF_INFLATED_BYTES = 32 * 1024 * 1024;

export class CvReadError extends Error {}

const STREAM = Buffer.from("stream");
const END_STREAM = Buffer.from("endstream");

/**
 * Rejects PDFs whose compressed streams would expand beyond a fixed budget
 * ("decompression bombs"). Each stream is inflated with a hard output cap, so
 * this check itself can never use more than the budget.
 */
export function assertPdfInflationWithinBudget(bytes: Uint8Array, budget = MAX_PDF_INFLATED_BYTES): void {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let remaining = budget;
  let from = 0;
  for (;;) {
    const start = buffer.indexOf(STREAM, from);
    if (start < 0) return;
    let dataStart = start + STREAM.length;
    if (buffer[dataStart] === 0x0d) dataStart += 1;
    if (buffer[dataStart] === 0x0a) dataStart += 1;
    const end = buffer.indexOf(END_STREAM, dataStart);
    if (end < 0) return;
    // Skip the "stream" inside "endstream" on the next search.
    from = end + END_STREAM.length;
    try {
      remaining -= inflateSync(buffer.subarray(dataStart, end), { maxOutputLength: remaining + 1 }).length;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ERR_BUFFER_TOO_LARGE") throw new CvReadError("too-large");
      continue; // Not a Flate stream (images, fonts in other encodings): nothing to count.
    }
    if (remaining < 0) throw new CvReadError("too-large");
  }
}

