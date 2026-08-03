'use client';

import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export function Switch({ checked, onCheckedChange, className }: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        'relative h-5.5 w-9.5 shrink-0 cursor-pointer rounded-pill border border-transparent transition-colors duration-150',
        checked ? 'bg-green' : 'bg-line-2',
        className,
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block h-4.5 w-4.5 translate-x-0.5 rounded-pill bg-white shadow-soft-sm transition-transform duration-150',
          checked && 'translate-x-[18px]',
        )}
      />
    </SwitchPrimitive.Root>
  );
}
