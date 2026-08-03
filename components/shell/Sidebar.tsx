'use client';

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Columns3, Timer, Inbox, Target, Dumbbell, BarChart3, Settings,
  Sun, Moon, Monitor, Leaf, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Tooltip } from '@/components/ui/tooltip';
import { useUiStore } from '@/stores/useUiStore';
import { cn } from '@/lib/utils';

const MENU = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/board', label: 'Weekbord', icon: Columns3 },
  { href: '/focus', label: 'Timer', icon: Timer },
  { href: '/dump', label: 'Inspiratie', icon: Inbox },
  { href: '/goals', label: 'Doelen', icon: Target },
  { href: '/sport', label: 'Sport', icon: Dumbbell },
];

const ALGEMEEN = [
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Instellingen', icon: Settings },
];

const NAV_ITEMS = [...MENU, ...ALGEMEEN];

function NavItem({ href, label, icon: Icon, active, tabIndex, itemRef, collapsed }: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  tabIndex: number;
  itemRef: (el: HTMLAnchorElement | null) => void;
  collapsed: boolean;
}) {
  const link = (
    <Link
      ref={itemRef}
      href={href}
      tabIndex={tabIndex}
      className={cn(
        'relative flex items-center rounded-[10px] text-sm font-medium transition-colors duration-150',
        'outline-none focus-visible:ring-2 focus-visible:ring-green/40',
        collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2',
        active ? 'bg-green-50 text-green' : 'text-txt-2 hover:bg-surface-2',
      )}
    >
      {active && !collapsed && (
        <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-pill bg-green" />
      )}
      <Icon size={18} strokeWidth={1.75} className={active ? 'text-green' : 'text-muted'} />
      {!collapsed && label}
    </Link>
  );

  if (collapsed) {
    return <Tooltip content={label} side="right">{link}</Tooltip>;
  }
  return link;
}

function ThemeSwitcher({ collapsed }: { collapsed: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const options = [
    { value: 'light', icon: Sun, label: 'Licht' },
    { value: 'dark', icon: Moon, label: 'Donker' },
    { value: 'system', icon: Monitor, label: 'Systeem' },
  ] as const;

  const active = mounted ? theme : undefined;

  if (collapsed) {
    const current = options.find((o) => o.value === active) ?? options[2];
    const next = options[(options.findIndex((o) => o.value === active) + 1) % options.length];
    return (
      <Tooltip content={`Thema: ${current.label}`} side="right">
        <button
          type="button"
          onClick={() => setTheme(next.value)}
          className="flex w-full items-center justify-center rounded-[10px] py-2.5 text-muted hover:bg-surface-2 hover:text-txt-2 cursor-pointer"
          aria-label="Thema wisselen"
        >
          <current.icon size={18} strokeWidth={1.75} />
        </button>
      </Tooltip>
    );
  }

  return (
    <div className="rounded-card border border-line bg-surface-2 p-2">
      <p className="panel-label mb-1.5 px-1">Thema</p>
      <div className="flex gap-1">
        {options.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            type="button"
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              'flex flex-1 items-center justify-center rounded-[8px] py-1.5 transition-colors duration-150 cursor-pointer',
              active === value ? 'bg-surface text-green shadow-soft-sm' : 'text-muted hover:text-txt-2',
            )}
          >
            <Icon size={16} strokeWidth={1.75} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [focusIndex, setFocusIndex] = useState(() => {
    const i = NAV_ITEMS.findIndex((item) => pathname.startsWith(item.href));
    return i >= 0 ? i : 0;
  });

  useEffect(() => {
    const i = NAV_ITEMS.findIndex((item) => pathname.startsWith(item.href));
    if (i >= 0) setFocusIndex(i);
  }, [pathname]);

  function moveFocus(next: number) {
    const clamped = Math.max(0, Math.min(NAV_ITEMS.length - 1, next));
    setFocusIndex(clamped);
    itemRefs.current[clamped]?.focus();
  }

  function onNavKeyDown(e: ReactKeyboardEvent<HTMLElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      moveFocus(focusIndex + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      moveFocus(focusIndex - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      moveFocus(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      moveFocus(NAV_ITEMS.length - 1);
    } else if (e.key === ' ') {
      e.preventDefault();
      router.push(NAV_ITEMS[focusIndex].href);
    }
  }

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-line bg-surface py-5 transition-[width] duration-200 md:flex',
        collapsed ? 'w-[68px] px-2' : 'w-[232px] px-4',
      )}
    >
      <div className={cn('mb-7 flex items-center', collapsed ? 'justify-center' : 'gap-2 px-2')}>
        <div className="group relative flex min-w-0 items-center gap-2">
          <Tooltip content={collapsed ? 'Menu uitklappen' : 'Menu inklappen'} side={collapsed ? 'right' : 'bottom'}>
            <button
              type="button"
              onClick={toggleSidebar}
              className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-green text-white cursor-pointer"
              aria-label={collapsed ? 'Menu uitklappen' : 'Menu inklappen'}
              aria-expanded={!collapsed}
            >
              <Leaf
                size={17}
                strokeWidth={2}
                className="transition-opacity duration-150 group-hover:opacity-0"
              />
              <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                {collapsed
                  ? <PanelLeftOpen size={17} strokeWidth={2} />
                  : <PanelLeftClose size={17} strokeWidth={2} />}
              </span>
            </button>
          </Tooltip>
          {!collapsed && (
            <Link href="/dashboard" className="text-[17px] font-bold tracking-tight text-txt">
              FLOW
            </Link>
          )}
        </div>
      </div>

      {!collapsed && <p className="panel-label mb-2 px-3">Menu</p>}
      <nav
        className="flex flex-col gap-0.5"
        aria-label="Hoofdmenu"
        onKeyDown={onNavKeyDown}
      >
        {MENU.map((item, i) => (
          <NavItem
            key={item.href}
            {...item}
            collapsed={collapsed}
            active={pathname.startsWith(item.href)}
            tabIndex={focusIndex === i ? 0 : -1}
            itemRef={(el) => { itemRefs.current[i] = el; }}
          />
        ))}
      </nav>

      {!collapsed && <p className="panel-label mb-2 mt-6 px-3">Algemeen</p>}
      {collapsed && <div className="my-3 mx-2 border-t border-line" />}
      <nav
        className={cn('flex flex-col gap-0.5', !collapsed && 'mt-0')}
        aria-label="Algemeen"
        onKeyDown={onNavKeyDown}
      >
        {ALGEMEEN.map((item, i) => {
          const index = MENU.length + i;
          return (
            <NavItem
              key={item.href}
              {...item}
              collapsed={collapsed}
              active={pathname.startsWith(item.href)}
              tabIndex={focusIndex === index ? 0 : -1}
              itemRef={(el) => { itemRefs.current[index] = el; }}
            />
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <ThemeSwitcher collapsed={collapsed} />
      </div>
    </aside>
  );
}
