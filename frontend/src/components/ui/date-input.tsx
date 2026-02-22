'use client';

import { useState, useEffect, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface DateInputProps {
  id?: string;
  value?: string;   // YYYY-MM-DD (react-hook-form internal value)
  onChange?: (value: string) => void; // emits YYYY-MM-DD or '' when incomplete
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
}

function isoToDisplay(iso: string): string {
  if (!iso || iso.length < 10) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

function displayToISO(digits: string): string {
  if (digits.length < 8) return '';
  const d = digits.slice(0, 2);
  const m = digits.slice(2, 4);
  const y = digits.slice(4, 8);
  return `${y}-${m}-${d}`;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ id, value = '', onChange, onBlur, error, disabled }, ref) => {
    const [display, setDisplay] = useState(() => isoToDisplay(value));

    // Sync when external value changes (pre-fill on edit, form reset)
    useEffect(() => {
      setDisplay(isoToDisplay(value));
    }, [value]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const digits = e.target.value.replace(/\D/g, '').slice(0, 8);

      let formatted = digits;
      if (digits.length > 4) {
        formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
      } else if (digits.length > 2) {
        formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
      }

      setDisplay(formatted);
      onChange?.(digits.length === 8 ? displayToISO(digits) : '');
    }

    return (
      <div className="w-full">
        <input
          ref={ref}
          id={id}
          type="text"
          inputMode="numeric"
          value={display}
          onChange={handleChange}
          onBlur={onBlur}
          disabled={disabled}
          placeholder="DD/MM/AAAA"
          maxLength={10}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
        />
        {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      </div>
    );
  }
);

DateInput.displayName = 'DateInput';
