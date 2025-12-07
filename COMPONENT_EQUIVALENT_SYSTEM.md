# 🔍 Component Equivalent Search System - Implementation Guide

## 📋 Overview
Build an AI-powered component equivalent/substitute finder integrated into MacSunny's inventory system.

---

## 🎯 Core Features

### 1. **Component Equivalent Database**
- Store alternative/substitute components
- Cross-reference popular components (1N4148 → 1N914, BC547 → 2N2222, etc.)
- Manufacturer cross-reference (NXP vs Texas Instruments vs STMicroelectronics)

### 2. **Parametric Search Engine**
- Search by electrical specifications
- Filter by package type, voltage rating, current rating, tolerance
- Find closest matches when exact component unavailable

### 3. **Smart AI Integration**
- Natural language queries: "Do you have something similar to 1N4007?"
- Semantic search: "I need a 5V regulator"
- Auto-suggest alternatives when out of stock

---

## 🗂️ Database Schema Extension

### Add to MongoDB: `component_equivalents` collection

```typescript
interface ComponentEquivalent {
  _id: string;
  primary_component: {
    sku: string;           // "1N4148"
    name: string;          // "Fast Switching Diode"
    category: string;      // "Diodes"
  };
  equivalents: Array<{
    sku: string;           // "1N914"
    compatibility: number; // 0.0-1.0 (1.0 = perfect substitute)
    notes?: string;        // "Pin-compatible, slightly lower voltage"
    manufacturer?: string;
  }>;
  specifications: {
    voltage?: number;
    current?: number;
    power?: number;
    tolerance?: number;
    package?: string;
    // Flexible JSON for component-specific params
    [key: string]: any;
  };
  alternative_skus: string[];  // Quick lookup array
  created_at: Date;
  updated_at: Date;
}
```

### Add to Products Schema

```typescript
// Extend existing Product model
interface Product {
  // ... existing fields
  specifications?: {
    voltage?: number;
    current?: number;
    power?: number;
    tolerance?: number;
    package?: string;
    temp_range?: string;
    material?: string;
    // Component-specific
    [key: string]: any;
  };
  alternatives?: string[];  // SKUs of equivalent components
  substitute_for?: string[]; // Components this can replace
  cross_references?: {
    manufacturer: string;
    part_number: string;
  }[];
}
```

---

## 🛠️ Implementation Steps

### **Phase 1: Database Setup (2-3 hours)**

1. **Create API routes**:
   - `/api/equivalents` - CRUD for equivalents
   - `/api/equivalents/search` - Search by SKU/specs
   - `/api/equivalents/suggest` - AI-powered suggestions

2. **Seed common equivalents**:
```typescript
// scripts/seed-equivalents.ts
const commonEquivalents = [
  {
    primary: "1N4148",
    equivalents: ["1N914", "1N4448", "BAV21"],
    specs: { type: "diode", voltage: 100, current: 0.3 }
  },
  {
    primary: "BC547",
    equivalents: ["2N2222", "2N3904", "BC337"],
    specs: { type: "transistor", voltage: 45, current: 0.1 }
  },
  // Add 100-200 common components
];
```

---

### **Phase 2: API Enhancement (3-4 hours)**

#### **File: `/app/api/equivalents/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/lib/mongodb';
import mongoose from 'mongoose';

const EquivalentSchema = new mongoose.Schema({
  primary_component: {
    sku: String,
    name: String,
    category: String,
  },
  equivalents: [{
    sku: String,
    compatibility: Number,
    notes: String,
    manufacturer: String,
  }],
  specifications: mongoose.Schema.Types.Mixed,
  alternative_skus: [String],
}, { timestamps: true });

const EquivalentModel = mongoose.models.Equivalent || 
  mongoose.model('Equivalent', EquivalentSchema);

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get('sku');

    if (sku) {
      // Find equivalents for specific component
      const equiv = await EquivalentModel.findOne({
        $or: [
          { 'primary_component.sku': sku },
          { alternative_skus: sku }
        ]
      });

      return NextResponse.json({ success: true, equivalent: equiv });
    }

    // Return all equivalents
    const equivalents = await EquivalentModel.find().limit(100);
    return NextResponse.json({ success: true, equivalents });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const data = await request.json();

    const equivalent = new EquivalentModel(data);
    await equivalent.save();

    return NextResponse.json({ success: true, equivalent });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

