'use client';

import { useEffect, useState, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Hotel, Calendar, Users, BedDouble, DollarSign,
  Package, ShoppingCart, Users2, Wrench, Settings, Moon, Receipt,
  Plus, LogIn, LogOut, FileText, Search, Clock, Building,
  type LucideIcon,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command';
import { useAuthStore } from '@/store/auth';
import { searchApi } from '@/lib/api';
import { addRecentCommand, getRecentCommands, type RecentCommand } from '@/lib/recent-commands';

interface CommandDef {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  href?: string;
  action?: () => void;
  roles: string[];
  keywords: string;
  group: string;
}

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK', 'ACCOUNTANT',
  'HOUSEKEEPING', 'MAINTENANCE', 'RESTAURANT_STAFF', 'HR_MANAGER', 'PROCUREMENT_OFFICER'];

function buildCommands(router: ReturnType<typeof useRouter>): CommandDef[] {
  return [
    // Navigation
    { id: 'go-dashboard',    label: 'Dashboard',         icon: LayoutDashboard, href: '/dashboard',    roles: ALL_ROLES, keywords: 'home overview kpis', group: 'Navigation' },
    { id: 'go-front-desk',   label: 'Front Desk',         icon: Hotel,           href: '/front-desk',   roles: ['SUPER_ADMIN','ADMIN','MANAGER','FRONT_DESK'], keywords: 'reception check in arrival', group: 'Navigation' },
    { id: 'go-reservations', label: 'Reservations',       icon: Calendar,        href: '/reservations', roles: ['SUPER_ADMIN','ADMIN','MANAGER','FRONT_DESK'], keywords: 'bookings schedule', group: 'Navigation' },
    { id: 'go-guests',       label: 'Guests / CRM',       icon: Users,           href: '/guests',       roles: ['SUPER_ADMIN','ADMIN','MANAGER','FRONT_DESK'], keywords: 'crm customers profiles', group: 'Navigation' },
    { id: 'go-rooms',        label: 'Rooms',              icon: BedDouble,       href: '/rooms',        roles: ALL_ROLES, keywords: 'room categories housekeeping', group: 'Navigation' },
    { id: 'go-accounting',   label: 'Accounting',         icon: DollarSign,      href: '/accounting',   roles: ['SUPER_ADMIN','ADMIN','MANAGER','ACCOUNTANT'], keywords: 'finance invoices journal', group: 'Navigation' },
    { id: 'go-inventory',    label: 'Inventory',          icon: Package,         href: '/inventory',    roles: ['SUPER_ADMIN','ADMIN','MANAGER','PROCUREMENT_OFFICER'], keywords: 'stock items', group: 'Navigation' },
    { id: 'go-procurement',  label: 'Procurement',        icon: ShoppingCart,    href: '/procurement',  roles: ['SUPER_ADMIN','ADMIN','MANAGER','PROCUREMENT_OFFICER'], keywords: 'purchase orders suppliers', group: 'Navigation' },
    { id: 'go-hr',           label: 'HR',                 icon: Users2,          href: '/hr',           roles: ['SUPER_ADMIN','ADMIN','MANAGER','HR_MANAGER'], keywords: 'employees payroll leave', group: 'Navigation' },
    { id: 'go-maintenance',  label: 'Maintenance',        icon: Wrench,          href: '/maintenance',  roles: ['SUPER_ADMIN','ADMIN','MANAGER','MAINTENANCE'], keywords: 'assets repairs work orders', group: 'Navigation' },
    { id: 'go-night-audit',  label: 'Night Audit',        icon: Moon,            href: '/nightaudit',   roles: ['SUPER_ADMIN','ADMIN','MANAGER','FRONT_DESK'], keywords: 'audit end of day close', group: 'Navigation' },
    { id: 'go-settings',     label: 'Settings',           icon: Settings,        href: '/settings',     roles: ['SUPER_ADMIN','ADMIN','MANAGER'], keywords: 'config users property', group: 'Navigation' },

    // Quick Create
    { id: 'new-reservation', label: 'New Reservation',    icon: Plus,  href: '/reservations?new=1', roles: ['SUPER_ADMIN','ADMIN','MANAGER','FRONT_DESK'], keywords: 'create booking add', group: 'Quick Create' },
    { id: 'new-guest',       label: 'New Guest',          icon: Plus,  href: '/guests?new=1',       roles: ['SUPER_ADMIN','ADMIN','MANAGER','FRONT_DESK'], keywords: 'create guest add customer', group: 'Quick Create' },
    { id: 'new-invoice',     label: 'New Invoice',        icon: FileText, href: '/accounting/invoices?new=1', roles: ['SUPER_ADMIN','ADMIN','MANAGER','ACCOUNTANT'], keywords: 'create invoice billing', group: 'Quick Create' },
    { id: 'new-maintenance', label: 'New Maintenance Request', icon: Wrench, href: '/maintenance?new=1', roles: ['SUPER_ADMIN','ADMIN','MANAGER','MAINTENANCE'], keywords: 'create work order repair', group: 'Quick Create' },
    { id: 'new-po',          label: 'New Purchase Order', icon: ShoppingCart, href: '/procurement?new=1', roles: ['SUPER_ADMIN','ADMIN','MANAGER','PROCUREMENT_OFFICER'], keywords: 'create purchase order supplier', group: 'Quick Create' },

    // Front Desk
    { id: 'arrivals',        label: "Today's Arrivals",   icon: LogIn,   href: '/front-desk?tab=arrivals',   roles: ['SUPER_ADMIN','ADMIN','MANAGER','FRONT_DESK'], keywords: 'check in arriving today', group: 'Front Desk' },
    { id: 'departures',      label: "Today's Departures", icon: LogOut,  href: '/front-desk?tab=departures', roles: ['SUPER_ADMIN','ADMIN','MANAGER','FRONT_DESK'], keywords: 'check out departing today', group: 'Front Desk' },
    { id: 'run-audit',       label: 'Run Night Audit',    icon: Moon,    href: '/nightaudit',                roles: ['SUPER_ADMIN','ADMIN','MANAGER'], keywords: 'night audit close day end', group: 'Front Desk' },
    { id: 'receipts',        label: 'View Receipts',      icon: Receipt, href: '/accounting',               roles: ['SUPER_ADMIN','ADMIN','MANAGER','ACCOUNTANT'], keywords: 'payment receipts history', group: 'Front Desk' },
    { id: 'room-status',     label: 'Room Status Board',  icon: Building, href: '/rooms',                   roles: ALL_ROLES, keywords: 'rooms available occupied dirty', group: 'Front Desk' },
  ];
}

