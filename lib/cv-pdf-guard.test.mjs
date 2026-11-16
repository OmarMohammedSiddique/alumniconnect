import assert from "node:assert/strict";
import test from "node:test";
import { deflateRawSync, deflateSync } from "node:zlib";
import { assertPdfInflationWithinBudget, CvReadError } from "./cv-pdf-guard.ts";

function pdf(...streams) {
  const parts = [Buffer.from("%PDF-1.4\n")];
  streams.forEach(({ data, dictionary = "/Filter /FlateDecode" }, index) => {
    parts.push(Buffer.from(`${index + 1} 0 obj\n<< ${dictionary} >>\nstream\n`), data, Buffer.from("\nendstream\nendobj\n"));
  });
  return new Uint8Array(Buffer.concat(parts));
}
const flate = (data) => ({ data });
const BUDGET = 1_000_000;
const refuses = (bytes) => assert.throws(() => assertPdfInflationWithinBudget(bytes, BUDGET), CvReadError);

test("normal compressed streams pass the budget", () => {
  const bytes = pdf(flate(deflateSync(Buffer.from("BT (Hello) Tj ET"))), flate(deflateSync(Buffer.alloc(1000, 32))));
  assert.doesNotThrow(() => assertPdfInflationWithinBudget(bytes, BUDGET));
});

test("a small file that inflates past the budget is refused", () => {
  const bomb = deflateSync(Buffer.alloc(5_000_000, 32));
  assert.ok(bomb.length < 10_000);
  refuses(pdf(flate(bomb)));
});

test("the budget is shared across streams", () => {
  const chunk = deflateSync(Buffer.alloc(600_000, 32));
  refuses(pdf(flate(chunk), flate(chunk)));
});

test("streams with a corrupted checksum are still counted", () => {
  const chunk = Buffer.from(deflateSync(Buffer.alloc(600_000, 32)));
  chunk[chunk.length - 1] ^= 0xff; // break the adler32 trailer
  refuses(pdf(flate(chunk), flate(chunk)));
});

test("endstream bytes inside the data cannot cut a stream short when the length is declared", () => {
  // A stored (uncompressed) deflate block holding the text " endstream ", then a compressed bomb.
  const literal = Buffer.from(" endstream ");
  const stored = Buffer.concat([Buffer.from([0x00, literal.length, 0, ~literal.length & 0xff, 0xff]), literal]);
  const data = Buffer.concat([Buffer.from([0x78, 0x01]), stored, deflateRawSync(Buffer.alloc(5_000_000, 32))]);
  assert.ok(data.includes(Buffer.from("endstream")));
  refuses(pdf({ data, dictionary: `/Length ${data.length} /Filter /FlateDecode` }));
});

test("expanding filter chains are refused", () => {
  const data = Buffer.from("<~ascii85~>");
  refuses(pdf({ data, dictionary: "/Filter [/ASCII85Decode /FlateDecode]" }));
  refuses(pdf({ data, dictionary: "/Filter /LZWDecode" }));
  refuses(pdf({ data, dictionary: "/Filter /RunLengthDecode" }));
});

test("data without a zlib header is not decoded, whatever the dictionary says", () => {
  // The PDF library will not Flate-decode it either, so it cannot expand.
  assert.doesNotThrow(() => assertPdfInflationWithinBudget(pdf(flate(Buffer.from("definitely not deflate data"))), BUDGET));
});

test("image and unfiltered streams are skipped", () => {
  const bytes = pdf({ data: Buffer.from("jpeg bytes"), dictionary: "/Filter /DCTDecode" }, { data: Buffer.from("BT ET"), dictionary: "/Length 5" });
  assert.doesNotThrow(() => assertPdfInflationWithinBudget(bytes, 10));
});

test("an indirect length falls back to the endstream marker", () => {
  const data = deflateSync(Buffer.from("BT (Hi) Tj ET"));
  assert.doesNotThrow(() => assertPdfInflationWithinBudget(pdf({ data, dictionary: "/Length 12 0 R /Filter /FlateDecode" }), BUDGET));
});

// Bypasses found in review: each disguises the dictionary, so the guard must decide from the bytes.
const bomb = () => deflateSync(Buffer.alloc(5_000_000, 32));
for (const [name, dictionary] of [
  ["a wrong /Length", "/Length 10 /Filter /FlateDecode"],
  ["\" obj\" inside a string after the filter", "/Filter /FlateDecode /X ( obj)"],
  ["padding past any lookback", "/Filter /FlateDecode /Pad (" + "x".repeat(5000) + ")"],
  ["an indirect filter", "/Filter 6 0 R"],
  ["a comment inside the filter", "/Filter %c\n/FlateDecode"],
  ["an escaped filter name", "/Filter /#46lateDecode"],
  ["no filter at all", ""],
]) {
  test(`a bomb behind ${name} is refused`, () => refuses(pdf({ data: bomb(), dictionary })));
}

test("escaped expanding filter names are refused", () => {
  refuses(pdf({ data: Buffer.from("x"), dictionary: "/Filter /#4C#5A#57Decode" }));
  refuses(pdf({ data: Buffer.from("x"), dictionary: "/Filter /RL" }));
});

test("expanding filters hidden inside a compressed object stream are refused", () => {
  const objectStream = deflateSync(Buffer.from("6 0 << >> /ASCIIHexDecode "));
  refuses(pdf(flate(objectStream)));
});

