'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  BedDouble,
  Sparkles,
  UtensilsCrossed,
  Package,
  ShoppingCart,
  Users2,
  Wrench,
  BookOpen,
  FileText,
  Gift,
  BarChart3,
  Settings,
  ChevronRight,
  ChevronDown,
  Building2,
  Hotel,
  Moon,
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth';
import { propertiesApi } from '@/lib/api';

const navSections = [
  {
    label: 'Operations',
    items: [
      { name: 'Front Desk',     href: '/front-desk',   icon: Hotel },
      { name: 'Dashboard',      href: '/dashboard',    icon: LayoutDashboard },
      { name: 'Reservations',   href: '/reservations', icon: CalendarDays },
      { name: 'Guests / CRM',   href: '/guests',       icon: Users },
      { name: 'Rooms',          href: '/rooms',         icon: BedDouble },
      { name: 'Housekeeping',   href: '/housekeeping', icon: Sparkles },
      { name: 'Restaurant & Bar', href: '/restaurant', icon: UtensilsCrossed },
      { name: 'Maintenance',    href: '/maintenance',  icon: Wrench },
      { name: 'Night Audit',    href: '/nightaudit',   icon: Moon },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        name: 'Accounting', href: '/accounting', icon: BookOpen,
        children: [
          { name: 'Chart of Accounts', href: '/accounting/chart-of-accounts' },
          { name: 'Journal Entries',   href: '/accounting/journal-entries' },
          { name: 'Invoices',          href: '/accounting/invoices' },
          { name: 'Bills',             href: '/accounting/bills' },
          { name: 'Banking',           href: '/accounting/banking' },
          { name: 'Budgets',           href: '/accounting/budgets' },
          { name: 'Reports',           href: '/accounting/reports' },
        ],
      },
      { name: 'Inventory',   href: '/inventory',   icon: Package },
      { name: 'Procurement', href: '/procurement', icon: ShoppingCart },
      { name: 'Analytics',   href: '/reports',     icon: BarChart3 },
    ],
  },
  {
    label: 'People',
    items: [
      { name: 'Human Resources', href: '/hr',      icon: Users2 },
      { name: 'Loyalty Program', href: '/loyalty', icon: Gift },
    ],
  },
  {
    label: 'Settings',
    items: [
      { name: 'Documents',   href: '/documents',   icon: FileText },
      { name: 'Properties',  href: '/properties',  icon: Building2 },
      { name: 'Settings',    href: '/settings',    icon: Settings },
    ],
  },
];

interface SidebarProps {
  collapsed?: boolean;
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Accounting']);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const { propertyId, setPropertyId } = useAuthStore();

  const { data: propertiesData } = useQuery({
    queryKey: ['properties-list'],
    queryFn: () => propertiesApi.list().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const properties: any[] = Array.isArray(propertiesData) ? propertiesData : propertiesData?.data ?? [];
  const currentProperty = properties.find((p) => p.id === propertyId);

  const toggleExpanded = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name],
    );
  };

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <aside
      className={cn(
        'flex flex-col h-full transition-all duration-300',
        'bg-[#121214] backdrop-blur-glass border-r border-[rgba(255,255,255,0.07)]',
        collapsed ? 'w-16' : 'w-72',
      )}
    >
      {/* ── Logo ──────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center gap-3 border-b border-[rgba(255,255,255,0.07)]',
        collapsed ? 'px-3 py-5 justify-center' : 'px-5 py-5',
      )}>
        <div className="flex-shrink-0 w-9 h-9 gold-gradient rounded-xl flex items-center justify-center shadow-gold-glow overflow-hidden">
          {currentProperty?.logoUrl ? (
            <img src={currentProperty.logoUrl} alt={currentProperty.name} className="w-full h-full object-contain" />
          ) : (
            <span className="text-luxury-charcoal font-bold text-base leading-none">M</span>
          )}
        </div>
        {!collapsed && (
          <div className="overflow-hidden min-w-0">
            <p className="text-sm font-bold text-white leading-tight truncate">
              {currentProperty?.name?.split(' ')[0] ?? 'Maryland'}
            </p>
            <p className="text-[11px] text-gold-main font-medium tracking-wide">Guesthouse ERP</p>
          </div>
        )}
      </div>

      {/* ── Property Selector ─────────────────────────────── */}
      {!collapsed && (
        <div className="relative px-3 py-2.5 border-b border-[rgba(255,255,255,0.07)]">
          <button
            onClick={() => setPropertyOpen((o) => !o)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.09)] border border-[rgba(255,255,255,0.08)] transition-colors text-left"
          >
            {currentProperty?.logoUrl ? (
              <img src={currentProperty.logoUrl} alt="" className="w-4 h-4 rounded object-contain flex-shrink-0 bg-white/10" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-gold-main/70 flex-shrink-0" />
            )}
            <span className="flex-1 text-xs font-medium text-white/75 truncate min-w-0">
              {currentProperty?.name ?? 'Maryland Guesthouse'}
            </span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-white/40 flex-shrink-0 transition-transform', propertyOpen && 'rotate-180')} />
          </button>
          {propertyOpen && properties.length > 0 && (
            <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-[#1a1a1e] border border-[rgba(255,255,255,0.10)] rounded-xl overflow-hidden shadow-lg">
              {properties.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setPropertyId(p.id); setPropertyOpen(false); }}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs transition-colors',
                    p.id === propertyId
                      ? 'bg-gold-main/15 text-gold-main font-semibold'
                      : 'text-white/65 hover:bg-[rgba(255,255,255,0.06)] hover:text-white/90',
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40 select-none">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                const hasChildren = 'children' in item && item.children && item.children.length > 0;
                const isExpanded = expandedItems.includes(item.name);
                const isParentActive = hasChildren && !active && pathname.startsWith(item.href);

                return (
                  <div key={item.name}>
                    {hasChildren ? (
                      <button
                        onClick={() => toggleExpanded(item.name)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                          active || isParentActive
                            ? 'border-l-2 border-gold-main bg-gold-main/10 text-gold-main pl-[10px]'
                            : 'text-white/60 hover:bg-[rgba(255,255,255,0.06)] hover:text-white/95',
                          collapsed && 'justify-center px-2',
                        )}
                      >
                        <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: '18px', height: '18px' }} />
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left text-[13px]">{item.name}</span>
                            <ChevronRight
                              className={cn('w-3.5 h-3.5 opacity-50 transition-transform', isExpanded && 'rotate-90')}
                            />
                          </>
                        )}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                          active
                            ? 'border-l-2 border-gold-main bg-gold-main/10 text-gold-main pl-[10px]'
                            : 'text-white/60 hover:bg-[rgba(255,255,255,0.06)] hover:text-white/95',
                          collapsed && 'justify-center px-2',
                        )}
                      >
                        <Icon className="flex-shrink-0" style={{ width: '18px', height: '18px' }} />
                        {!collapsed && <span className="text-[13px]">{item.name}</span>}
                      </Link>
                    )}

                    {hasChildren && isExpanded && !collapsed && (
                      <div className="ml-7 mt-0.5 space-y-0.5 border-l border-[rgba(255,255,255,0.08)] pl-3">
                        {'children' in item && item.children!.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'block px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150',
                              pathname === child.href
                                ? 'text-gold-main bg-gold-main/10'
                                : 'text-white/50 hover:text-white/85 hover:bg-[rgba(255,255,255,0.05)]',
                            )}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ────────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/[0.06]">
          <p className="text-[11px] text-white/35 font-medium">MGH ERP v1.0.0</p>
        </div>
      )}
    </aside>
  );
}