interface SearchResult {
  type: string;
  id: string;
  label: string;
  sub?: string;
  href: string;
}

interface CommandBarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandBar({ open, onOpenChange }: CommandBarProps) {
  const router = useRouter();
  const { user, propertyId } = useAuthStore();
  const role = user?.role ?? 'FRONT_DESK';
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentCmds, setRecentCmds] = useState<RecentCommand[]>([]);
  const [, startTransition] = useTransition();

  const commands = buildCommands(router).filter(
    c => c.roles.length === 0 || c.roles.includes(role),
  );

  useEffect(() => {
    if (open) {
      setRecentCmds(getRecentCommands());
      setQuery('');
      setSearchResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await searchApi.global(query, 'guests,reservations,rooms', propertyId);
          setSearchResults(res.data ?? []);
        } catch {
          setSearchResults([]);
        }
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, propertyId]);

  const run = useCallback((cmd: CommandDef) => {
    onOpenChange(false);
    addRecentCommand({ id: cmd.id, label: cmd.label, href: cmd.href });
    if (cmd.action) { cmd.action(); return; }
    if (cmd.href) router.push(cmd.href);
  }, [router, onOpenChange]);

  const runResult = useCallback((r: SearchResult) => {
    onOpenChange(false);
    addRecentCommand({ id: `search-${r.id}`, label: r.label, href: r.href });
    router.push(r.href);
  }, [router, onOpenChange]);

  const groups = ['Navigation', 'Quick Create', 'Front Desk'];
  const filteredByGroup = (group: string) =>
    commands.filter(c => c.group === group && (
      !query ||
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.keywords.toLowerCase().includes(query.toLowerCase())
    ));

  const showRecent = !query && recentCmds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 gap-0 max-w-lg overflow-hidden">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type a command or search…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>

            {/* Recent commands (shown when no query) */}
            {showRecent && (
              <CommandGroup heading="Recent">
                {recentCmds.map(r => {
                  const cmd = commands.find(c => c.id === r.id);
                  const Icon = cmd?.icon ?? Clock;
                  return (
                    <CommandItem key={r.id} onSelect={() => { onOpenChange(false); if (r.href) router.push(r.href); }}>
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {r.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* Live search results */}
            {searchResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Search Results">
                  {searchResults.map(r => (
                    <CommandItem key={`${r.type}-${r.id}`} onSelect={() => runResult(r)}>
                      <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{r.label}</span>
                      {r.sub && <span className="ml-2 text-xs text-muted-foreground">{r.sub}</span>}
                      <span className="ml-auto text-[10px] text-muted-foreground uppercase">{r.type}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Static command groups */}
            {groups.map((group, gi) => {
              const items = filteredByGroup(group);
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  {gi > 0 && <CommandSeparator />}
                  <CommandGroup heading={group}>
                    {items.map(cmd => {
                      const Icon = cmd.icon;
                      return (
                        <CommandItem key={cmd.id} onSelect={() => run(cmd)}>
                          <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>{cmd.label}</span>
                          {cmd.description && (
                            <span className="ml-2 text-xs text-muted-foreground hidden sm:inline">{cmd.description}</span>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </div>
              );
            })}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
