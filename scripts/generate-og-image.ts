/**
 * Generates the static Open Graph card used by every page that doesn't have
 * its own image (public/og-default.jpg, 1200x630).
 *
 * Run with:  npm run og-image
 *
 * The card is authored as SVG — which is also written to disk as
 * og-default.svg so the design stays editable — and rasterized with sharp.
 * SVG is kept out of the actual og:image tag on purpose: Facebook, Telegram
 * and X all refuse to render it.
 */

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

const WIDTH = 1200;
const HEIGHT = 630;

/* Palette lifted from the app's dark theme. */
const BASE = "#0B1120";
const CARD = "#1E293B";
const PRIMARY = "#3B82F6";
const INK = "#FFFFFF";
const INK_MUTED = "#94A3B8";

/**
 * Inter is loaded from Google Fonts in the browser but is not necessarily
 * installed on the machine running this script, so the stack falls through to
 * faces that ship with Windows/macOS/Linux. The card is text-light enough that
 * the fallback still looks right.
 */
const FONT_STACK = "Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

function buildSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BASE}" />
      <stop offset="100%" stop-color="${CARD}" />
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${PRIMARY}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="${PRIMARY}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />
  <circle cx="980" cy="140" r="380" fill="url(#glow)" />

  <g font-family="${FONT_STACK}">
    <text x="100" y="292" fill="${INK}" font-size="92" font-weight="800" letter-spacing="-2">My Andijan</text>
    <rect x="100" y="330" width="132" height="8" rx="4" fill="${PRIMARY}" />
    <text x="100" y="404" fill="${INK_MUTED}" font-size="34" font-weight="500">Andijon viloyatidagi bizneslar</text>
    <text x="100" y="556" fill="${INK_MUTED}" font-size="26" font-weight="500" opacity="0.75">myandijan.uz</text>
  </g>
</svg>
`;
}

async function main(): Promise<void> {
  const svg = buildSvg();

  const svgPath = join(OUT_DIR, "og-default.svg");
  await writeFile(svgPath, svg, "utf8");
  console.log(`  ✓ og-default.svg  (editable source)`);

  const jpgPath = join(OUT_DIR, "og-default.jpg");
  const output = await sharp(Buffer.from(svg)).jpeg({ quality: 90, chromaSubsampling: "4:4:4" }).toFile(jpgPath);

  console.log(`  ✓ og-default.jpg  ${output.width}x${output.height}, ${(output.size / 1024).toFixed(1)} KB`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
