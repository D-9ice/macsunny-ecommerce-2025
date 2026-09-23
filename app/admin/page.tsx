import { isAdminAuthenticated } from '@/app/lib/adminAuth';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const isAuthenticated = await isAdminAuthenticated();

  if (isAuthenticated) {
    redirect('/admin/dashboard');
  } else {
    redirect('/admin/login');
  }
}