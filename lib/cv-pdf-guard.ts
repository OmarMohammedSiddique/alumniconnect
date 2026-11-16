// Decompression budget for uploaded PDFs (#108). No server-only imports, so it is unit tested.
//
// The guard decides from the bytes, not from stream dictionaries: dictionaries can be disguised
// (wrong /Length, indirect or escaped filter names, comments, padding) in ways the PDF library
// still understands. At every stream, if the data starts with a valid zlib header (the only data
// the PDF library will Flate-decode), it is inflated with a hard running cap, whatever the
// dictionary claims. Expanding filters ordinary CV exports never use are refused wherever their
// names appear, including inside compressed object streams.
import { Inflate } from "fflate";

/** Total decompressed size allowed across a PDF's streams before the PDF library sees it. */
export const MAX_PDF_INFLATED_BYTES = 32 * 1024 * 1024;

export class CvReadError extends Error {}

const STREAM = Buffer.from("stream");
const SLICE = 1024; // compressed bytes per step
// Deflate expands at most about 1032 to 1, so a slice whose output is lost to a decode error is charged this much.
const WORST_CASE_SLICE_OUTPUT = SLICE * 1032;
const MAX_EOL_SKIP = 4;
// A PDF delimiter must follow the name, which keeps chance matches in binary data very rare.
const REFUSED_FILTERS = /\/(ASCII85Decode|ASCIIHexDecode|LZWDecode|RunLengthDecode|A85|AHx|LZW|RL)(?=[\s/\]>])/;

/** PDF names may escape characters as #xx; undo that so disguised filter names are still found. */
function unescapeNames(text: string): string {
  return text.replace(/#([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function isZlibHeader(buffer: Buffer, at: number): boolean {
  if (at + 2 > buffer.length) return false;
  const cmf = buffer[at];
  const flg = buffer[at + 1];
  return (cmf & 0x0f) === 8 && (cmf >> 4) <= 7 && ((cmf << 8) | flg) % 31 === 0 && (flg & 0x20) === 0;
}

/**
 * Inflates raw deflate data from `start` to the end of the buffer in small slices, counting output and
 * scanning it for refused filter names. Stops at the final block, on a decode error, or past `limit`.
 * Returns the number of bytes produced; output past the limit is never kept.
 */
function countInflated(buffer: Buffer, start: number, limit: number): number {
  let produced = 0;
  let finished = false;
  let tail = "";
  const inflater = new Inflate((chunk, final) => {
    produced += chunk.length;
    if (produced > limit) throw new CvReadError("too-large");
    const text = tail + Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength).toString("latin1");
    if (REFUSED_FILTERS.test(unescapeNames(text))) throw new CvReadError("too-large");
    tail = text.slice(-24);
    if (final) finished = true;
  });
  try {
    for (let at = start; at < buffer.length && !finished; at += SLICE) {
      const end = Math.min(at + SLICE, buffer.length);
      inflater.push(buffer.subarray(at, end), end === buffer.length);
    }
  } catch (error) {
    if (error instanceof CvReadError) throw error;
    // A decode error ends the stream. Earlier slices are counted; the failed slice's output was
    // not reported, so charge its worst case (the PDF library may have decoded it before failing).
    produced += WORST_CASE_SLICE_OUTPUT;
  }
  return produced;
}

/**
 * Rejects PDFs whose compressed data would expand beyond a fixed budget ("decompression bombs"),
 * or that use expanding filters ordinary CVs never use. This check never holds more than one
 * slice of output at a time.
 */
export function assertPdfInflationWithinBudget(bytes: Uint8Array, budget = MAX_PDF_INFLATED_BYTES): void {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (REFUSED_FILTERS.test(unescapeNames(buffer.toString("latin1")))) throw new CvReadError("too-large");

  let remaining = budget;
  let from = 0;
  for (;;) {
    const keyword = buffer.indexOf(STREAM, from);
    if (keyword < 0) return;
    from = keyword + STREAM.length;
    // The "stream" inside an "endstream" keyword starts nothing.
    if (keyword >= 3 && buffer.toString("latin1", keyword - 3, keyword) === "end") continue;
    // Allow the usual end of line (and a little stray whitespace) before the data.
    let dataStart = -1;
    for (let skip = 0; skip <= MAX_EOL_SKIP; skip += 1) {
      if (isZlibHeader(buffer, from + skip)) {
        dataStart = from + skip;
        break;
      }
      if (![0x0d, 0x0a, 0x20, 0x09, 0x0c, 0x00].includes(buffer[from + skip])) break;
    }
    if (dataStart < 0) continue; // Not zlib data, so the PDF library will not Flate-decode it.
    remaining -= countInflated(buffer, dataStart + 2, remaining);
    if (remaining < 0) throw new CvReadError("too-large");
  }
}
