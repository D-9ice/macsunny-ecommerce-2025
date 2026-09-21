import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { connectDB, SiteSettingsModel } from '@/app/lib/mongodb';
import { DEFAULT_SITE_THEME, sanitizeSiteTheme } from '@/app/lib/siteTheme';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const doc = await SiteSettingsModel.findOne({ singletonKey: 'site' }).lean() as any;
    const theme = sanitizeSiteTheme(doc?.theme, DEFAULT_SITE_THEME);

    return NextResponse.json(
      { success: true, theme },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('site.settings.read.failed', { error });
    return NextResponse.json(
      { success: false, message: 'Site settings are temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    if (cookieStore.get('ms_admin')?.value !== '1') {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const theme = sanitizeSiteTheme(body?.theme, DEFAULT_SITE_THEME);

    await connectDB();
    await SiteSettingsModel.findOneAndUpdate(
      { singletonKey: 'site' },
      { $set: { theme } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json(
      { success: true, theme },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    console.error('site.settings.write.failed', { error });
    return NextResponse.json(
      { success: false, message: 'Site settings could not be saved.' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
