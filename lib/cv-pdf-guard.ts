// Decompression budget for uploaded PDFs (#108). No server-only imports, so it is unit tested.
import { constants, inflateRawSync } from "node:zlib";

/** Total decompressed size allowed across a PDF's streams before the PDF library sees it. */
export const MAX_PDF_INFLATED_BYTES = 32 * 1024 * 1024;

export class CvReadError extends Error {}

const STREAM = Buffer.from("stream");
const END_STREAM = Buffer.from("endstream");
const OBJ = Buffer.from(" obj");
const DICTIONARY_LOOKBACK = 4096;
// Filters that expand data and that ordinary CV exports never use. Abbreviations are the inline forms.
const REFUSED_FILTERS = /\/(ASCII85Decode|ASCIIHexDecode|LZWDecode|RunLengthDecode|A85|AHx|LZW|RL)\b/;
const FLATE = /\/(FlateDecode|Fl)\b/;

function dictionaryBefore(buffer: Buffer, streamStart: number): string {
  const from = Math.max(0, streamStart - DICTIONARY_LOOKBACK);
  const objStart = buffer.lastIndexOf(OBJ, streamStart);
  return buffer.subarray(objStart >= from ? objStart : from, streamStart).toString("latin1");
}

/** Bytes inflated from one Flate stream, counted even with a bad checksum, truncation or trailing bytes. */
function inflatedSize(data: Buffer, limit: number): number {
  // Skip a valid zlib header if present; raw inflate then ignores the adler32 trailer and anything after the final block.
  const hasHeader = data.length >= 2 && (data[0] & 0x0f) === 8 && ((data[0] << 8) | data[1]) % 31 === 0;
  return inflateRawSync(hasHeader ? data.subarray(2) : data, {
    finishFlush: constants.Z_SYNC_FLUSH,
    maxOutputLength: limit,
  }).length;
}

/**
 * Rejects PDFs whose compressed streams would expand beyond a fixed budget
 * ("decompression bombs"), or that use expanding filters ordinary CVs never
 * use. Every Flate stream is inflated with a hard output cap, so this check
 * itself can never use more than the budget.
 */
export function assertPdfInflationWithinBudget(bytes: Uint8Array, budget = MAX_PDF_INFLATED_BYTES): void {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let remaining = budget;
  let from = 0;
  for (;;) {
    const start = buffer.indexOf(STREAM, from);
    if (start < 0) return;
    // Ignore the "stream" inside an "endstream" keyword.
    if (start >= 3 && buffer.toString("latin1", start - 3, start) === "end") {
      from = start + STREAM.length;
      continue;
    }
    let dataStart = start + STREAM.length;
    if (buffer[dataStart] === 0x0d) dataStart += 1;
    if (buffer[dataStart] === 0x0a) dataStart += 1;

    const dictionary = dictionaryBefore(buffer, start);
    const filter = dictionary.match(/\/Filter\s*(\[[^\]]*\]|\/\w+)/)?.[1] ?? "";
    // A direct /Length tells us where the data really ends, so "endstream" bytes inside it cannot cut it short.
    const length = dictionary.match(/\/Length\s+(\d+)\b(?!\s+\d+\s+R)/)?.[1];
    const declaredEnd = length ? dataStart + Number(length) : -1;
    const end = declaredEnd > dataStart && declaredEnd <= buffer.length ? declaredEnd : buffer.indexOf(END_STREAM, dataStart);
    if (end < 0) return;
    from = end;

    if (REFUSED_FILTERS.test(filter)) throw new CvReadError("too-large");
    if (filter.startsWith("[") && !/^\[\s*\/(FlateDecode|Fl)\s*\]$/.test(filter)) throw new CvReadError("too-large");
    if (!FLATE.test(filter)) continue; // Unfiltered data or images (DCT, JPX, CCITT) do not expand in text extraction.

    let size: number;
    try {
      size = inflatedSize(buffer.subarray(dataStart, end), remaining + 1);
    } catch {
      // Too large for the budget, or not decodable as declared: refuse rather than let the PDF library try.
      throw new CvReadError("too-large");
    }
    remaining -= size;
    if (remaining < 0) throw new CvReadError("too-large");
  }
}
