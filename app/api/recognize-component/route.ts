export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import type { IdentifiedComponent } from "../identify-component/route";

/**
 * === COLOUR REFERENCE ENGINE ===
 * Canonical resistor band colours + HSV distance classifier +
 * band segmentation from an axial resistor image.
 */

type HSV = { h: number; s: number; v: number };

interface CanonicalColor {
  name: string;
  hsv: HSV;
}

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
  // metallics approximated in HSV
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

// ---- HSV distance ----

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function hsvDistance(a: HSV, b: HSV): number {
  const dh = hueDistance(a.h, b.h) / 180; // 0..1
  const ds = Math.abs(a.s - b.s);
  const dv = Math.abs(a.v - b.v);
  // weight hue more strongly
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

/**
 * Detect colour bands on an axial resistor from a base64 image.
 * Returns an ordered array of canonical colour names, e.g.:
 * ["brown","black","red","gold"]
 */
async function detectResistorBandsFromImage(
  base64Image: string
): Promise<string[]> {
  const buffer = dataUrlToBuffer(base64Image);

  const { data, info } = await sharp(buffer)
    .rotate() // obey EXIF orientation
    .resize({ width: 320 }) // good tradeoff between speed & accuracy
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const rowY = Math.floor(height / 2);
  const halfWindow = Math.max(1, Math.floor(height * 0.05));

  const classified: string[] = new Array(width);

  for (let x = 0; x < width; x++) {
    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    const yStart = Math.max(0, rowY - halfWindow);
    const yEnd = Math.min(height - 1, rowY + halfWindow);

    for (let y = yStart; y <= yEnd; y++) {
      const idx = (y * width + x) * channels;
      const r = data[idx]!;
      const g = data[idx + 1]!;
      const b = data[idx + 2]!;
      rSum += r;
      gSum += g;
      bSum += b;
      count++;
    }

    if (count === 0) {
      classified[x] = "unknown";
      continue;
    }

    const r = rSum / count;
    const g = gSum / count;
    const b = bSum / count;
    const hsv = rgbToHsv(r, g, b);
    classified[x] = classifyColorFromHSV(hsv);
  }

  // Find dominant "body" colour (beige / grey) to separate from bands
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

  const colorsInOrder = bandSegments.map((s) => s.color);

  if (colorsInOrder.length >= 4) {
    const first = colorsInOrder[0];
    const last = colorsInOrder[colorsInOrder.length - 1];
    const isTol = (c: string) => c === "gold" || c === "silver";

    if (isTol(first) && !isTol(last)) {
      colorsInOrder.reverse();
    }
  }

  return colorsInOrder;
}

/**
 * === DETERMINISTIC BAND -> VALUE DECODER ===
 */

function normColorName(c: string): string {
  const x = c.toLowerCase().trim();
  if (x === "gray") return "grey";
  return x;
}

const DIGIT_MAP: Record<string, number> = {
  black: 0,
  brown: 1,
  red: 2,
  orange: 3,
  yellow: 4,
  green: 5,
  blue: 6,
  violet: 7,
  grey: 8,
  white: 9,
};

const MULTIPLIER_MAP: Record<string, number> = {
  black: 1,
  brown: 10,
  red: 100,
  orange: 1_000,
  yellow: 10_000,
  green: 100_000,
  blue: 1_000_000,
  violet: 10_000_000,
  grey: 100_000_000,
  white: 1_000_000_000,
  gold: 0.1,
  silver: 0.01,
};

const TOLERANCE_MAP: Record<string, number> = {
  brown: 1,
  red: 2,
  green: 0.5,
  blue: 0.25,
  violet: 0.1,
  grey: 0.05,
  gold: 5,
  silver: 10,
};

type DecodeResult = { ohms: number | null; tolerance: number | null; valid: boolean };

function decodeSequence(seq: string[], bandCount: number | null): DecodeResult {
  const b = seq.map(normColorName);
  const n = b.length;
  if (n < 4) return { ohms: null, tolerance: null, valid: false };

  const count = bandCount ?? n;

  const tolColor = b[n - 1];
  const tol =
    TOLERANCE_MAP[tolColor] !== undefined ? TOLERANCE_MAP[tolColor] : null;

  let digits: number[] = [];
  let multColor: string;

  if (count === 4 || n === 4) {
    digits = [DIGIT_MAP[b[0]], DIGIT_MAP[b[1]]];
    multColor = b[2];
  } else if (count === 5 || count === 6 || n >= 5) {
    digits = [DIGIT_MAP[b[0]], DIGIT_MAP[b[1]], DIGIT_MAP[b[2]]];
    multColor = b[3];
  } else {
    digits = [DIGIT_MAP[b[0]], DIGIT_MAP[b[1]]];
    multColor = b[2];
  }

  if (digits.some((d) => d === undefined || Number.isNaN(d))) {
    return { ohms: null, tolerance: null, valid: false };
  }

  const mult = MULTIPLIER_MAP[multColor];
  if (mult === undefined) {
    return { ohms: null, tolerance: null, valid: false };
  }

  const base = digits.reduce((acc, d) => acc * 10 + d, 0);
  const ohms = base * mult;

  return { ohms, tolerance: tol, valid: true };
}

function decodeResistorFromBands(
  bands: string[] | null | undefined,
  bandCount: number | null
): { ohms: number | null; tolerance: number | null } {
  if (!bands || bands.length < 4) {
    return { ohms: null, tolerance: null };
  }

  const seqA = bands.map(normColorName);
  const seqB = [...seqA].reverse();

  const candA = decodeSequence(seqA, bandCount);
  const candB = decodeSequence(seqB, bandCount);

  const scored = [candA, candB].filter((c) => c.valid && c.ohms !== null);
  if (scored.length === 0) return { ohms: null, tolerance: null };

  const withTol = scored.filter((c) => c.tolerance !== null);
  const best = withTol[0] ?? scored[0];

  return { ohms: best.ohms, tolerance: best.tolerance };
}

/**
 * Component Recognition API - Wrapper for GPT-5.1 Premium Component Identifier
 * with deterministic band colour detection + decoding.
 */

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { success: false, message: "Image is required" },
        { status: 400 }
      );
    }

    // Same-origin call to /api/identify-component
    const identifyUrl = new URL(
      "/api/identify-component",
      request.nextUrl
    ).toString();

    const response = await fetch(identifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "Component identification failed");
    }

    const comp: IdentifiedComponent = data.component;
    console.log("🎯 GPT-5.1 Raw Component:", comp);

    // ---- Step 1: our colour-reference engine overrides bands ----
    if (comp.resistor?.is_resistor && comp.resistor.is_color_band_resistor) {
      try {
        const bands = await detectResistorBandsFromImage(image);
        if (bands && bands.length >= 4) {
          comp.resistor.bands = bands;
          comp.resistor.band_count = bands.length;
          console.log("🎨 Deterministic bands:", bands);
        }
      } catch (e) {
        console.error("Band detection failed, using GPT bands:", e);
      }

      const { ohms, tolerance } = decodeResistorFromBands(
        comp.resistor.bands,
        comp.resistor.band_count
      );

      if (ohms != null) {
        comp.resistor.value_ohms = ohms;
        comp.electrical.nominal_value = ohms;
      }
      if (tolerance != null) {
        comp.resistor.tolerance_percent =
          comp.resistor.tolerance_percent ?? tolerance;
        comp.electrical.tolerance_percent =
          comp.electrical.tolerance_percent ?? tolerance;
      }
    }

    // ---- Step 2: map to your simple frontend format ----
    let name: string;
    let category: string;
    let sku: string;
    let value: string;
    let specifications: string;
    let estimatedPrice: number;

    if (comp.resistor.is_resistor && comp.resistor.is_color_band_resistor) {
      const ohms = comp.resistor.value_ohms || 0;
      const tol = comp.resistor.tolerance_percent || 5;

      const valStr =
        ohms >= 1_000_000
          ? `${ohms / 1_000_000}MΩ`
          : ohms >= 1_000
          ? `${ohms / 1_000}kΩ`
          : `${ohms}Ω`;

      const partVal =
        ohms >= 1_000_000
          ? `${ohms / 1_000_000}M`
          : ohms >= 1_000
          ? `${ohms / 1_000}K`
          : `${ohms}R`;

      name = `${valStr} ±${tol}% Carbon Film Resistor ${
        comp.resistor.power_rating_watts || 0.25
      }W`;
      sku = `RES-R-${partVal}-${tol}P`;
      category = "Resistors";
      value = valStr;
      specifications = `${comp.resistor.bands.join(
        "-"
      )} = ${valStr} ±${tol}%`;
      estimatedPrice = 0.5;
    } else if (comp.resistor.is_resistor && !comp.resistor.is_color_band_resistor) {
      const ohms =
        comp.resistor.value_ohms || comp.electrical.nominal_value || 0;

      const valStr =
        ohms >= 1_000_000
          ? `${ohms / 1_000_000}MΩ`
          : ohms >= 1_000
          ? `${ohms / 1_000}kΩ`
          : `${ohms}Ω`;

      const isPowerOrCement =
        (comp.mechanical.package &&
          comp.mechanical.package.toUpperCase().includes("CEMENT")) ||
        comp.form_factor === "through_hole";

      if (isPowerOrCement) {
        name = `${valStr} ${
          comp.resistor.power_rating_watts || 5
        }W Cement/Power Resistor`;
        sku = `RES-PWR-${ohms}R-${comp.resistor.power_rating_watts || 5}W`;
        category = "Resistors";
        value = valStr;
        specifications = `Printed: ${
          comp.markings.primary_text || "N/A"
        }, Package: ${comp.mechanical.package || "CEMENT"}, Power: ${
          comp.resistor.power_rating_watts || "N/A"
        }W`;
        estimatedPrice = 0.3;
      } else {
        name = `${valStr} SMD Resistor ${
          comp.mechanical.package || "Unknown"
        }`;
        sku = `RES-SMD-${comp.markings.smd_code || "UNKNOWN"}`;
        category = "Resistors";
        value = valStr;
        specifications = `SMD Code: ${
          comp.markings.smd_code || "N/A"
        }, Package: ${comp.mechanical.package || "Unknown"}`;
        estimatedPrice = 0.3;
      }
    } else if (comp.component_type === "capacitor") {
      const capVal = comp.electrical.nominal_value || 0;
      const unit = comp.electrical.value_unit || "µF";
      const voltage = comp.electrical.voltage_rating_volts || "";

      name = `${capVal}${unit} ${voltage}V Capacitor`;
      sku = `CAP-${capVal}${unit}-${voltage}V`;
      category = "Capacitors";
      value = `${capVal}${unit}`;
      specifications = `${capVal}${unit} ${voltage}V, Package: ${
        comp.mechanical.package || "Unknown"
      }`;
      estimatedPrice = 1.2;
    } else if (comp.component_type === "ic") {
      const partNum = comp.markings.primary_text || "Unknown IC";
      name = `${partNum} Integrated Circuit`;
      sku = `IC-${partNum}`;
      category = "ICs";
      value = partNum;
      specifications = `Package: ${
        comp.mechanical.package || "Unknown"
      }, Pins: ${comp.mechanical.pins || "N/A"}`;
      estimatedPrice = 5.0;
    } else {
      name = comp.description || "Component – please review";
      sku = `${comp.component_type.toUpperCase()}-${Date.now()
        .toString()
        .slice(-6)}`;
      category = "Other";
      value = comp.markings.primary_text || "N/A";
      specifications = comp.meta.notes || "";
      estimatedPrice = 2.0;
    }

    return NextResponse.json({
      success: true,
      name,
      category,
      sku,
      estimatedPrice,
      confidence: Math.round((comp.meta.confidence || 0) * 100),
      specifications,
      provider: "GPT-5.1 ComponentID-5 + deterministic colour engine",
      _full_component: comp,
    });
  } catch (error: any) {
    console.error("Component recognition error:", error);
    return NextResponse.json(
      {
        success: false,
        message: `Component recognition failed: ${
          error?.message || "Unknown error"
        }`,
      },
      { status: 500 }
    );
  }
}
