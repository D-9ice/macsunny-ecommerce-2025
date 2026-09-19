import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { componentSchema, normalizeIdentifier, openAI, parseJson, safeHttpUrl, SMART_MANAGER_MODEL } from '@/app/lib/super-smart-manager';

export const runtime = 'nodejs';

type Result = { verified: boolean; confidence: number; partNumber: string; manufacturer: string; name: string; category: string; package: string; pinCount: string; summary: string; specifications: Array<{label:string;value:string}>; datasheetUrl: string; sources: Array<{title:string;url:string;kind:string}>; images: Array<{url:string;sourceUrl:string;title:string}>; warnings: string[] };

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if ((await cookies()).get('ms_admin')?.value !== '1') return NextResponse.json({ success: false, message: 'Unauthorized', requestId }, { status: 401 });
  try {
    const body = await request.json();
    const identifier = normalizeIdentifier(String(body.identifier || ''));
    const image = typeof body.image === 'string' && /^data:image\/(jpeg|png|webp);base64,/i.test(body.image) ? body.image : '';
    if (!identifier && !image) return NextResponse.json({ success: false, message: 'Enter a part number or upload a component image.', requestId }, { status: 400 });
    const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: `Identify and verify this electronic component: ${identifier || '(read the marking from the supplied image)'}.
You MUST search the web. Prefer the manufacturer product page and official datasheet; then reputable electronics distributors. Cross-check the exact marking, suffix, package, and pin count. Never guess: set verified false and explain ambiguity in warnings when evidence conflicts.
Return only vital engineer-facing specifications (maximum 8, chosen for this component category). Do not return price, estimated price, market value, availability, or purchasing advice.
For images, provide direct image URLs only when the source visibly shows exactly one matching component, its complete body and pins, and a readable face marking/part number on a clean background. Prefer manufacturer or authorized distributor images. Do not use collages, boards, schematics, logos, or generic category photos. If no trustworthy direct image URL is available, return an empty images array.` }];
    if (image) content.push({ type: 'input_image', image_url: image, detail: 'high' });
    const client = openAI();
    const [response, imageResponse] = await Promise.all([client.responses.create({
      model: SMART_MANAGER_MODEL, store: false,
      tools: [{ type: 'web_search', search_content_types: ['image', 'text'], image_settings: { max_results: 6, caption: true } }] as never,
      include: ['web_search_call.action.sources', 'web_search_call.results'] as never,
      input: [{ role: 'user', content }] as never,
      text: { format: { type: 'json_schema', name: 'verified_component', strict: true, schema: componentSchema } },
    }), client.responses.create({
      model: SMART_MANAGER_MODEL, store: false,
      tools: [{ type: 'web_search', search_content_types: ['image'], image_settings: { max_results: 6, caption: true } }] as never,
      include: ['web_search_call.results'] as never,
      input: `Find clear, accurate product photographs for the exact electronic part ${identifier}. Return images showing exactly one complete component on a clean background, with all pins and the face marking visible. Exclude lots, kits, circuit boards, diagrams, logos, and similar-looking part numbers.`,
    })]);
    const result = parseJson<Result>(response.output_text);
    result.confidence = result.confidence > 0 && result.confidence <= 1 ? Math.round(result.confidence * 100) : Math.round(result.confidence);
    result.datasheetUrl = safeHttpUrl(result.datasheetUrl);
    result.sources = result.sources.map((source) => ({ ...source, url: safeHttpUrl(source.url) })).filter((source) => source.url);
    const searchedImages = ([...response.output, ...imageResponse.output] as unknown as Array<Record<string, unknown>>).flatMap((item) => {
      const results = Array.isArray(item.results) ? item.results as Array<Record<string, unknown>> : [];
      return results.filter((entry) => entry.type === 'image_result').map((entry) => ({
        url: safeHttpUrl(entry.image_url || entry.thumbnail_url),
        sourceUrl: safeHttpUrl(entry.source_website_url),
        title: String(entry.caption || `${result.partNumber || identifier} component image`).slice(0, 180),
      }));
    });
    const imageCandidates = [...result.images, ...searchedImages].map((item) => ({ ...item, url: safeHttpUrl(item.url), sourceUrl: safeHttpUrl(item.sourceUrl) })).filter((item) => item.url);
    result.images = imageCandidates.filter((item, index) => imageCandidates.findIndex((candidate) => candidate.url === item.url) === index).slice(0, 6);
    if (result.images.length) result.warnings = result.warnings.filter((warning) => !/no image|image (?:url )?is (?:not )?included/i.test(warning));
    return NextResponse.json({ success: true, component: result, requestId });
  } catch (error) {
    console.error('smart-manager.enrich.failed', { requestId, error });
    return NextResponse.json({ success: false, message: 'Internet verification failed. Please retry or enter the details manually.', requestId }, { status: 500 });
  }
}
