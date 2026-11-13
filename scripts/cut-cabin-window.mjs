// Builds the cabin intro layers from a lit and a dark cabin render of the same
// framing: cuts the sky out of both plates and crops the closed shade.
// Usage: node scripts/cut-cabin-window.mjs <lit> <dark> [suffix] [extendTop]
// Prints the window box as percentages for cabin-intro.module.css.
import sharp from "sharp";
// Optional fourth argument: rows of wall to add above the frame by mirroring
// the top edge, for screens taller than the render.
const [litSrc, darkSrc, suffix = "", extendTop = "0"] = process.argv.slice(2);
const out = "public/images/landing";
const prepare = src => sharp(src).removeAlpha()
  .extend({ top: Number(extendTop), extendWith: "mirror" }).png().toBuffer();
const lit = await prepare(litSrc), dark = await prepare(darkSrc);
const { data, info } = await sharp(lit).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
// Sky pixels: clearly blue, inside the central window region.
const mask = Buffer.alloc(W * H, 255);
let x0 = W, y0 = H, x1 = 0, y1 = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * W + x) * 3, r = data[i], g = data[i + 1], b = data[i + 2];
  if (x > W * 0.15 && x < W * 0.85 && y < H * 0.75 && b - r > 45 && b > g) {
    mask[y * W + x] = 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
}
// Tuned on a 1536px wide render; scale the feather and padding with size.
const k = W / 1536;
// Grow the hole slightly and soften its edge so no blue fringe survives.
const alpha = await sharp(mask, { raw: { width: W, height: H, channels: 1 } })
  .blur(2.2 * k).linear(2.4, -255 * 1.05).png().toBuffer();
const alphaRaw = await sharp(alpha).extractChannel(0).raw().toBuffer();
for (const [src, name] of [[lit, "cabin-lit"], [dark, "cabin-dark"]]) {
  const rgb = await sharp(src).removeAlpha().raw().toBuffer();
  const rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { rgba[i*4] = rgb[i*3]; rgba[i*4+1] = rgb[i*3+1]; rgba[i*4+2] = rgb[i*3+2]; rgba[i*4+3] = alphaRaw[i]; }
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .webp({ quality: 88, alphaQuality: 100 }).toFile(`${out}/${name}${suffix}.webp`);
}
const pad = Math.round(6 * k);
const box = { left: x0 - pad, top: y0 - pad, width: x1 - x0 + 1 + pad * 2, height: y1 - y0 + 1 + pad * 2 };
await sharp(dark).extract(box).webp({ quality: 90 }).toFile(`${out}/cabin-shade${suffix}.webp`);
const pct = (v, t) => (v / t * 100).toFixed(3) + "%";
console.log(JSON.stringify({ W, H, box, css: { left: pct(box.left, W), top: pct(box.top, H), width: pct(box.width, W), height: pct(box.height, H) } }));
