'use client';

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-[10px] border border-line bg-surface-2 px-3 text-sm text-txt',
          'placeholder:text-muted-2 outline-none transition-colors duration-150',
          'focus:border-green focus:bg-surface',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          'w-full rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-sm text-txt',
          'placeholder:text-muted-2 outline-none transition-colors duration-150 resize-none',
          'focus:border-green focus:bg-surface',
          className,
        )}
        {...props}
      />
    );
  },
);
