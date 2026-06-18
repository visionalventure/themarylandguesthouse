'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, User, Calendar, Home, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  category: 'guest' | 'reservation' | 'room';
  href: string;
}

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  guest: <User className="w-4 h-4" />,
  reservation: <Calendar className="w-4 h-4" />,
  room: <Home className="w-4 h-4" />,
};

const CATEGORY_LABEL: Record<string, string> = {
  guest: 'Guests',
  reservation: 'Reservations',
  room: 'Rooms',
};

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const [guestsRes, reservationsRes, roomsRes] = await Promise.allSettled([
        api.get('/v1/guests', { params: { search: q, limit: 4 } }),
        api.get('/v1/reservations', { params: { search: q, limit: 4 } }),
        api.get('/v1/rooms', { params: { search: q, limit: 4 } }),
      ]);

      const items: SearchResult[] = [];

      if (guestsRes.status === 'fulfilled') {
        const guests = guestsRes.value.data?.guests ?? guestsRes.value.data ?? [];
        (Array.isArray(guests) ? guests : []).slice(0, 4).forEach((g: any) => {
          items.push({
            id: g.id,
            label: `${g.firstName} ${g.lastName}`,
            sublabel: g.email,
            category: 'guest',
            href: `/guests?id=${g.id}`,
          });
        });
      }

      if (reservationsRes.status === 'fulfilled') {
        const reservations = reservationsRes.value.data?.reservations ?? reservationsRes.value.data ?? [];
        (Array.isArray(reservations) ? reservations : []).slice(0, 4).forEach((r: any) => {
          items.push({
            id: r.id,
            label: r.confirmationNumber ?? r.id.slice(0, 8).toUpperCase(),
            sublabel: r.guest ? `${r.guest.firstName} ${r.guest.lastName}` : undefined,
            category: 'reservation',
            href: `/reservations?id=${r.id}`,
          });
        });
      }

      if (roomsRes.status === 'fulfilled') {
        const rooms = roomsRes.value.data?.rooms ?? roomsRes.value.data ?? [];
        (Array.isArray(rooms) ? rooms : []).slice(0, 4).forEach((rm: any) => {
          items.push({
            id: rm.id,
            label: `Room ${rm.number}`,
            sublabel: rm.type,
            category: 'room',
            href: `/rooms?id=${rm.id}`,
          });
        });
      }

      setResults(items);
      setOpen(items.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard: Cmd+K to focus
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      navigate(results[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const navigate = (result: SearchResult) => {
    setQuery('');
    setOpen(false);
    router.push(result.href);
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {});

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        {loading ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setActiveIndex(-1); }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search guests, reservations, rooms… (⌘K)"
          className="w-full pl-9 pr-4 py-2 text-sm bg-muted rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border/50">
                {CATEGORY_LABEL[category]}
              </div>
              {items.map((r, idx) => {
                const globalIdx = results.indexOf(r);
                return (
                  <button
                    key={r.id}
                    className={cn(
                      'w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-muted/60 transition-colors',
                      activeIndex === globalIdx && 'bg-muted/60',
                    )}
                    onMouseEnter={() => setActiveIndex(globalIdx)}
                    onClick={() => navigate(r)}
                  >
                    <span className="text-muted-foreground shrink-0">
                      {CATEGORY_ICON[category]}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.label}</p>
                      {r.sublabel && (
                        <p className="text-xs text-muted-foreground truncate">{r.sublabel}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
