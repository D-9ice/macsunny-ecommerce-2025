import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { componentSchema, normalizeIdentifier, openAI, parseJson, safeHttpUrl, SMART_MANAGER_MODEL } from '@/app/lib/super-smart-manager';
import { deleteBlobSafely, uploadAnalysisWebp } from '@/lib/images';
import { isAdminAuthenticated } from '@/app/lib/adminAuth';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Result = { verified: boolean; confidence: number; partNumber: string; manufacturer: string; name: string; category: string; package: string; pinCount: string; summary: string; specifications: Array<{label:string;value:string}>; datasheetUrl: string; sources: Array<{title:string;url:string;kind:string}>; images: Array<{url:string;sourceUrl:string;title:string}>; warnings: string[] };

const forbiddenImage = /(?:\.pdf(?:$|[?#])|datasheet|data[-_ ]?sheet|alldatasheet|pinout|schematic|diagram|manual|document|application note|marking information|packaging information)/i;
const placeholderIdentity = /^(?:not identified|unknown(?:\s*\/\s*unmarked)?|unknown(?: electronics item| component)?|unmarked|generic|n\/a|not applicable)$/i;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if (!(await isAdminAuthenticated())) return NextResponse.json({ success: false, message: 'Unauthorized', requestId }, { status: 401 });
  let temporaryBlob: string | undefined;
  try {
    const form = await request.formData();
    const identifier = normalizeIdentifier(String(form.get('identifier') || ''));
    let requestedCategories: unknown = [];
    try { requestedCategories = JSON.parse(String(form.get('categories') || '[]')); } catch { requestedCategories = []; }
    const managedCategories = Array.isArray(requestedCategories) ? [...new Set(requestedCategories.map((value: unknown) => String(value).trim()).filter(Boolean))].slice(0, 100) as string[] : [];
    const file = form.get('file');
    if (file instanceof File && file.type !== 'image/webp') return NextResponse.json({ success: false, message: 'Component photos must be WebP.', requestId }, { status: 415 });
    if (file instanceof File && file.size > 3_000_000) return NextResponse.json({ success: false, message: 'Component photos must be smaller than 3 MB.', requestId }, { status: 400 });
    const uploaded = file instanceof File && file.size ? await uploadAnalysisWebp(file) : undefined;
    temporaryBlob = uploaded?.pathname;
    const image = uploaded?.url || '';
    if (!identifier && !image) return NextResponse.json({ success: false, message: 'Enter a part number or upload a component image.', requestId }, { status: 400 });
    const categorySchema = managedCategories.length ? { ...componentSchema, properties: { ...componentSchema.properties, category: { type: 'string', enum: managedCategories } } } : componentSchema;
    const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: `Identify and verify this SELLABLE ELECTRONICS INVENTORY ITEM: ${identifier || '(inspect the supplied image)'}.
You MUST search the web. First classify the entire product as a passive/discrete component, module, development board, replacement PCB, appliance, audio/electromechanical item, material, tool, accessory, or kit. Preserve this hierarchy: complete appliance/kit > replacement board > assembled module > loose component. Never replace a board or module with an IC mounted on it. On-board IC markings are supporting evidence only.
Prefer manufacturer product pages/manuals and official datasheets, then reputable distributors. Cross-check exact brand/model/part number when present. Never guess: set verified false and explain ambiguity in warnings when evidence conflicts. Package and pinCount may be "Not applicable" for assemblies, appliances and materials.
Read prominent markings on the supplied product before searching. When a visible marking such as MQ-2 identifies a standard module, preserve it verbatim in partNumber and use it in the product name and search. Count visible module header pins when possible. Never return high confidence with a placeholder partNumber: if partNumber is unknown, verified must be false and confidence must be 35 or lower.
For an unmarked passive without a manufacturer part number, partNumber must be a short normalized engineering identity such as "1 kOhm 5% axial resistor" rather than "Not identified" or a prose sentence. If several identical loose parts appear, describe one singular part and ignore the photographed count; never use "lot", "pack", "set", or "assortment" in partNumber or name.
Commodity modules often have no manufacturer model printed on the PCB. In that case, verify the standardized functional product family by matching visible layout, terminal count, potentiometers/switches, major components and PCB colour across multiple web sources. Use a concise functional partNumber such as "PWM-BRUSHED-DC-MOTOR-CONTROLLER". Include voltage, current, power or frequency in partNumber/name/specifications only when visible markings or a unique model establish them; a photograph matching several differently rated revisions does not. Do not return Unknown, Unmarked or Not identified merely because the manufacturer is unknown. Put conflicting advertised ratings in warnings instead of choosing one.
${managedCategories.length ? `Category Manager is authoritative. category MUST be exactly one of these managed names: ${managedCategories.join(' | ')}. Choose the closest correct category; never invent or rewrite a category.` : 'No managed categories were supplied; use "Uncategorized".'}
Return no more than 8 concise, category-appropriate engineer-facing specifications: passives need value/tolerance/power/package; modules need function/input/output/interface/current/dimensions; replacement boards need compatible appliance/model, board number, function and connectors; audio/electromechanical items need model/type/impedance/power/dimensions as applicable; materials need material, dimensions, sides and thickness. Never return price, value, availability or purchasing advice.
For images, return only actual product photographs of this same WHOLE item. Exclude PDFs, datasheet/manual pages, screenshots, tables, diagrams, pinouts, schematics, logos, collages, unrelated onboard chips and generic category images. If the user supplied a photo, treat that photo as the authoritative product view and use web images only as optional alternatives.` }];
    if (image) content.push({ type: 'input_image', image_url: image, detail: 'high' });
    const client = openAI();
    const response = await client.responses.create({
      model: SMART_MANAGER_MODEL, store: false,
      tools: [{ type: 'web_search', search_content_types: ['image', 'text'], image_settings: { max_results: 6, caption: true } }] as never,
      include: ['web_search_call.action.sources', 'web_search_call.results'] as never,
      input: [{ role: 'user', content }] as never,
      text: { format: { type: 'json_schema', name: 'verified_component', strict: true, schema: categorySchema } },
    });
    let result = parseJson<Result>(response.output_text);
    if (!result.partNumber.trim() || placeholderIdentity.test(result.partNumber.trim())) {
      const recovery = await client.responses.create({
        model: SMART_MANAGER_MODEL, store: false,
        tools: [{ type: 'web_search', search_content_types: ['image', 'text'], image_settings: { max_results: 8, caption: true } }] as never,
        include: ['web_search_call.action.sources', 'web_search_call.results'] as never,
        input: [{ role: 'user', content: [
          { type: 'input_text', text: `The first search failed by calling this item "${result.partNumber || 'unknown'}". Perform a visual-forensic recovery search for the complete sellable product shown. It is acceptable for a commodity module to have no brand or printed model. Match the board layout, PCB colour, number and position of terminals, controls, capacitors, semiconductors and connectors against actual online product photographs. Search multiple descriptive queries and verify the standardized functional product family. Return a concise functional partNumber, never Unknown/Unmarked/Not identified. Do not infer electrical ratings from appearance when visually identical revisions have different specifications; put those conflicts in warnings. ${managedCategories.length ? `Use exactly one managed category: ${managedCategories.join(' | ')}.` : ''}` },
          ...(image ? [{ type: 'input_image', image_url: image, detail: 'high' }] : []),
        ] } as never],
        text: { format: { type: 'json_schema', name: 'recovered_component', strict: true, schema: categorySchema } },
      });
      const recovered = parseJson<Result>(recovery.output_text);
      if (recovered.partNumber.trim() && !placeholderIdentity.test(recovered.partNumber.trim())) result = recovered;
    }
    result.confidence = result.confidence > 0 && result.confidence <= 1 ? Math.round(result.confidence * 100) : Math.round(result.confidence);
    if (!result.partNumber.trim() || placeholderIdentity.test(result.partNumber.trim())) { result.verified = false; result.confidence = Math.min(result.confidence, 35); }
    result.datasheetUrl = safeHttpUrl(result.datasheetUrl);
    result.sources = result.sources.map((source) => ({ ...source, url: safeHttpUrl(source.url) })).filter((source) => source.url);
    const searchedImages = (response.output as unknown as Array<Record<string, unknown>>).flatMap((item) => {
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
    const failure = error as { status?: number; code?: string; type?: string; message?: string };
    console.error('smart-manager.enrich.failed', { requestId, status: failure.status, code: failure.code, type: failure.type, message: failure.message });
    if (failure.status === 429 && ['credit_balance_exhausted', 'insufficient_quota'].includes(failure.code || failure.type || '')) {
      return NextResponse.json({ success: false, code: 'AI_CREDITS_EXHAUSTED', message: 'Online verification is temporarily unavailable because the OpenAI API credit balance is exhausted. Add API credits, then retry this component.', requestId }, { status: 503 });
    }
    if (failure.status === 429) return NextResponse.json({ success: false, code: 'AI_RATE_LIMITED', message: 'Online verification is temporarily rate-limited. Wait briefly, then retry.', requestId }, { status: 429 });
    return NextResponse.json({ success: false, code: 'VERIFICATION_FAILED', message: 'Internet verification failed. Please retry; your component remains in the queue.', requestId }, { status: 500 });
  } finally {
    await deleteBlobSafely(temporaryBlob);
  }
}
