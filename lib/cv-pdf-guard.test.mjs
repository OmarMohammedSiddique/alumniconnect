import assert from "node:assert/strict";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { assertPdfInflationWithinBudget, CvReadError } from "./cv-pdf-guard.ts";

function pdfWithStreams(...payloads) {
  const parts = [Buffer.from("%PDF-1.4\n")];
  payloads.forEach((payload, index) => {
    parts.push(Buffer.from(`${index + 1} 0 obj\n<< /Filter /FlateDecode >>\nstream\n`), payload, Buffer.from("\nendstream\nendobj\n"));
  });
  return new Uint8Array(Buffer.concat(parts));
}

test("normal compressed streams pass the budget", () => {
  const pdf = pdfWithStreams(deflateSync(Buffer.from("BT (Hello) Tj ET")), deflateSync(Buffer.alloc(1000, 32)));
  assert.doesNotThrow(() => assertPdfInflationWithinBudget(pdf, 1_000_000));
});

test("a small file that inflates past the budget is refused", () => {
  const bomb = deflateSync(Buffer.alloc(5_000_000, 32)); // about 5 KB compressed
  assert.ok(bomb.length < 10_000);
  assert.throws(() => assertPdfInflationWithinBudget(pdfWithStreams(bomb), 1_000_000), CvReadError);
});

test("the budget is shared across streams", () => {
  const chunk = deflateSync(Buffer.alloc(600_000, 32));
  assert.throws(() => assertPdfInflationWithinBudget(pdfWithStreams(chunk, chunk), 1_000_000), CvReadError);
});

test("streams that are not compressed with Flate are skipped", () => {
  assert.doesNotThrow(() => assertPdfInflationWithinBudget(pdfWithStreams(Buffer.from("raw image bytes")), 10));
});
