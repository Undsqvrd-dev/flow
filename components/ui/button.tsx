'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-green text-white hover:brightness-105 shadow-soft-sm',
  secondary: 'bg-surface text-txt border border-line-2 hover:bg-surface-2',
  ghost: 'text-txt-2 hover:bg-surface-3',
  dark: 'bg-green-900 text-white hover:brightness-110',
  danger: 'text-red hover:bg-red/10',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
  icon: 'h-8 w-8 p-0 justify-center',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', size = 'md', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill font-medium transition-colors duration-150',
        'disabled:pointer-events-none disabled:opacity-50 cursor-pointer whitespace-nowrap',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
