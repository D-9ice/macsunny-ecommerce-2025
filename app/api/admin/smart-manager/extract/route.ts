import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { extractSchema, openAI, parseJson, SMART_MANAGER_MODEL, uniqueIdentifiers } from '@/app/lib/super-smart-manager';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  if ((await cookies()).get('ms_admin')?.value !== '1') return NextResponse.json({ success: false, message: 'Unauthorized', requestId }, { status: 401 });
  try {
    const { image } = await request.json();
    const isImage = typeof image === 'string' && /^data:image\/(jpeg|png|webp);base64,/i.test(image);
    const isDocument = typeof image === 'string' && /^data:(application\/pdf|text\/csv|text\/plain);base64,/i.test(image);
    if ((!isImage && !isDocument) || image.length > 14_000_000) {
      return NextResponse.json({ success: false, message: 'Upload a JPG, PNG, WebP, PDF, CSV, or text file smaller than 10 MB.', requestId }, { status: 400 });
    }
    const response = await openAI().responses.create({
      model: SMART_MANAGER_MODEL, store: false,
      input: [{ role: 'user', content: [
        { type: 'input_text', text: 'Read this electronic-parts list or component label. Extract only component names and part numbers. Preserve meaningful suffixes, remove quantities/table headings, and do not invent unreadable text. Return each distinct identifier once.' },
        isImage ? { type: 'input_image', image_url: image, detail: 'high' } : { type: 'input_file', filename: isDocument && image.startsWith('data:application/pdf') ? 'parts.pdf' : 'parts.txt', file_data: image },
      ] } as never],
      text: { format: { type: 'json_schema', name: 'component_list', strict: true, schema: extractSchema } },
    });
    const parsed = parseJson<{ parts: Array<{ identifier: string }> }>(response.output_text);
    const parts = uniqueIdentifiers(parsed.parts.map((part) => part.identifier));
    return NextResponse.json({ success: true, parts, count: parts.length, requestId });
  } catch (error) {
    console.error('smart-manager.extract.failed', { requestId, error });
    return NextResponse.json({ success: false, message: 'The list could not be read. Try a clearer, tightly cropped image.', requestId }, { status: 500 });
  }
}
