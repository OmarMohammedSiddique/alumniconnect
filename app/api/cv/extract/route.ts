import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CV_MAX_BYTES, detectCvKind, extractCvSuggestions } from "@/lib/cv-extract";
import { CvReadError, readCvText } from "@/lib/cv-file";

// Reads profile suggestions from an uploaded CV (#108). The file is processed
// in memory on this server, never stored and never sent to another service.
// Suggestions are returned to the member to review; nothing is saved here.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const recent = new Map<string, number[]>();

function allow(userId: string): boolean {
  const now = Date.now();
  const hits = (recent.get(userId) ?? []).filter((time) => now - time < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return false;
  hits.push(now);
  recent.set(userId, hits);
  return true;
}

const NO_STORE = { "Cache-Control": "private, no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: NO_STORE });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Sign in to read a CV.", 401);
  if (!allow(user.id)) return fail("Too many CV uploads. Wait a minute and try again.", 429);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > CV_MAX_BYTES + 64 * 1024) return fail("Choose a CV smaller than 5 MB.", 413);

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("cv");
  } catch {
    return fail("Choose a PDF or Word (.docx) file.", 400);
  }
  if (!(file instanceof File) || file.size === 0) return fail("Choose a PDF or Word (.docx) file.", 400);
  if (file.size > CV_MAX_BYTES) return fail("Choose a CV smaller than 5 MB.", 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectCvKind(bytes, file.name);
  if (!kind) return fail("Only PDF and Word (.docx) files can be read. Older .doc files need saving as .docx first.", 415);

  let text: string;
  try {
    text = await readCvText(bytes, kind);
  } catch (error) {
    if (error instanceof CvReadError && error.message === "too-many-pages") {
      return fail("This file has more than 10 pages. Upload a CV of 10 pages or fewer.", 422);
    }
    return fail("This file could not be read. Try saving it again as a PDF or .docx.", 422);
  }
  if (text.replace(/\s/g, "").length < 40) {
    return fail("No readable text was found. A scanned CV saved as an image cannot be read; try a text-based PDF or .docx.", 422);
  }

  return NextResponse.json({ suggestions: extractCvSuggestions(text) }, { headers: NO_STORE });
}
