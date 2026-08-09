'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Leaf, X } from 'lucide-react';
import { useUiStore } from '@/stores/useUiStore';
import { ALGEMEEN, MENU } from '@/components/shell/nav';
import { cn } from '@/lib/utils';

export function MobileMenu() {
  const open = useUiStore((s) => s.mobileNavOpen);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-txt/40"
        aria-label="Menu sluiten"
        onClick={() => setOpen(false)}
      />
      <aside className="absolute inset-y-0 left-0 flex w-[min(288px,86vw)] flex-col bg-surface shadow-soft-lg">
        <div className="flex items-center justify-between border-b border-line px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-green text-white">
              <Leaf size={17} strokeWidth={2} />
            </span>
            <span className="text-[17px] font-bold tracking-tight text-txt">FLOW</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-muted hover:bg-surface-2 cursor-pointer"
            aria-label="Sluiten"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mobiel menu">
          <p className="panel-label mb-2 px-2">Menu</p>
          <ul className="flex flex-col gap-0.5">
            {MENU.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-medium',
                      active ? 'bg-green-50 text-green' : 'text-txt-2 hover:bg-surface-2',
                    )}
                  >
                    <Icon size={18} strokeWidth={1.75} className={active ? 'text-green' : 'text-muted'} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="panel-label mb-2 mt-6 px-2">Algemeen</p>
          <ul className="flex flex-col gap-0.5">
            {ALGEMEEN.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-medium',
                      active ? 'bg-green-50 text-green' : 'text-txt-2 hover:bg-surface-2',
                    )}
                  >
                    <Icon size={18} strokeWidth={1.75} className={active ? 'text-green' : 'text-muted'} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
