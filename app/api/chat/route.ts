import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { connectDB, ProductModel } from '@/app/lib/mongodb';

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

    // Detect if user is asking about products/components
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const isProductQuery = /do you have|in stock|available|price|cost|buy|purchase|mps|tda|lm|bc|ic|capacitor|resistor|transistor|diode/i.test(lastMessage);
    const isEquivalentQuery = /equivalent|alternative|substitute|similar|replace|instead of|like|same as/i.test(lastMessage);
    
    // Detect simple greetings/acknowledgments (FAST PATH)
    const simpleWords = ['thanks', 'thank you', 'ok', 'okay', 'yes', 'no', 'hi', 'hello', 'bye', 'goodbye', 'cool', 'nice', 'great', 'awesome', 'perfect'];
    const isSimpleMessage = simpleWords.some(word => lastMessage.includes(word)) && lastMessage.split(' ').length <= 5 && !isProductQuery;

    // ⚡ FAST PATH: Skip all database queries for simple messages
    if (isSimpleMessage) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a friendly AI assistant for MacSunny Electronics. Keep greetings SHORT (1-2 sentences). Be warm and helpful.'
          },
          ...messages,
        ],
        max_tokens: 50, // Very short for greetings
        temperature: 0.7,
      });

      const aiReply = response.choices[0].message.content || 'Hello! How can I help you?';

      return NextResponse.json({
        success: true,
        message: aiReply,
        context_type: 'simple_greeting',
        tokens_used: response.usage?.total_tokens || 0,
      });
    }

    // SLOW PATH: Product/inventory queries require database access
    let systemPrompt = `You are a helpful AI assistant for MacSunny Electronics inventory system.

Store Info:
- Location: ZONGOLANE ACCRA CENTRAL, ACCRA, GHANA
- Contact: (+233) 0243380902, 0249135208, 0551507985
- Email: Macsunny2025@gmail.com

CRITICAL INSTRUCTIONS:
- You have DIRECT ACCESS to our real-time inventory database
- When asked if we have a component, CHECK THE INVENTORY DATA provided below
- If component IS in inventory: Say "Yes, we have [component name] in stock for GHS [price]"
- If component is NOT in inventory: Say "We don't currently have [component] in stock, but you can call us to check alternatives"
- Keep responses SHORT (1-2 sentences). Be direct and helpful.`;

    let contextType = 'general';

    // Fetch product context for ANY product-related query (not just when explicitly requested)
    if (includeProductContext || isProductQuery || isEquivalentQuery) {
      try {
        // If asking about equivalents, use smart search
        if (isEquivalentQuery) {
          contextType = 'equivalent_search';
          
          // Extract component SKU/name from query
          const skuMatch = lastMessage.match(/([a-z0-9]+[-_]?[a-z0-9]+)/gi);
          
          if (skuMatch && skuMatch.length > 0) {
            const searchTerm = skuMatch[0];
            
            console.log(`🔍 AI Chat: Searching equivalents for "${searchTerm}"`);
            
            const searchRes = await fetch(`http://localhost:3001/api/equivalents/search`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                query: searchTerm,
                includeExternal: true 
              }),
            });

            if (searchRes.ok) {
              const searchData = await searchRes.json();
              
              systemPrompt += `\n\n🔍 Component Search Results for "${searchTerm}":\n\n`;
              
              // Show local inventory matches
              if (searchData.found_in_inventory.length > 0) {
                systemPrompt += `✅ WE HAVE IN STOCK:\n`;
                searchData.found_in_inventory.forEach((p: any) => {
                  systemPrompt += `- ${p.sku}: ${p.name} - GHS ${p.price}`;
                  if (p.equivalent_of) {
                    systemPrompt += ` (alternative to ${p.equivalent_of})`;
                  }
                  systemPrompt += '\n';
                });
              }
              
              // Show cached/external equivalents
              const equivSource = searchData.cached_equivalents || searchData.external_equivalents;
              if (equivSource && equivSource.equivalents.length > 0) {
                systemPrompt += `\n📋 KNOWN EQUIVALENTS (industry-standard):\n`;
                equivSource.equivalents.slice(0, 5).forEach((eq: any) => {
                  systemPrompt += `- ${eq.mpn} by ${eq.manufacturer}`;
                  if (eq.in_stock_external) {
                    systemPrompt += ` (available from ${eq.distributor})`;
                  }
                  systemPrompt += '\n';
                });
                
                if (equivSource.source === 'octopart') {
                  systemPrompt += `\nSource: Octopart (verified component database)\n`;
                }
              }
              
              if (searchData.found_in_inventory.length === 0 && (!equivSource || equivSource.equivalents.length === 0)) {
                systemPrompt += `❌ No matches found for "${searchTerm}" in our inventory or component database.\n`;
                systemPrompt += `Suggestion: Check for typos or try a different part number.\n`;
              }
            }
          }
        } else {
          // Regular product query - search our inventory directly
          contextType = 'product_search';
          
          await connectDB();
          
          // Extract potential component names from query
          const queryWords = lastMessage.split(/\s+/).filter((w: string) => w.length > 2);
          
          let products: any[] = [];
          
          // Search by SKU or name
          if (queryWords.length > 0) {
            products = await ProductModel.find({
              $or: [
                { sku: { $regex: queryWords.join('|'), $options: 'i' } },
                { name: { $regex: queryWords.join('|'), $options: 'i' } },
                { category: { $regex: queryWords.join('|'), $options: 'i' } }
              ]
            }).limit(20).lean();
          }
          
          // If no specific match, show recent products
          if (products.length === 0) {
            products = await ProductModel.find().sort({ createdAt: -1 }).limit(30).lean();
          }
          
          if (products.length > 0) {
            systemPrompt += `\n\n📦 OUR CURRENT INVENTORY (${products.length} items):\n`;
            products.forEach((p: any) => {
              systemPrompt += `- ${p.sku}: ${p.name} - GHS ${p.price}\n`;
            });
            systemPrompt += `\nTotal products in database: ${products.length}\n`;
          } else {
            systemPrompt += `\n\n⚠️ No products found in inventory matching your query.\n`;
          }
        }
      } catch (err) {
        console.error('Context fetch failed:', err);
      }
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages] as any,
      temperature: 0.3,
      max_tokens: isSimpleMessage ? 50 : (isEquivalentQuery ? 200 : 100), // Very short for greetings, moderate for product queries
      stream: false
    });

    return NextResponse.json({
      success: true,
      message: response.choices[0]?.message?.content || 'No response',
      provider: 'GPT-4',
      context_type: contextType
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
