import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CV_MAX_BYTES, detectCvKind, extractCvSuggestions } from "@/lib/cv-extract";
import { CvReadError, readCvText } from "@/lib/cv-file";
import { EmbedGuard } from "@/lib/embedding/embed-guard";

// Reads profile suggestions from an uploaded CV (#108). The file is processed
// in memory on this server, never stored and never sent to another service.
// Suggestions are returned to the member to review; nothing is saved here.

// A hard ceiling on how long one upload may run.
export const maxDuration = 20;

const cvGuard = new EmbedGuard({ maxRequests: 6, windowMs: 60_000 });
const SIZE_MESSAGE = "Choose a CV smaller than 4 MB.";

const NO_STORE = { "Cache-Control": "private, no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: NO_STORE });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail("Sign in to read a CV.", 401);
  const limit = cvGuard.checkRateLimit(user.id);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many CV uploads. Wait a minute and try again." },
      { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfterSeconds ?? 60) } });
  }

  // The body is only parsed when its declared size is known and within the limit.
  const declaredHeader = request.headers.get("content-length");
  if (!declaredHeader) return fail("The upload size is missing. Try again.", 411);
  const declared = Number(declaredHeader);
  if (!Number.isFinite(declared) || declared > CV_MAX_BYTES + 64 * 1024) return fail(SIZE_MESSAGE, 413);

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("cv");
  } catch {
    return fail("Choose a PDF or Word (.docx) file.", 400);
  }
  if (!(file instanceof File) || file.size === 0) return fail("Choose a PDF or Word (.docx) file.", 400);
  if (file.size > CV_MAX_BYTES) return fail(SIZE_MESSAGE, 413);

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
    if (error instanceof CvReadError && error.message === "too-large") {
      return fail("This file is too complex to read. Try saving it again as a simpler PDF or .docx.", 422);
    }
    return fail("This file could not be read. Try saving it again as a PDF or .docx.", 422);
  }
  if (text.replace(/\s/g, "").length < 40) {
    return fail("No readable text was found. A scanned CV saved as an image cannot be read; try a text-based PDF or .docx.", 422);
  }

  return NextResponse.json({ suggestions: extractCvSuggestions(text) }, { headers: NO_STORE });
}