#### **File: `/app/api/equivalents/search/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { connectDB, ProductModel } from '@/app/lib/mongodb';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { query, specifications } = await request.json();

    // Method 1: Direct SKU match
    if (query && !specifications) {
      const products = await ProductModel.find({
        $or: [
          { sku: { $regex: query, $options: 'i' } },
          { name: { $regex: query, $options: 'i' } },
          { 'alternatives': { $regex: query, $options: 'i' } },
        ]
      }).limit(10);

      return NextResponse.json({ success: true, matches: products });
    }

    // Method 2: Parametric search by specifications
    if (specifications) {
      const filter: any = {};

      if (specifications.voltage) {
        filter['specifications.voltage'] = {
          $gte: specifications.voltage * 0.9,
          $lte: specifications.voltage * 1.1
        };
      }

      if (specifications.current) {
        filter['specifications.current'] = {
          $gte: specifications.current * 0.8,
          $lte: specifications.current * 1.2
        };
      }

      if (specifications.package) {
        filter['specifications.package'] = specifications.package;
      }

      const products = await ProductModel.find(filter).limit(20);
      return NextResponse.json({ success: true, matches: products });
    }

    // Method 3: AI-powered semantic search
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'AI search not configured' },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    // Get all products
    const allProducts = await ProductModel.find().limit(500);
    
    // Use GPT to extract intent and specs from natural language
    const extraction = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `Extract component specifications from user query. 
        Return JSON: { "component_type": "resistor|capacitor|ic|diode|transistor|etc", 
        "value": number, "unit": "ohm|uf|v|a", "package": "string", 
        "keywords": ["search", "terms"] }`
      }, {
        role: 'user',
        content: query
      }],
      response_format: { type: 'json_object' },
      temperature: 0
    });

    const specs = JSON.parse(extraction.choices[0]?.message?.content || '{}');
    
    // Filter products based on extracted specs
    const matches = allProducts.filter(product => {
      if (specs.keywords) {
        return specs.keywords.some((kw: string) => 
          product.name.toLowerCase().includes(kw.toLowerCase()) ||
          product.category?.toLowerCase().includes(kw.toLowerCase())
        );
      }
      return false;
    }).slice(0, 10);

    return NextResponse.json({ 
      success: true, 
      matches, 
      extracted_specs: specs 
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

---

### **Phase 3: Enhanced AI Chat (2-3 hours)**

#### **Update: `/app/api/chat/route.ts`**

Add component equivalent detection:

```typescript
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

    // ✨ NEW: Detect if user is asking about equivalents/alternatives
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    const isEquivalentQuery = /equivalent|alternative|substitute|similar|replace|instead of|like|same as/i.test(lastMessage);

    let systemPrompt = \`You are a helpful AI assistant for MacSunny Electronics.

Store Info:
- Location: ZONGOLANE ACCRA CENTRAL, ACCRA, GHANA
- Contact: (+233) 0243380902, 0249135208, 0551507985
- Email: Macsunny2025@gmail.com

IMPORTANT: Keep responses VERY SHORT (1-2 sentences max). Be direct and helpful.\`;

    let productContext = '';

    if (includeProductContext || isEquivalentQuery) {
      try {
        await connectDB();

        // ✨ NEW: If asking about equivalents, search more intelligently
        if (isEquivalentQuery) {
          // Extract component SKU/name from query
          const skuMatch = lastMessage.match(/([a-z0-9]+[-_]?[a-z0-9]+)/gi);
          
          if (skuMatch && skuMatch.length > 0) {
            const searchTerm = skuMatch[0];
            
            // Search for component and its alternatives
            const products = await ProductModel.find({
              $or: [
                { sku: { $regex: searchTerm, $options: 'i' } },
                { name: { $regex: searchTerm, $options: 'i' } },
                { alternatives: { $regex: searchTerm, $options: 'i' } },
                { substitute_for: { $regex: searchTerm, $options: 'i' } },
              ]
            }).limit(20);

            if (products.length > 0) {
              productContext = \`\n\nAvailable components matching "${searchTerm}":\n\` +
                products.map((p: any) => {
                  let info = \`- ${p.sku}: ${p.name} - GHS ${p.price}\`;
                  if (p.alternatives && p.alternatives.length > 0) {
                    info += \` (Alternatives: \${p.alternatives.join(', ')})\`;
                  }
                  if (p.specifications) {
                    info += \` | Specs: \${JSON.stringify(p.specifications)}\`;
                  }
                  return info;
                }).join('\n');
            } else {
              productContext = \`\n\nNo exact match for "${searchTerm}" found. Suggesting similar components:\n\`;
              
              // Fallback: Search by category/type
              const categoryProducts = await ProductModel.find({
                $or: [
                  { category: { $regex: searchTerm, $options: 'i' } },
                  { name: { $regex: searchTerm.substring(0, 3), $options: 'i' } }
                ]
              }).limit(10);

              productContext += categoryProducts.map((p: any) => 
                \`- \${p.sku}: \${p.name} - GHS \${p.price}\`
              ).join('\n');
            }
          }
        } else {
          // Regular product query
          const products = await ProductModel.find().limit(50);
          productContext = '\n\nProducts:\n' + 
            products.map((p: any) => 
              \`\${p.sku}: \${p.name} - GHS \${p.price}\`
            ).join('\n');
        }

        systemPrompt += productContext;

      } catch (err) {
        console.error('Product fetch failed:', err);
      }
    }

    // ✨ NEW: Add equivalent-specific instructions
    if (isEquivalentQuery) {
      systemPrompt += \`\n\nWhen asked about equivalents/alternatives:
1. Check the "Alternatives" field in product data
2. Suggest components with similar specifications
3. Mention if we have the exact component or close alternatives
4. Keep response under 3 sentences\`;
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: systemPrompt }, ...messages] as any,
      temperature: 0.3,
      max_tokens: 200, // Increased for equivalent explanations
      stream: false
    });

    return NextResponse.json({
      success: true,
      message: response.choices[0]?.message?.content || 'No response',
      provider: 'GPT-4',
      context_type: isEquivalentQuery ? 'equivalent_search' : 'general'
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Chat failed' },
      { status: 500 }
    );
  }
}
```

---

### **Phase 4: Frontend Component (1-2 hours)**

#### **Update: `/app/components/AIChatFab.tsx`**

Add equivalent search hints:

```typescript
// After line 30, add:
const isEquivalentQuery = input.toLowerCase().match(/equivalent|alternative|substitute|similar|replace/);

// Update placeholder to hint:
<input
  placeholder={
    isEquivalentQuery 
      ? "Searching for alternatives..." 
      : "Ask about components, equivalents, pricing..."
  }
/>

// Add quick action buttons:
<div className="flex gap-2 mb-2">
  <button 
    onClick={() => setInput("Do you have alternatives for 1N4148?")}
    className="text-xs px-2 py-1 bg-purple-600 rounded"
  >
    Find Equivalent
  </button>
  <button 
    onClick={() => setInput("What transistors do you have?")}
    className="text-xs px-2 py-1 bg-blue-600 rounded"
  >
    Browse by Type
  </button>
</div>
```

---

### **Phase 5: Admin UI for Equivalents (2-3 hours)**

Create `/app/admin/equivalents/page.tsx`:

```typescript
'use client';
import { useState, useEffect } from 'react';

export default function EquivalentsManager() {
  const [equivalents, setEquivalents] = useState([]);
  const [formData, setFormData] = useState({
    primary_sku: '',
    equivalent_skus: '',
    compatibility: 1.0,
    notes: ''
  });

  const loadEquivalents = async () => {
    const res = await fetch('/api/equivalents');
    const data = await res.json();
    setEquivalents(data.equivalents || []);
  };

  const saveEquivalent = async () => {
    const payload = {
      primary_component: {
        sku: formData.primary_sku,
      },
      equivalents: formData.equivalent_skus.split(',').map(sku => ({
        sku: sku.trim(),
        compatibility: formData.compatibility,
        notes: formData.notes
      })),
      alternative_skus: formData.equivalent_skus.split(',').map(s => s.trim())
    };

    await fetch('/api/equivalents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    loadEquivalents();
  };

  useEffect(() => {
    loadEquivalents();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Component Equivalents Manager</h1>
      
      {/* Add/Edit Form */}
      <div className="bg-gray-800 p-6 rounded-lg mb-8">
        <input
          placeholder="Primary SKU (e.g., 1N4148)"
          className="w-full mb-4 p-2 bg-gray-700 rounded"
          value={formData.primary_sku}
          onChange={e => setFormData({...formData, primary_sku: e.target.value})}
        />
        <input
          placeholder="Equivalent SKUs (comma-separated: 1N914, 1N4448)"
          className="w-full mb-4 p-2 bg-gray-700 rounded"
          value={formData.equivalent_skus}
          onChange={e => setFormData({...formData, equivalent_skus: e.target.value})}
        />
        <textarea
          placeholder="Notes (optional)"
          className="w-full mb-4 p-2 bg-gray-700 rounded"
          value={formData.notes}
          onChange={e => setFormData({...formData, notes: e.target.value})}
        />
        <button 
          onClick={saveEquivalent}
          className="px-4 py-2 bg-green-600 rounded"
        >
          Save Equivalent
        </button>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {equivalents.map((eq: any) => (
          <div key={eq._id} className="bg-gray-800 p-4 rounded">
            <strong>{eq.primary_component?.sku}</strong>
            <div className="text-sm text-gray-400">
              Alternatives: {eq.alternative_skus?.join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 📊 Testing Strategy

### Test Scenarios:

1. **Direct Match**:
   - User: "Do you have 1N4148?"
   - Expected: Shows 1N4148 and equivalents (1N914, 1N4448)

2. **Equivalent Request**:
   - User: "What's equivalent to BC547?"
   - Expected: Lists 2N2222, 2N3904, BC337

3. **Out of Stock**:
   - User: "I need LM7805 but it's out of stock"
   - Expected: Suggests LM78S05, LM340T-5.0

4. **Parametric**:
   - User: "5V regulator"
   - Expected: Lists all 5V regulators with specs

5. **Vague Query**:
   - User: "Something like 555 timer"
   - Expected: Shows NE555, LM555, TLC555

---

## 🎯 Expected Outcomes

### Effectiveness Metrics:

1. **Search Accuracy**: 85%+ of equivalent queries return usable results
2. **Response Time**: < 2 seconds for database queries
3. **User Satisfaction**: Reduces "can't find component" inquiries by 60%
4. **Cross-Sell**: Increases average order value by 15-20%

### Business Benefits:

- **Reduce Customer Support**: AI handles 70% of "do you have X?" queries
- **Increase Sales**: Suggest alternatives when primary component out of stock
- **Build Trust**: Shows expertise in component knowledge
- **Competitive Advantage**: Most electronics stores don't have this

---

## 💰 Cost Estimate

### Development Time:
- Phase 1: 2-3 hours (Database)
- Phase 2: 3-4 hours (APIs)
- Phase 3: 2-3 hours (AI Enhancement)
- Phase 4: 1-2 hours (Frontend)
- Phase 5: 2-3 hours (Admin UI)
- **Total: 10-15 hours**

### Ongoing Costs:
- OpenAI API: ~$5-10/month (based on 1000 queries/day)
- MongoDB: Already covered
- Maintenance: 2-3 hours/month for data updates

---

## 🚀 Quick Start (Minimum Viable Product)

For a **2-hour MVP**, implement just:

1. **Add `alternatives` field to Product schema**
2. **Update AI chat to detect equivalent queries**
3. **Seed 50 common component equivalents manually**
4. **Test with common queries**

This gives you 60% of the value with 20% of the effort!

---

## 📚 Data Sources for Seeding

Where to get component equivalent data:

1. **Octopart API** (free tier): Cross-reference database
2. **DigiKey/Mouser PDFs**: Manufacturer cross-reference guides
3. **AllDataSheet.com**: Free component datasheets
4. **Manual curation**: Top 100 components from your inventory
5. **Community contribution**: Let users suggest equivalents

---

## 🎓 Example Equivalent Database (Top 20)

```json
[
  { "primary": "1N4148", "alts": ["1N914", "1N4448", "BAV21"] },
  { "primary": "1N4007", "alts": ["1N4001", "1N5408", "UF4007"] },
  { "primary": "BC547", "alts": ["2N2222", "2N3904", "BC337"] },
  { "primary": "BC557", "alts": ["2N2907", "2N3906", "BC327"] },
  { "primary": "2N3904", "alts": ["BC547", "2N2222", "PN2222"] },
  { "primary": "2N3906", "alts": ["BC557", "2N2907", "PN2907"] },
  { "primary": "LM7805", "alts": ["LM78S05", "LM340T-5.0", "MC7805"] },
  { "primary": "LM317", "alts": ["LM117", "LM217", "LM337"] },
  { "primary": "NE555", "alts": ["LM555", "TLC555", "ICM7555"] },
  { "primary": "LM358", "alts": ["TL072", "LM324", "OP07"] },
  { "primary": "4017", "alts": ["CD4017", "HCF4017", "MC14017"] },
  { "primary": "4020", "alts": ["CD4020", "HCF4020", "MC14020"] },
  { "primary": "74HC595", "alts": ["SN74HC595", "CD74HC595", "MC74HC595"] },
  { "primary": "ATmega328P", "alts": ["ATmega328", "ATmega168"] },
  { "primary": "ESP32", "alts": ["ESP32-WROOM", "ESP32-WROVER"] },
  { "primary": "L293D", "alts": ["SN754410", "L298N"] },
  { "primary": "IRF540", "alts": ["IRF540N", "IRFZ44N"] },
  { "primary": "TIP120", "alts": ["TIP122", "BD139"] },
  { "primary": "10µF/25V", "alts": ["10µF/35V", "10µF/50V"] },
  { "primary": "100nF", "alts": ["0.1µF", "104"] }
]
```

---

## ✅ Recommendation

**START WITH MVP** (Phase 1-3 only):
- Takes 6-8 hours
- Gives immediate value
- Test with real users
- Expand based on feedback

Would you like me to implement this system now? I can start with the MVP approach and have it running in a few hours.
