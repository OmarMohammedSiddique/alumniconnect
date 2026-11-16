import "server-only";
import { strFromU8, unzipSync } from "fflate";
import { extractText, getDocumentProxy } from "unpdf";
import { CV_MAX_BYTES, type CvFileKind, docxXmlToText } from "@/lib/cv-extract";

const MAX_DOCX_XML_BYTES = 10 * 1024 * 1024;
const MAX_PDF_PAGES = 10;

export class CvReadError extends Error {}

/**
 * Reads plain text from a CV in memory. Nothing is written to disk or stored;
 * the bytes are discarded when the request ends.
 */
export async function readCvText(bytes: Uint8Array, kind: CvFileKind): Promise<string> {
  if (bytes.byteLength > CV_MAX_BYTES) throw new CvReadError("too-large");
  if (kind === "pdf") {
    const pdf = await getDocumentProxy(bytes);
    try {
      if (pdf.numPages > MAX_PDF_PAGES) throw new CvReadError("too-many-pages");
      const { text } = await extractText(pdf, { mergePages: true });
      return text;
    } finally {
      await pdf.cleanup();
    }
  }
  // Only the main document part is unpacked, and only when its declared size
  // is reasonable, so a compressed "zip bomb" cannot exhaust memory.
  const files = unzipSync(bytes, {
    filter: (file) => file.name === "word/document.xml" && file.originalSize <= MAX_DOCX_XML_BYTES,
  });
  const xml = files["word/document.xml"];
  if (!xml) throw new CvReadError("not-a-cv");
  return docxXmlToText(strFromU8(xml));
}
