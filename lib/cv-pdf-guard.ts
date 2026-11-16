// Decompression budget for uploaded PDFs (#108). No server-only imports, so it is unit tested.
//
// The guard decides from the bytes, not from stream dictionaries: dictionaries can be disguised
// (wrong /Length, indirect or escaped filter names, comments, padding) in ways the PDF library
// still understands. At every stream, if the data starts with a valid zlib header (the only data
// the PDF library will Flate-decode), it is inflated with a hard running cap, whatever the
// dictionary claims. Expanding filters ordinary CV exports never use are refused wherever their
// names appear, including inside compressed object streams.
import { constants, inflateRawSync } from "node:zlib";

/** Total decompressed size allowed across a PDF's streams before the PDF library sees it. */
export const MAX_PDF_INFLATED_BYTES = 32 * 1024 * 1024;

export class CvReadError extends Error {}

const STREAM = Buffer.from("stream");
// A PDF delimiter must follow the name, which keeps chance matches in binary data very rare. Known
// limitation: long base64 text (for example an embedded XMP thumbnail) can occasionally match an
// abbreviated name; the member is then asked to save the file again, which is a safe failure.
const REFUSED_FILTERS = /\/(ASCII85Decode|ASCIIHexDecode|LZWDecode|RunLengthDecode|A85|AHx|LZW|RL)(?=[\s/\]>])/;

/** PDF names may escape characters as #xx; undo that so disguised filter names are still found. */
function unescapeNames(text: string): string {
  return text.replace(/#([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/** The checks the PDF library itself makes before Flate decoding: method 8, FCHECK, no preset dictionary. */
function isZlibHeader(buffer: Buffer, at: number): boolean {
  if (at + 2 > buffer.length) return false;
  const cmf = buffer[at];
  const flg = buffer[at + 1];
  return (cmf & 0x0f) === 8 && ((cmf << 8) | flg) % 31 === 0 && (flg & 0x20) === 0;
}

/**
 * Finds the first CR or LF at or after a position. Each byte value's next position is cached and only
 * searched again once passed, so the total search work is linear in the file size.
 */
function lineBreakFinder(buffer: Buffer): (from: number) => number {
  let nextCr = -1;
  let nextLf = -1;
  const advance = (cached: number, byte: number, from: number) => {
    if (cached >= from || cached === buffer.length) return cached;
    const found = buffer.indexOf(byte, from);
    return found < 0 ? buffer.length : found;
  };
  return (from) => {
    nextCr = advance(nextCr, 0x0d, from);
    nextLf = advance(nextLf, 0x0a, from);
    return Math.min(nextCr, nextLf);
  };
}

/** Total compressed input the guard may feed to zlib, relative to the file size, so repeated keywords cannot multiply the work. */
const MAX_INPUT_FACTOR = 8;

/**
 * Rejects PDFs whose compressed data would expand beyond a fixed budget ("decompression bombs"),
 * or that use expanding filters ordinary CVs never use. Each candidate stream is inflated by
 * Node's zlib, which stops at the final deflate block (linear time) and never produces more
 * than the remaining budget.
 */
export function assertPdfInflationWithinBudget(bytes: Uint8Array, budget = MAX_PDF_INFLATED_BYTES): void {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (REFUSED_FILTERS.test(unescapeNames(buffer.toString("latin1")))) throw new CvReadError("too-large");

  let remaining = budget;
  let inputAllowance = Math.max(buffer.length, 1024) * MAX_INPUT_FACTOR;
  let from = 0;
  const nextLineBreak = lineBreakFinder(buffer);
  let lastDataStart = -1;
  for (;;) {
    const keyword = buffer.indexOf(STREAM, from);
    if (keyword < 0) return;
    from = keyword + STREAM.length;
    // The "stream" inside an "endstream" keyword starts nothing.
    if (keyword >= 3 && buffer.toString("latin1", keyword - 3, keyword) === "end") continue;
    // Stream data starts after the first CR, LF or CR LF following the keyword, as the PDF library reads it.
    let dataStart = nextLineBreak(from);
    if (buffer[dataStart] === 0x0d) dataStart += 1;
    if (buffer[dataStart] === 0x0a) dataStart += 1;
    // Keywords that lead to data already counted add nothing.
    if (dataStart === lastDataStart) continue;
    lastDataStart = dataStart;
    if (!isZlibHeader(buffer, dataStart)) continue; // The PDF library will not Flate-decode it.

    let output: Buffer;
    let consumed: number;
    try {
      // Raw inflate ignores the adler32 trailer and anything after the final block, and Z_SYNC_FLUSH
      // returns truncated data instead of failing, so disguised lengths and checksums still count.
      const result = inflateRawSync(buffer.subarray(dataStart + 2), {
        finishFlush: constants.Z_SYNC_FLUSH,
        maxOutputLength: remaining + 1,
        info: true,
      }) as unknown as { buffer: Buffer; engine: { bytesWritten: number } };
      output = result.buffer;
      consumed = result.engine.bytesWritten;
    } catch {
      // Over the budget, or deflate data that is invalid: refuse rather than let the PDF library try.
      throw new CvReadError("too-large");
    }
    inputAllowance -= consumed;
    if (inputAllowance < 0) throw new CvReadError("too-large");
    remaining -= output.length;
    if (remaining < 0) throw new CvReadError("too-large");
    // Compressed object streams can hide an expanding filter name.
    if (REFUSED_FILTERS.test(unescapeNames(output.toString("latin1")))) throw new CvReadError("too-large");
  }
}