test("a bomb that ends in a decode error is refused", () => {
  const broken = Buffer.concat([deflateRawSync(Buffer.alloc(5_000_000, 32), { finishFlush: 2 }), Buffer.from([0xff, 0xff, 0xff])]);
  refuses(pdf({ data: Buffer.concat([Buffer.from([0x78, 0x01]), broken]) }));
});

test("binary image data that is not zlib is not decoded", () => {
  const jpegish = Buffer.alloc(50_000, 0xab);
  assert.doesNotThrow(() => assertPdfInflationWithinBudget(pdf({ data: jpegish, dictionary: "/Filter /DCTDecode" }), 10));
});

test("many small bombs that each end in a decode error add up", () => {
  const small = Buffer.concat([Buffer.from([0x78, 0x01]), deflateRawSync(Buffer.alloc(400_000, 32), { finishFlush: 2 }), Buffer.from([0xff, 0xff])]);
  refuses(pdf(...Array.from({ length: 5 }, () => ({ data: small }))));
});

test("the CUPS sample CV and a normal Flate stream still pass", () => {
  assert.doesNotThrow(() => assertPdfInflationWithinBudget(pdf(flate(deflateSync(Buffer.from("BT (Amani) Tj ET"))))));
});

test("data after a junk line or extra spaces following the keyword is still counted", () => {
  for (const after of ["stream %junk after keyword\n", "stream      \n", "stream\r"]) {
    const parts = [Buffer.from("%PDF-1.4\n1 0 obj\n<< >>\n" + after), bomb(), Buffer.from("\nendstream\nendobj\n")];
    refuses(new Uint8Array(Buffer.concat(parts)));
  }
});

test("a zlib header with an unusual window size is still counted", () => {
  const data = Buffer.from(bomb());
  data[0] = 0x88; // CINFO 8, which the PDF library does not check
  data[1] = (31 - ((0x88 << 8) % 31)) % 31; // make FCHECK valid again, FDICT clear
  refuses(pdf({ data }));
});

test("thousands of tiny streams are checked quickly", () => {
  const tiny = Buffer.concat([Buffer.from("1 0 obj\n<< >>\nstream\n"), deflateSync(Buffer.from("BT ET")), Buffer.from("\nendstream\nendobj\n")]);
  const big = Buffer.concat([Buffer.from("%PDF-1.4\n"), ...Array.from({ length: 4_000_000 / tiny.length }, () => tiny)]);
  const started = performance.now();
  assert.doesNotThrow(() => assertPdfInflationWithinBudget(new Uint8Array(big)));
  assert.ok(performance.now() - started < 2000, `took ${Math.round(performance.now() - started)} ms`);
});

test("a large file with trailing uncompressed data is checked quickly", () => {
  const streams = Array.from({ length: 16 }, () => flate(deflateSync(Buffer.from("BT (Hi) Tj ET"))));
  const filler = { data: Buffer.alloc(3_900_000, 0x41), dictionary: "/Length 3900000" };
  const started = performance.now();
  assert.doesNotThrow(() => assertPdfInflationWithinBudget(pdf(...streams, filler)));
  assert.ok(performance.now() - started < 1000);
});

test("hundreds of thousands of keywords without a line break are checked quickly", () => {
  const big = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.from("stream ".repeat(300_000))]);
  const started = performance.now();
  assertPdfInflationWithinBudget(new Uint8Array(big));
  assert.ok(performance.now() - started < 1000, `took ${Math.round(performance.now() - started)} ms`);
});

test("many keywords leading to the same data are counted once", () => {
  // Empty stored blocks inflate to nothing, so only repeated work could make this slow.
  const emptyStored = Buffer.from([0x00, 0x00, 0x00, 0xff, 0xff]);
  const data = Buffer.concat([Buffer.from([0x78, 0x01]), Buffer.concat(Array.from({ length: 380_000 }, () => emptyStored)), Buffer.from([0x03, 0x00])]);
  const big = Buffer.concat([Buffer.from("%PDF-1.4\n1 0 obj\n<< >>\n" + "stream ".repeat(300_000) + "\n"), data]);
  const started = performance.now();
  assertPdfInflationWithinBudget(new Uint8Array(big));
  assert.ok(performance.now() - started < 1000, `took ${Math.round(performance.now() - started)} ms`);
});

test("keywords hidden on separate lines inside stored blocks are bounded by the input allowance", () => {
  const payload = Buffer.from("x\nstream\n");
  const block = Buffer.concat([Buffer.from([0x00, payload.length, 0x00, ~payload.length & 0xff, 0xff]), payload]);
  const data = Buffer.concat([Buffer.from([0x78, 0x01]), Buffer.concat(Array.from({ length: 200_000 }, () => block)), Buffer.from([0x03, 0x00])]);
  const big = Buffer.concat([Buffer.from("%PDF-1.4\n1 0 obj\n<< >>\nstream\n"), data]);
  const started = performance.now();
  try {
    assertPdfInflationWithinBudget(new Uint8Array(big));
  } catch (error) {
    assert.ok(error instanceof CvReadError);
  }
  assert.ok(performance.now() - started < 3000, `took ${Math.round(performance.now() - started)} ms`);
});
