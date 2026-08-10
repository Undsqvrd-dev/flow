'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

/** Textarea die meegroeit met de inhoud (geen vaste scrollbar). */
export const AutoTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { minRows?: number }
>(function AutoTextarea({ className, minRows = 2, value, onChange, ...props }, ref) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLTextAreaElement);

  function resize() {
    const el = innerRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    resize();
  }, [value]);

  return (
    <textarea
      ref={innerRef}
      rows={minRows}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        requestAnimationFrame(resize);
      }}
      className={cn(
        'w-full overflow-hidden rounded-[10px] border border-line bg-surface-2 px-3 py-2 text-sm text-txt',
        'placeholder:text-muted-2 outline-none transition-colors duration-150 resize-none',
        'focus:border-green focus:bg-surface',
        className,
      )}
      {...props}
    />
  );
});
