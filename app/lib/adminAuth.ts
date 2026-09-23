import 'server-only';

import { cookies } from 'next/headers';
import { adminCookieName, verifyAdminSessionToken } from '@/app/lib/adminSession';

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(adminCookieName())?.value);
}
