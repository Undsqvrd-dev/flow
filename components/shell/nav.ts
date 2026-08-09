import {
  LayoutDashboard,
  Columns3,
  Timer,
  Inbox,
  Target,
  Dumbbell,
  BarChart3,
  Settings,
} from 'lucide-react';

export const MENU = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/board', label: 'Weekbord', icon: Columns3 },
  { href: '/focus', label: 'Timer', icon: Timer },
  { href: '/dump', label: 'Inspiratie', icon: Inbox },
  { href: '/goals', label: 'Doelen', icon: Target },
  { href: '/sport', label: 'Sport', icon: Dumbbell },
] as const;

export const ALGEMEEN = [
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Instellingen', icon: Settings },
] as const;

export const NAV_ITEMS = [...MENU, ...ALGEMEEN];
