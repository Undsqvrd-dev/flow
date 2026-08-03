'use client';

import * as Dropdown from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export const DropdownMenu = Dropdown.Root;
export const DropdownTrigger = Dropdown.Trigger;

export function DropdownContent({ children, className, align = 'end' }: {
  children: ReactNode; className?: string; align?: 'start' | 'center' | 'end';
}) {
  return (
    <Dropdown.Portal>
      <Dropdown.Content
        align={align}
        sideOffset={6}
        className={cn(
          'z-50 min-w-[190px] rounded-card border border-line bg-surface p-1.5 shadow-soft-lg',
          className,
        )}
      >
        {children}
      </Dropdown.Content>
    </Dropdown.Portal>
  );
}

export function DropdownItem({ children, className, onSelect, danger }: {
  children: ReactNode; className?: string; onSelect?: () => void; danger?: boolean;
}) {
  return (
    <Dropdown.Item
      onSelect={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-[10px] px-2.5 py-2 text-[13px] outline-none',
        danger ? 'text-red data-[highlighted]:bg-red/10' : 'text-txt-2 data-[highlighted]:bg-surface-3 data-[highlighted]:text-txt',
        className,
      )}
    >
      {children}
    </Dropdown.Item>
  );
}

export function DropdownSeparator() {
  return <Dropdown.Separator className="my-1 h-px bg-line" />;
}
