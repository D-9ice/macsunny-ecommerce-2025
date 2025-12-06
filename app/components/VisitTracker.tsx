'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageVisit } from '@/app/lib/analytics';

export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    // Track the page visit
    trackPageVisit(pathname);
  }, [pathname]);

  // This component doesn't render anything
  return null;
}
