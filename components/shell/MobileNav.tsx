'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Columns3, Timer, Inbox, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/board', label: 'Bord', icon: Columns3 },
  { href: '/focus', label: 'Timer', icon: Timer },
  { href: '/dump', label: 'Inspiratie', icon: Inbox },
  { href: '/goals', label: 'Doelen', icon: Target },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
              active ? 'text-green' : 'text-muted',
            )}
          >
            <Icon size={19} strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
