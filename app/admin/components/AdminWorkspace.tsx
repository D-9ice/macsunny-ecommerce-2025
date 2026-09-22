'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, LayoutDashboard, Palette, PackageSearch, Search, Truck, Store } from 'lucide-react';

type AdminWorkspaceProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
};

const items = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/inventory', label: 'Super Smart Manager', icon: Boxes },
  { href: '/admin/orders', label: 'Orders', icon: PackageSearch },
  { href: '/admin/equivalents', label: 'Component Equivalents', icon: Search },
  { href: '/admin/delivery-settings', label: 'Delivery Settings', icon: Truck },
  { href: '/admin/settings', label: 'System Settings', icon: Palette },
];

export default function AdminWorkspace({ title, subtitle, children, actions }: AdminWorkspaceProps) {
  const pathname = usePathname();

  return (
    <section className="fixed inset-0 z-[110] flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-violet-500/40 bg-slate-950 px-4 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="shrink-0 text-violet-300" size={21} />
            <h1 className="truncate text-base font-bold text-amber-100 sm:text-lg">{title}</h1>
          </div>
          {subtitle ? <p className="mt-0.5 truncate text-xs text-slate-400">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ml-3 flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>

      <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-800 bg-slate-950 px-3 py-2 lg:hidden" aria-label="Admin modules">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${active ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-300'}`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-950 p-3 lg:flex">
          <nav className="space-y-2" aria-label="Admin modules">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${active ? 'bg-violet-600 text-white shadow-lg shadow-violet-950/30' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-slate-800 pt-3">
            <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-400 hover:bg-slate-900 hover:text-white">
              <Store size={18} />
              Back to Store
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden bg-slate-900">
          <div className="h-full overflow-y-auto overscroll-contain p-4 sm:p-5 lg:p-6">
            <div className="mx-auto w-full max-w-[1500px]">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
