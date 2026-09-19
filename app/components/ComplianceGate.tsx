'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, LockKeyhole, Wrench } from 'lucide-react';

type State = { mode: 'ACTIVE' | 'WARNING' | 'SERVICE_LOCKED'; warningEndsAt: string | null; message?: string };
function remaining(end: string | null) {
  if (!end) return '';
  const ms = Math.max(0, new Date(end).getTime() - Date.now());
  const days = Math.floor(ms / 86400000), hours = Math.floor(ms / 3600000) % 24, mins = Math.floor(ms / 60000) % 60, secs = Math.floor(ms / 1000) % 60;
  return `${days}d ${hours}h ${mins}m ${secs}s`;
}

export default function ComplianceGate() {
  const path = usePathname();
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [, tick] = useState(0);
  const exempt = path.startsWith('/service-console') || path.startsWith('/admin');
  useEffect(() => { fetch('/api/service-guard/status', { cache: 'no-store' }).then(r => r.json()).then(d => d.success && setState(d)).catch(() => {}); }, [path]);
  useEffect(() => { const timer = setInterval(() => tick(v => v + 1), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        router.push('/admin');
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.shiftKey && e.key.toLowerCase() === 'u') { e.preventDefault(); router.push('/service-console'); }
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [router]);
  if (!state || exempt) return null;
  if (state.mode === 'SERVICE_LOCKED') return <div className="service-lock" role="main"><div className="service-lock__shade" /><div className="service-lock__panel"><div className="service-lock__icon"><Wrench size={32} /><LockKeyhole size={24} /></div><p className="service-lock__eyebrow">Engineering mode</p><h1>MacSunny Electronics Is Temporarily Under Service Update</h1><p>We are performing important technical improvements to keep the platform secure, stable, and reliable. Please check back shortly.</p>{state.message && <p className="service-lock__note">{state.message}</p>}<div className="service-lock__contact"><a href="tel:+233243380902">024 338 0902</a><span>•</span><a href="tel:+233249135208">024 913 5208</a><span>•</span><a href="https://wa.me/233551507985">WhatsApp support</a></div></div><footer>© {new Date().getFullYear()} MacSunny Electronics</footer></div>;
  if (state.mode === 'WARNING') {
    const ms = state.warningEndsAt ? new Date(state.warningEndsAt).getTime() - Date.now() : Infinity;
    const title = ms <= 86400000 ? 'FINAL WARNING' : ms <= 3 * 86400000 ? 'URGENT SITE UPDATE REQUIRED' : 'UPDATE YOUR SITE';
    return <aside className="compliance-warning" role="status" aria-live="polite"><AlertTriangle size={18} /><strong>{title}</strong><span>{remaining(state.warningEndsAt)}</span></aside>;
  }
  return null;
}
