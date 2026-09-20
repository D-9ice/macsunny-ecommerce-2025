import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { extractSchema, openAI, parseJson, SMART_MANAGER_MODEL, uniqueIdentifiers, visualIdentitySchema } from '@/app/lib/super-smart-manager';
import { deleteBlobSafely, uploadAnalysisWebp } from '@/lib/images';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if ((await cookies()).get('ms_admin')?.value !== '1') return NextResponse.json({ success: false, message: 'Unauthorized', requestId }, { status: 401 });
  let temporaryBlob: string | undefined;
  let openAIFileId: string | undefined;
  try {
    const form = await request.formData();
    const file = form.get('file');
    const mode = String(form.get('mode') || 'list');
    if (!(file instanceof File) || !file.size || file.size > 3_000_000) return NextResponse.json({ success: false, message: 'Upload a WebP, PDF, CSV, or text file smaller than 3 MB.', requestId }, { status: 400 });
    const isImage = file.type === 'image/webp';
    const isDocument = ['application/pdf', 'text/csv', 'text/plain'].includes(file.type);
    if (!isImage && !isDocument) return NextResponse.json({ success: false, message: 'Images must be WebP. Documents must be PDF, CSV, or text.', requestId }, { status: 415 });
    const objectMode = mode === 'object' && isImage;
    const client = openAI();
    let attachment: Record<string, unknown>;
    if (isImage) {
      const uploaded = await uploadAnalysisWebp(file);
      temporaryBlob = uploaded.pathname;
      attachment = { type: 'input_image', image_url: uploaded.url, detail: 'high' };
    } else {
      const uploaded = await client.files.create({ file, purpose: 'user_data' });
      openAIFileId = uploaded.id;
      attachment = { type: 'input_file', file_id: uploaded.id };
    }
    const response = await client.responses.create({
      model: SMART_MANAGER_MODEL, store: false,
      input: [{ role: 'user', content: [
        { type: 'input_text', text: objectMode ? `Identify the PRIMARY SELLABLE OBJECT represented by the entire photograph.
Use this strict hierarchy: complete appliance or kit > replacement/control board > assembled module/development board > discrete component. Never identify an IC mounted on a board as the product unless the photograph is clearly of that loose IC alone. On-board chip markings are supporting evidence only.
Cover the full electronics inventory range: resistors and other passives, semiconductors, modules, development boards, replacement PCBs, display assemblies, audio equipment, microphones, speaker parts and voice coils, appliances, tools, accessories, and PCB materials.
For boards, use the appliance/model label, PCB silkscreen and board number. For modules, identify the module's function and module model, not its controller chip. For resistors, use body style and colour bands but state uncertainty when bands are unreadable. For kits or grouped products, identify the complete kit. Do not invent a model or marking.
Many commodity modules intentionally have no printed manufacturer model. Lack of a marking does NOT make them unidentified: recognize their standardized functional product family from layout, terminals, controls and components, then use a concise functional inventoryIdentifier (for example, "PWM brushed DC motor speed controller module"). Include voltage, current, power or frequency in the identity only when it is legible on the photographed product; visually identical commodity revisions often have different ratings. Keep brand/model empty when unknown, but never use "unknown" as inventoryIdentifier when the functional module type is visually recognizable.
If a photograph contains several identical loose components, identify ONE singular component type; do not call it a lot, pack, set, or assortment. picturedItemCount records how many are visible, but quantity must never become part of the identity, product name, part number, or SKU. A true product kit remains a kit.
inventoryIdentifier must be a short stable engineering identity: use the exact visible model/part number when available; otherwise use normalized electrical identity such as "1 kOhm 5% axial resistor". Never place a sentence or description in this field. primaryIdentity must be a concise singular product name. searchQuery must describe one matching item for web verification. displayImageSuitable is true only when the photo shows exactly one complete sellable item (a genuine kit counts as one); it must be false for repeated loose components, collages, datasheets, diagrams, cropped parts, or unclear images.` : 'Read this electronic-parts list or component label. Extract only component names and part numbers. Preserve meaningful suffixes, remove quantities/table headings, and do not invent unreadable text. Return each distinct identifier once.' },
        attachment,
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
  } finally {
    await deleteBlobSafely(temporaryBlob);
    if (openAIFileId) try { await openAI().files.delete(openAIFileId); } catch (error) { console.error('smart-manager.openai-file.cleanup.failed', { requestId, error }); }
  }
}
