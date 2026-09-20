'use client';

import { useRouter } from 'next/navigation';
import SmartProductManager from '@/app/components/SmartProductManager';

export default function InventoryPage() {
  const router = useRouter();
  return <SmartProductManager onComplete={() => undefined} onClose={() => router.push('/admin/dashboard')} />;
}
