import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const isAuthenticated = cookieStore.get('ms_admin')?.value === '1';

  if (isAuthenticated) {
    redirect('/admin/dashboard');
  } else {
    redirect('/admin/login');
  }
}