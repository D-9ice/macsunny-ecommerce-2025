// lib/resistorImageEngine.ts
import sharp from "sharp";

type HSV = { h: number; s: number; v: number };

interface CanonicalColor {
  name: string;
  hsv: HSV;
}

// Your canonical colour references (your idea, implemented)
const CANONICAL_COLORS: CanonicalColor[] = [
  { name: "black",  hsv: { h: 0,   s: 0.0, v: 0.05 } },
  { name: "brown",  hsv: { h: 25,  s: 0.7, v: 0.25 } },
  { name: "red",    hsv: { h: 0,   s: 0.9, v: 0.7 } },
  { name: "orange", hsv: { h: 30,  s: 0.9, v: 0.9 } },
  { name: "yellow", hsv: { h: 55,  s: 0.9, v: 0.9 } },
  { name: "green",  hsv: { h: 120, s: 0.9, v: 0.7 } },
  { name: "blue",   hsv: { h: 210, s: 0.9, v: 0.7 } },
  { name: "violet", hsv: { h: 275, s: 0.7, v: 0.6 } },
  { name: "grey",   hsv: { h: 0,   s: 0.0, v: 0.6 } },
  { name: "white",  hsv: { h: 0,   s: 0.0, v: 0.95 } },
  { name: "gold",   hsv: { h: 45,  s: 0.7, v: 0.8 } },
  { name: "silver", hsv: { h: 0,   s: 0.0, v: 0.8 } },
];

// ---- base64 / data URL -> Buffer ----

function dataUrlToBuffer(image: string): Buffer {
  const commaIndex = image.indexOf(",");
  const base64 = commaIndex >= 0 ? image.slice(commaIndex + 1) : image;
  return Buffer.from(base64, "base64");
}

// ---- RGB -> HSV ----

function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d === 0) {
    h = 0;
  } else if (max === r) {
    h = ((g - b) / d) % 6;
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  h *= 60;
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : d / max;
  const v = max;

  return { h, s, v };
}

// ---- HSV distance + classification ----

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function hsvDistance(a: HSV, b: HSV): number {
  const dh = hueDistance(a.h, b.h) / 180; // 0..1
  const ds = Math.abs(a.s - b.s);
  const dv = Math.abs(a.v - b.v);
  return Math.sqrt(2 * dh * dh + ds * ds + dv * dv);
}

function classifyColorFromHSV(hsv: HSV): string {
  let bestName = "unknown";
  let bestDist = Number.POSITIVE_INFINITY;

  for (const c of CANONICAL_COLORS) {
    const d = hsvDistance(hsv, c.hsv);
    if (d < bestDist) {
      bestDist = d;
      bestName = c.name;
    }
  }

  return bestName;
}

// ---- Main: detect colour bands from image ----

/**
 * Detect colour bands on an axial resistor from a base64 image.
 * Returns an ordered array of canonical colour names, e.g.:
 * ["brown","black","red","gold"]
 */
export async function detectResistorBandsFromImage(
  base64Image: string
): Promise<string[]> {
  const buffer = dataUrlToBuffer(base64Image);

  // Preprocess: rotate, resize, normalize
  const { data, info } = await sharp(buffer)
    .rotate() // obey EXIF orientation
    .resize({ width: 320 }) // fixed width for predictable sampling
    .normalize() // normalize contrast/brightness
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const scanLines = 9; // sample multiple horizontal lines
  const classifiedPerColumn: string[][] = Array.from({ length: width }, () => []);

  // Sample several rows between 30% and 70% of height
  for (let i = 0; i < scanLines; i++) {
    const y = Math.round(height * (0.3 + (0.4 * i) / (scanLines - 1)));
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const r = data[idx]!;
      const g = data[idx + 1]!;
      const b = data[idx + 2]!;
      const hsv = rgbToHsv(r, g, b);
      const name = classifyColorFromHSV(hsv);
      classifiedPerColumn[x].push(name);
    }
  }

  // Collapse multi-line classifications per column to a single colour
  const classified: string[] = classifiedPerColumn.map((col) => {
    const freq: Record<string, number> = {};
    for (const c of col) {
      if (!c || c === "unknown") continue;
      freq[c] = (freq[c] || 0) + 1;
    }
    let best = "unknown";
    let bestCount = 0;
    for (const [c, count] of Object.entries(freq)) {
      if (count > bestCount) {
        best = c;
        bestCount = count;
      }
    }
    return best;
  });

  // Find dominant body colour (longest run that is not gold/silver)
  const freq: Record<string, number> = {};
  for (const c of classified) {
    if (!c || c === "unknown") continue;
    freq[c] = (freq[c] || 0) + 1;
  }

  const sortedColors = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  let bodyColor = "unknown";
  for (const [name] of sortedColors) {
    if (name === "gold" || name === "silver") continue;
    bodyColor = name;
    break;
  }

  type Segment = { color: string; start: number; end: number };
  const segments: Segment[] = [];

  const isBodyLike = (c: string) =>
    !c || c === "unknown" || c === bodyColor;

  let currentColor = classified[0] || "unknown";
  let startX = 0;

  for (let x = 1; x < width; x++) {
    const c = classified[x] || "unknown";
    const prev = currentColor;

    const prevBody = isBodyLike(prev);
    const currBody = isBodyLike(c);

    if (prevBody && currBody) {
      currentColor = c;
      continue;
    }

    if (!prevBody && !currBody && c === prev) {
      currentColor = c;
      continue;
    }

    segments.push({ color: prev, start: startX, end: x - 1 });
    currentColor = c;
    startX = x;
  }
  segments.push({ color: currentColor, start: startX, end: width - 1 });

  const minBandWidth = Math.max(3, Math.round(width * 0.04));
  const bandSegments = segments.filter((seg) => {
    const segWidth = seg.end - seg.start + 1;
    if (segWidth < minBandWidth) return false;
    if (isBodyLike(seg.color)) return false;
    return true;
  });

  let colorsInOrder = bandSegments.map((s) => s.color);

  // Fix orientation: tolerance band (gold/silver) should be at the END
  if (colorsInOrder.length >= 4) {
    const first = colorsInOrder[0];
    const last = colorsInOrder[colorsInOrder.length - 1];
    const isTol = (c: string) => c === "gold" || c === "silver";
    if (isTol(first) && !isTol(last)) {
      colorsInOrder = colorsInOrder.reverse();
    }
  }

  return colorsInOrder;
}

export default detectResistorBandsFromImage;
