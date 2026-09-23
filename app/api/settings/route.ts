import { NextResponse } from 'next/server';
import { connectDB, SiteSettingsModel } from '@/app/lib/mongodb';
import { DEFAULT_SITE_THEME, sanitizeSiteTheme } from '@/app/lib/siteTheme';
import { isAdminAuthenticated } from '@/app/lib/adminAuth';
import { rateAllowed, readBoundedJson, sameOrigin } from '@/app/lib/requestSecurity';

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
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }
    if (!sameOrigin(request)) {
      return NextResponse.json({ success: false, message: 'Unexpected request origin.' }, { status: 403 });
    }
    if (!rateAllowed(request, 'admin-theme-write', 20, 5 * 60_000)) {
      return NextResponse.json({ success: false, message: 'Too many theme update requests.' }, { status: 429 });
    }

    const parsed = await readBoundedJson(request, 8 * 1024);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: parsed.status });
    }
    const theme = sanitizeSiteTheme(parsed.value?.theme, DEFAULT_SITE_THEME);

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
