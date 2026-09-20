import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { componentSchema, normalizeIdentifier, openAI, parseJson, safeHttpUrl, SMART_MANAGER_MODEL } from '@/app/lib/super-smart-manager';

export const runtime = 'nodejs';

type Result = { verified: boolean; confidence: number; partNumber: string; manufacturer: string; name: string; category: string; package: string; pinCount: string; summary: string; specifications: Array<{label:string;value:string}>; datasheetUrl: string; sources: Array<{title:string;url:string;kind:string}>; images: Array<{url:string;sourceUrl:string;title:string}>; warnings: string[] };

const forbiddenImage = /(?:\.pdf(?:$|[?#])|datasheet|data[-_ ]?sheet|alldatasheet|pinout|schematic|diagram|manual|document|application note|marking information|packaging information)/i;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if ((await cookies()).get('ms_admin')?.value !== '1') return NextResponse.json({ success: false, message: 'Unauthorized', requestId }, { status: 401 });
  try {
    const body = await request.json();
    const identifier = normalizeIdentifier(String(body.identifier || ''));
    const image = typeof body.image === 'string' && /^data:image\/(jpeg|png|webp);base64,/i.test(body.image) ? body.image : '';
    if (!identifier && !image) return NextResponse.json({ success: false, message: 'Enter a part number or upload a component image.', requestId }, { status: 400 });
    const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: `Identify and verify this SELLABLE ELECTRONICS INVENTORY ITEM: ${identifier || '(inspect the supplied image)'}.
You MUST search the web. First classify the entire product as a passive/discrete component, module, development board, replacement PCB, appliance, audio/electromechanical item, material, tool, accessory, or kit. Preserve this hierarchy: complete appliance/kit > replacement board > assembled module > loose component. Never replace a board or module with an IC mounted on it. On-board IC markings are supporting evidence only.
Prefer manufacturer product pages/manuals and official datasheets, then reputable distributors. Cross-check exact brand/model/part number when present. Never guess: set verified false and explain ambiguity in warnings when evidence conflicts. Package and pinCount may be "Not applicable" for assemblies, appliances and materials.
Return no more than 8 concise, category-appropriate engineer-facing specifications: passives need value/tolerance/power/package; modules need function/input/output/interface/current/dimensions; replacement boards need compatible appliance/model, board number, function and connectors; audio/electromechanical items need model/type/impedance/power/dimensions as applicable; materials need material, dimensions, sides and thickness. Never return price, value, availability or purchasing advice.
For images, return only actual product photographs of this same WHOLE item. Exclude PDFs, datasheet/manual pages, screenshots, tables, diagrams, pinouts, schematics, logos, collages, unrelated onboard chips and generic category images. If the user supplied a photo, treat that photo as the authoritative product view and use web images only as optional alternatives.` }];
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
      tools: [{ type: 'web_search', search_content_types: ['image'], image_settings: { max_results: 3, caption: true } }] as never,
      include: ['web_search_call.results'] as never,
      input: `Find an actual product photograph of this exact sellable electronics inventory item: ${identifier}. Match the whole object type: keep modules and replacement boards intact, keep appliances/kits intact, and never substitute an onboard semiconductor. Prefer one complete item on a clean background. Exclude PDF or datasheet pages, manuals, screenshots, tables, diagrams, pinouts, schematics, logos, and unrelated or merely similar products.`,
    })]);
    const result = parseJson<Result>(response.output_text);
    result.confidence = result.confidence > 0 && result.confidence <= 1 ? Math.round(result.confidence * 100) : Math.round(result.confidence);
    result.datasheetUrl = safeHttpUrl(result.datasheetUrl);
    result.sources = result.sources.map((source) => ({ ...source, url: safeHttpUrl(source.url) })).filter((source) => source.url);
    const searchedImages = ([...response.output, ...imageResponse.output] as unknown as Array<Record<string, unknown>>).flatMap((item) => {
      const results = Array.isArray(item.results) ? item.results as Array<Record<string, unknown>> : [];
      return results.filter((entry) => entry.type === 'image_result').map((entry) => ({
        url: safeHttpUrl(entry.image_url || entry.thumbnail_url),
        fallbackUrl: safeHttpUrl(entry.thumbnail_url),
        sourceUrl: safeHttpUrl(entry.source_website_url),
        title: String(entry.caption || `${result.partNumber || identifier} component image`).slice(0, 180),
      }));
    });
    const imageCandidates = [...result.images, ...searchedImages].map((item) => ({ ...item, url: safeHttpUrl(item.url), fallbackUrl: safeHttpUrl('fallbackUrl' in item ? item.fallbackUrl : ''), sourceUrl: safeHttpUrl(item.sourceUrl) })).filter((item) => item.url && !forbiddenImage.test(`${item.url} ${item.sourceUrl} ${item.title}`));
    result.images = imageCandidates.filter((item, index) => imageCandidates.findIndex((candidate) => candidate.url === item.url) === index).slice(0, 1);
    if (result.images.length) result.warnings = result.warnings.filter((warning) => !/no image|image (?:url )?is (?:not )?included/i.test(warning));
    return NextResponse.json({ success: true, component: result, requestId });
  } catch (error) {
    console.error('smart-manager.enrich.failed', { requestId, error });
    return NextResponse.json({ success: false, message: 'Internet verification failed. Please retry or enter the details manually.', requestId }, { status: 500 });
  }
}
