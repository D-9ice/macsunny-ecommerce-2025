import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
  try {
    const { messages, includeProductContext } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, message: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, message: 'OpenAI API key not configured' },
        { status: 401 }
      );
    }

    let systemPrompt = `You are a helpful AI assistant for MacSunny Electronics.

Store Info:
- Location: ZONGOLANE ACCRA CENTRAL, ACCRA, GHANA
- Contact: (+233) 0243380902, 0249135208, 0551507985
- Email: Macsunny2025@gmail.com

IMPORTANT: Keep responses VERY SHORT (1-2 sentences max). Be direct and helpful. For simple messages like "thank you", respond with just "You're welcome! 😊" or similar brief replies.`;

    if (includeProductContext) {
      try {
        const res = await fetch(`http://localhost:3001/api/products`);
        if (res.ok) {
          const { products } = await res.json();
          const list = products.slice(0, 50).map((p: any) => 
            `${p.sku}: ${p.name} - GHS ${p.price}`
          ).join('\n');
          systemPrompt += `\n\nProducts:\n${list}`;
        }
      } catch (err) {
        console.error('Product fetch failed:', err);
      }
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages] as any,
      temperature: 0.3,
      max_tokens: 150,
      stream: false
    });

    return NextResponse.json({
      success: true,
      message: response.choices[0]?.message?.content || 'No response',
      provider: 'GPT-4'
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Chat failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    configured: !!process.env.OPENAI_API_KEY,
    provider: 'GPT-4'
  });
}
