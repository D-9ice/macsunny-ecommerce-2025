// lib/resistorDecoder.ts

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

type DecodeResult = {
  ohms: number | null;
  tolerance: number | null;
  valid: boolean;
};

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
    // 4-band: 2 digits, multiplier, tolerance
    digits = [DIGIT_MAP[b[0]], DIGIT_MAP[b[1]]];
    multColor = b[2];
  } else if (count === 5 || count === 6 || n >= 5) {
    // 5/6 band: 3 digits, multiplier, tolerance, (ignore tempco)
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

/**
 * Try decoding bands in both directions and choose the best candidate.
 */
export function decodeResistorFromBands(
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

export function formatOhms(ohms: number): { text: string; partVal: string } {
  if (ohms >= 1_000_000) {
    const v = ohms / 1_000_000;
    return { text: `${v}MΩ`, partVal: `${v}M` };
  }
  if (ohms >= 1_000) {
    const v = ohms / 1_000;
    return { text: `${v}kΩ`, partVal: `${v}K` };
  }
  return { text: `${ohms}Ω`, partVal: `${ohms}R` };
}
