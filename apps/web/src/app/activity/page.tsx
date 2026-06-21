'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Activity, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { FadeIn } from '@/components/ui/fade-in';
import { useAuthStore } from '@/store/auth';
import { settingsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/use-page-title';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  UPDATE: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/20',
  LOGIN:  'bg-violet-500/15 text-violet-400 border-violet-500/20',
  LOGOUT: 'bg-gray-500/15 text-gray-400 border-gray-500/20',
  EXPORT: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  IMPORT: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  APPROVE: 'bg-green-500/15 text-green-400 border-green-500/20',
  REJECT: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  VOID:   'bg-rose-500/15 text-rose-400 border-rose-500/20',
};

const ENTITY_TYPES = [
  'RESERVATION', 'GUEST', 'ROOM', 'USER', 'INVOICE', 'PAYMENT',
  'JOURNAL_ENTRY', 'BANK_ACCOUNT', 'BUDGET', 'EMPLOYEE', 'PURCHASE_ORDER',
  'INVENTORY_ITEM', 'PROPERTIES', 'NIGHT_AUDIT',
];

export default function ActivityPage() {
  usePageTitle('Activity Log');
  const propertyId = useAuthStore((s) => s.propertyId);
  const [entityFilter, setEntityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['activity-log', entityFilter, page, propertyId],
    queryFn: () =>
      settingsApi
        .auditLog({ tenantId: propertyId, entityType: entityFilter || undefined, page, limit: 50 })
        .then((r) => r.data),
    refetchInterval: 30_000,
  });

  const logs: any[] = (data?.data ?? []).filter((log: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      log.entity?.toLowerCase().includes(s) ||
      log.action?.toLowerCase().includes(s) ||
      log.description?.toLowerCase().includes(s) ||
      log.user?.firstName?.toLowerCase().includes(s) ||
      log.user?.lastName?.toLowerCase().includes(s)
    );
  });

  const totalPages = Math.ceil((data?.total ?? 0) / 50);

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Activity Log
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">All user actions across the system — real-time audit trail</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn('w-4 h-4 mr-2', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(1); }}>
          <SelectTrigger className="w-48 h-9 text-sm">
            <SelectValue placeholder="All entity types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search by user, action, entity…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64 text-sm"
        />
        {(entityFilter || search) && (
          <Button variant="ghost" size="sm" onClick={() => { setEntityFilter(''); setSearch(''); setPage(1); }}>
            Clear filters
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {data?.total ?? 0} total entries · auto-refreshes every 30s
        </span>
      </div>

      {/* Activity Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading activity…</div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-base font-medium text-foreground">No activity recorded yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Actions taken by any user in the system will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Time</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Entity</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {log.createdAt ? format(new Date(log.createdAt), 'MMM d, HH:mm:ss') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {log.user ? (
                          <div>
                            <p className="text-xs font-medium text-foreground">{log.user.firstName} {log.user.lastName}</p>
                            <p className="text-[10px] text-muted-foreground">{log.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] font-medium px-2 py-0.5 border', ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground')}
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-foreground">{log.entity?.replace(/_/g, ' ')}</span>
                        {log.entityId && (
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{log.entityId.slice(0, 8)}…</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[280px] truncate" title={log.description}>
                        {log.description ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </FadeIn>
  );
}
