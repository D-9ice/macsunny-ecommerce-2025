import 'server-only';

import { cookies } from 'next/headers';
import { adminCookieName, verifyAdminSessionToken } from '@/app/lib/adminSession';

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(adminCookieName())?.value);
}

export async function isAdminRequestAuthenticated(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const targetName = adminCookieName();
  const token = cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${targetName}=`))
    ?.slice(targetName.length + 1);

  return verifyAdminSessionToken(token ? decodeURIComponent(token) : null);
}
