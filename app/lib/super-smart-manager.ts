import OpenAI from 'openai';

export const SMART_MANAGER_MODEL = process.env.SMART_MANAGER_MODEL || 'gpt-5.6-luna';

export type SmartSource = { title: string; url: string; kind: 'manufacturer' | 'datasheet' | 'distributor' | 'other' };
export type SmartImage = { url: string; sourceUrl: string; title: string };
export type SmartSpec = { label: string; value: string };

export const extractSchema = {
  type: 'object', additionalProperties: false, required: ['parts'],
  properties: {
    parts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['identifier'], properties: { identifier: { type: 'string' } } } },
  },
} as const;

export const componentSchema = {
  type: 'object', additionalProperties: false,
  required: ['verified', 'confidence', 'partNumber', 'manufacturer', 'name', 'category', 'package', 'pinCount', 'summary', 'specifications', 'datasheetUrl', 'sources', 'images', 'warnings'],
  properties: {
    verified: { type: 'boolean' }, confidence: { type: 'number', minimum: 0, maximum: 100 },
    partNumber: { type: 'string' }, manufacturer: { type: 'string' }, name: { type: 'string' }, category: { type: 'string' },
    package: { type: 'string' }, pinCount: { type: 'string' }, summary: { type: 'string' },
    specifications: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['label', 'value'], properties: { label: { type: 'string' }, value: { type: 'string' } } } },
    datasheetUrl: { type: 'string' },
    sources: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false, required: ['title', 'url', 'kind'], properties: { title: { type: 'string' }, url: { type: 'string' }, kind: { type: 'string', enum: ['manufacturer', 'datasheet', 'distributor', 'other'] } } } },
    images: { type: 'array', maxItems: 6, items: { type: 'object', additionalProperties: false, required: ['url', 'sourceUrl', 'title'], properties: { url: { type: 'string' }, sourceUrl: { type: 'string' }, title: { type: 'string' } } } },
    warnings: { type: 'array', maxItems: 6, items: { type: 'string' } },
  },
} as const;

export function openAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function parseJson<T>(text: string): T {
  const clean = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(clean) as T;
}

export function normalizeIdentifier(value: string) {
  return value.trim().replace(/^[\s,;|]+|[\s,;|]+$/g, '').replace(/\s{2,}/g, ' ').slice(0, 120);
}

export function uniqueIdentifiers(values: string[]) {
  const seen = new Set<string>();
  return values.map(normalizeIdentifier).filter((value) => {
    const key = value.toUpperCase();
    if (!value || seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 100);
}

export function safeHttpUrl(value: unknown) {
  try { const url = new URL(String(value)); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''; } catch { return ''; }
}
