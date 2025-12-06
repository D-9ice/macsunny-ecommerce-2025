export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---- Types for better DX ----
type ComponentType =
  | "resistor"
  | "capacitor"
  | "inductor"
  | "diode"
  | "transistor"
  | "ic"
  | "connector"
  | "switch"
  | "crystal_oscillator"
  | "fuse"
  | "led"
  | "other";

type FormFactor = "through_hole" | "smd" | "module" | "unknown";

interface ResistorInfo {
  is_resistor: boolean;
  is_color_band_resistor: boolean;
  band_count: number | null;
  bands: string[]; // e.g. ["brown","black","red","gold"]
  value_ohms: number | null;
  tolerance_percent: number | null;
  power_rating_watts: number | null;
}

interface MarkingsInfo {
  primary_text: string | null; // main part number or marking
  secondary_text: string | null;
  smd_code: string | null; // e.g. "472" or "4R7"
  manufacturer: string | null;
}

interface ElectricalInfo {
  nominal_value: number | null; // e.g. 4700
  value_unit: string | null; // "ohm","kohm","uf","pf","nh","mhz","a","v"
  tolerance_percent: number | null;
  voltage_rating_volts: number | null;
  current_rating_amps: number | null;
}

interface MechanicalInfo {
  package: string | null; // "0805","SOT-23","DIP-8","TO-220", etc.
  pins: number | null;
  orientation: string | null; // e.g. "horizontal", "vertical", "angled"
}

interface MetaInfo {
  confidence: number; // 0..1
  category: string | null; // higher-level bucket, e.g. "passive","active","mechanical"
  notes: string | null;
}

export interface IdentifiedComponent {
  component_type: ComponentType;
  form_factor: FormFactor;
  description: string;
  resistor: ResistorInfo;
  markings: MarkingsInfo;
  electrical: ElectricalInfo;
  mechanical: MechanicalInfo;
  meta: MetaInfo;
}

