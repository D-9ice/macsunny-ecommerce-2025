import { NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * OCR Text Extraction API - Converts component list images to CSV
 * Uses GPT-4 Vision to read text from screenshots/photos
 */

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { success: false, message: 'Image is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'OpenAI API key not configured' },
        { status: 401 }
      );
    }

    // Initialize OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Call GPT-4 Vision to extract text
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an OCR text extraction expert for electronic component lists.

Extract ALL component names/codes from the image and convert to CSV format.

Rules:
1. Extract EVERY component code/name you see
2. Output format: SKU, Name, Category, Price
3. SKU = the component code as-is (e.g., "MIP531", "10V 3300UF", "TDA7563")
4. Name = descriptive name (e.g., "IC MIP531", "Capacitor 10V 3300µF", "IC TDA7563")
5. Category = one of: ICs, Capacitors, Resistors, Transistors, Diodes, Other
6. Price = 0 (will be filled later)
7. Do NOT skip any components
8. Do NOT add extra spaces or formatting
9. Return ONLY the CSV data, no explanations

Example output:
SKU, Name, Category, Price
MIP531, IC MIP531, ICs, 0
10V 3300UF, Capacitor 10V 3300µF, Capacitors, 0
TDA7563, IC TDA7563, ICs, 0`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all component codes from this image and convert to CSV format as instructed.'
            },
            {
              type: 'image_url',
              image_url: { url: image }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    });

    const csvText = response.choices[0]?.message?.content?.trim() || '';

    if (!csvText || csvText.length < 10) {
      return NextResponse.json(
        { success: false, message: 'No text extracted from image' },
        { status: 400 }
      );
    }

    // Count components (lines - 1 for header)
    const componentCount = csvText.split('\n').length - 1;

    return NextResponse.json({
      success: true,
      csvText: csvText,
      componentCount: componentCount,
      provider: 'GPT-4 Vision OCR'
    });

  } catch (error: any) {
    console.error('OCR extraction error:', error);
    
    if (error?.status === 429 || error?.message?.includes('quota')) {
      return NextResponse.json(
        { success: false, message: 'OpenAI quota exceeded. Add credits to continue.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, message: `Text extraction failed: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
