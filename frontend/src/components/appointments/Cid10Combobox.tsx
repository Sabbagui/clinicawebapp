'use client';

import { useEffect, useRef, useState } from 'react';
import cid10Data from '@/data/cid10.json';

interface Cid10Entry {
  code: string;
  description: string;
}

const CID10: Cid10Entry[] = cid10Data as Cid10Entry[];

interface Cid10ComboboxProps {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function Cid10Combobox({ value, onChange, disabled }: Cid10ComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = CID10.find((e) => e.code === value);

  const filtered = query.length < 2
    ? []
    : CID10.filter(
        (e) =>
          e.code.toLowerCase().includes(query.toLowerCase()) ||
          e.description.toLowerCase().includes(query.toLowerCase()),
      ).slice(0, 50);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (entry: Cid10Entry) => {
    onChange(entry.code);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative">
      {selected && !open ? (
        <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
          <span className="font-mono text-primary">{selected.code}</span>
          <span className="flex-1 truncate text-muted-foreground">— {selected.description}</span>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-auto text-muted-foreground hover:text-foreground"
              aria-label="Limpar CID-10"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <input
          type="text"
          disabled={disabled}
          placeholder="Digite código ou descrição (ex: N92 ou menstruação)…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
      )}

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {filtered.map((entry) => (
            <li key={entry.code}>
              <button
                type="button"
                onClick={() => handleSelect(entry)}
                className="flex w-full gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="font-mono text-primary">{entry.code}</span>
                <span className="truncate text-muted-foreground">— {entry.description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