// ---- API Route ----
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const image: string | undefined = body?.image;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid 'image' field" },
        { status: 400 }
      );
    }

    // We pass the data URL directly to OpenAI (vision supports data URLs)
    const completion = await client.chat.completions.create({
      model: "gpt-5.1" as any, // gpt-5.1 may not be in SDK types yet
      temperature: 0,
      // NOTE: max_tokens removed because gpt-5.1 on this endpoint rejects it
      response_format: {
        type: "json_object",
      } as any,
      messages: [
        {
          role: "system",
          content: [
            "You are ComponentID-5, an expert in identifying electronic components from images.",
            "",
            "You MUST output ONLY a valid JSON object with this shape (no extra keys, no extra commentary):",
            "",
            "{",
            '  "component_type": "resistor|capacitor|inductor|diode|transistor|ic|connector|led|switch|fuse|crystal_oscillator|other",',
            '  "form_factor": "through_hole|smd|module|unknown",',
            '  "description": "short human description",',
            '  "resistor": {',
            '    "is_resistor": true|false,',
            '    "is_color_band_resistor": true|false,',
            '    "band_count": 4|5|6|null,',
            '    "bands": ["color1","color2",...],',
            '    "value_ohms": number|null,',
            '    "tolerance_percent": number|null,',
            '    "power_rating_watts": number|null',
            "  },",
            '  "markings": {',
            '    "primary_text": "string|null",',
            '    "secondary_text": "string|null",',
            '    "smd_code": "string|null",',
            '    "manufacturer": "string|null"',
            "  },",
            '  "electrical": {',
            '    "nominal_value": number|null,',
            '    "value_unit": "ohm|kohm|mohm|uf|nf|pf|mh|uh|nh|v|a|w|hz|khz|mhz|null",',
            '    "tolerance_percent": number|null,',
            '    "voltage_rating_volts": number|null,',
            '    "current_rating_amps": number|null',
            "  },",
            '  "mechanical": {',
            '    "package": "string|null",',
            '    "pins": number|null,',
            '    "orientation": "string|null"',
            "  },",
            '  "meta": {',
            '    "confidence": 0.0–1.0,',
            '    "category": "passive|active|interconnect|electromechanical|other|null",',
            '    "notes": "string|null"',
            "  }",
            "}",
            "",
            "CRITICAL BEHAVIOUR:",
            "- NEVER use the word 'unknown' inside any field. Use null instead if something is truly not visible.",
            "- If text or colour bands are reasonably clear, you MUST interpret them and provide a concrete value.",
            "- Only set a field to null when the information is genuinely hidden or unreadable in the image.",
            "",
            "RESISTORS (colour band):",
            "- If you see an axial resistor with coloured bands, set resistor.is_resistor = true and resistor.is_color_band_resistor = true.",
            "- Allowed band colours: black, brown, red, orange, yellow, green, blue, violet, grey, white, gold, silver.",
            "- First, carefully identify each band colour from one end. Spend time distinguishing:",
            "    • brown vs red vs orange,",
            "    • green vs blue vs violet vs grey,",
            "  especially under warm/indoor lighting.",
            "- band_count should be 4, 5, or 6 when visible.",
            "- bands must list the colours from the end you would read first, in order.",
            "- THEN compute value_ohms and tolerance_percent from the standard resistor colour code.",
            "",
            "COMMON EXAMPLES YOU SHOULD USE AS REFERENCE:",
            "- 10 Ω 5%: brown-black-black-gold.",
            "- 1 kΩ 5%: brown-black-red-gold.",
            "- 6.8 kΩ 5%: blue-grey-red-gold.",
            "- 75 kΩ 5%: violet-green-orange-gold.",
            "- 2.7 MΩ 5%: red-violet-green-gold.",
            "",
            "- If your initial reading of the band colours gives a value that is very far from these standard E12/E24 series values, double-check each colour and choose the most plausible combination.",
            "- If you are not at least 0.8 confident in the colours, still choose the most likely combination, but clearly mention the ambiguity in meta.notes and set meta.confidence below 0.8.",
            "",
            "RESISTORS (PRINTED TEXT, CEMENT / POWER):",
            "- If you see a white rectangular cement resistor marked like '5W100ΩJ' or '10W30ΩJ':",
            '    • component_type = "resistor".',
            "    • resistor.is_resistor = true, is_color_band_resistor = false.",
            "    • value_ohms from the printed Ω value (e.g. 100, 30, 680, 820).",
            "    • power_rating_watts from the '5W', '10W', etc.",
            "    • tolerance_percent from the letter (J≈5%, K≈10%, F≈1%) if visible.",
            "    • markings.primary_text = exact printed text.",
            "- For SMD resistors with numeric codes (e.g. '472', '4R7'): put code into markings.smd_code and convert to ohms.",
            "",
            "CAPACITORS / OTHER PARTS:",
            "- Electrolytic cap '35V 680µF' -> component_type='capacitor', nominal_value=680, value_unit='uf', voltage_rating_volts=35, printed_text='35V 680µF'.",
            "- Diode '1N4148' -> component_type='diode', markings.primary_text='1N4148'.",
            "- ICs: use markings.primary_text for the main part number printed on the component, secondary_text for extra line(s).",
            "",
            "PACKAGE / FORM FACTOR:",
            "- Axial leaded resistor: package='AXIAL', form_factor='through_hole'.",
            "- White rectangular power resistor: package='CEMENT', form_factor='through_hole'.",
            "- Radial electrolytic capacitor: package='RADIAL_CAN', form_factor='through_hole'.",
            "- SMD chip resistor/capacitor: package like '0603','0805','1206' if size is clear, otherwise null; form_factor='smd'.",
            "",
            "META:",
            "- confidence: 0.0 to 1.0 for how sure you are overall.",
            "- category: 'passive' for resistors/capacitors/inductors; 'active' for diodes/transistors/ICs; 'interconnect' for connectors, etc.",
            "- notes: briefly mention any ambiguity (e.g. brown vs red band) or assumptions.",
            "",
            "ABSOLUTE RULES:",
            "- Do NOT hallucinate markings that are not in the image.",
            "- BUT if a marking or colour is clearly readable, you MUST use it to compute real values.",
            "- Output ONLY the JSON object. No explanations, no markdown, no extra text.",
          ].join("\n"),
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Identify this electronic component and fill as many fields as possible. " +
                "Return ONLY the JSON object described above.",
            },
            {
              type: "image_url",
              image_url: {
                url: image, // data: URL from the frontend
              },
            },
          ],
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { success: false, error: "Empty response from model" },
        { status: 500 }
      );
    }

    let component: IdentifiedComponent;
    try {
      component = JSON.parse(raw);
    } catch (parseErr) {
      console.error("Failed to parse JSON from model:", raw);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse model JSON",
          raw,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      component,
    });
  } catch (err: any) {
    console.error("identify-component error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Internal error while identifying component",
        details: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}
