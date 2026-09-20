import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { extractSchema, openAI, parseJson, SMART_MANAGER_MODEL, uniqueIdentifiers, visualIdentitySchema } from '@/app/lib/super-smart-manager';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if ((await cookies()).get('ms_admin')?.value !== '1') return NextResponse.json({ success: false, message: 'Unauthorized', requestId }, { status: 401 });
  try {
    const { image, mode = 'list' } = await request.json();
    const isImage = typeof image === 'string' && /^data:image\/(jpeg|png|webp);base64,/i.test(image);
    const isDocument = typeof image === 'string' && /^data:(application\/pdf|text\/csv|text\/plain);base64,/i.test(image);
    if ((!isImage && !isDocument) || image.length > 14_000_000) {
      return NextResponse.json({ success: false, message: 'Upload a JPG, PNG, WebP, PDF, CSV, or text file smaller than 10 MB.', requestId }, { status: 400 });
    }
    const objectMode = mode === 'object' && isImage;
    const response = await openAI().responses.create({
      model: SMART_MANAGER_MODEL, store: false,
      input: [{ role: 'user', content: [
        { type: 'input_text', text: objectMode ? `Identify the PRIMARY SELLABLE OBJECT represented by the entire photograph.
Use this strict hierarchy: complete appliance or kit > replacement/control board > assembled module/development board > discrete component. Never identify an IC mounted on a board as the product unless the photograph is clearly of that loose IC alone. On-board chip markings are supporting evidence only.
Cover the full electronics inventory range: resistors and other passives, semiconductors, modules, development boards, replacement PCBs, display assemblies, audio equipment, microphones, speaker parts and voice coils, appliances, tools, accessories, and PCB materials.
For boards, use the appliance/model label, PCB silkscreen and board number. For modules, identify the module's function and module model, not its controller chip. For resistors, use body style and colour bands but state uncertainty when bands are unreadable. For kits or grouped products, identify the complete kit. Do not invent a model or marking.
primaryIdentity must be a concise inventory-ready identity. searchQuery must describe this same whole object for web verification.` : 'Read this electronic-parts list or component label. Extract only component names and part numbers. Preserve meaningful suffixes, remove quantities/table headings, and do not invent unreadable text. Return each distinct identifier once.' },
        isImage ? { type: 'input_image', image_url: image, detail: 'high' } : { type: 'input_file', filename: isDocument && image.startsWith('data:application/pdf') ? 'parts.pdf' : 'parts.txt', file_data: image },
      ] } as never],
      text: { format: { type: 'json_schema', name: objectMode ? 'visual_product_identity' : 'component_list', strict: true, schema: objectMode ? visualIdentitySchema : extractSchema } },
    });
    if (objectMode) {
      const identity = parseJson<Record<string, unknown>>(response.output_text);
      return NextResponse.json({ success: true, identity, requestId });
    }
    const parsed = parseJson<{ parts: Array<{ identifier: string }> }>(response.output_text);
    const parts = uniqueIdentifiers(parsed.parts.map((part) => part.identifier));
    return NextResponse.json({ success: true, parts, count: parts.length, requestId });
  } catch (error) {
    console.error('smart-manager.extract.failed', { requestId, error });
    return NextResponse.json({ success: false, message: 'The list could not be read. Try a clearer, tightly cropped image.', requestId }, { status: 500 });
  }
}
