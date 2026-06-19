'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Moon, Play, CheckCircle, Loader2, ChevronDown, ChevronUp,
  BedDouble, LogIn, LogOut, AlertTriangle, DollarSign, Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/use-page-title';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  OPEN:        'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  CLOSED:      'bg-green-100 text-green-800',
  REOPENED:    'bg-orange-100 text-orange-800',
};

export default function NightAuditPage() {
  usePageTitle('Night Audit');
  const { propertyId } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [auditDate, setAuditDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [lastResult, setLastResult] = useState<any>(null);

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['night-audit-history', propertyId],
    queryFn: () => api.get('/v1/nightaudit/history', { params: { propertyId } }).then(r => r.data),
    enabled: !!propertyId,
  });

  const runAuditMutation = useMutation({
    mutationFn: () => api.post('/v1/nightaudit/run', { propertyId, auditDate }).then(r => r.data),
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ['night-audit-history', propertyId] });
      toast({ title: 'Night audit complete', description: `${data.summary?.nightlyChargesPosted ?? 0} charges posted` });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Audit failed' }),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/v1/nightaudit/${id}/close`).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['night-audit-history', propertyId] });
      setLastResult(null);
      toast({ title: 'Audit closed' });
    },
  });

  const summary = lastResult?.summary;
  const audit   = lastResult?.audit;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Moon className="w-6 h-6 text-indigo-500" />
        <div>
          <h1 className="text-2xl font-bold">Night Audit</h1>
          <p className="text-sm text-muted-foreground">End-of-day reconciliation and room charge posting</p>
        </div>
      </div>

      {/* Run Audit Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Run Audit</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-1">
              <Label>Audit Date</Label>
              <Input type="date" value={auditDate} onChange={e => setAuditDate(e.target.value)} className="w-44" />
            </div>
            <Button
              onClick={() => runAuditMutation.mutate()}
              disabled={runAuditMutation.isPending || !propertyId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {runAuditMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
              Run Night Audit
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Posts nightly room charges to all checked-in guests, marks no-shows, and closes the business day.
          </p>
        </CardContent>
      </Card>

      {/* Audit Result */}
      {summary && audit && (
        <Card className="border-indigo-200 dark:border-indigo-900">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Audit Summary — {format(new Date(audit.auditDate), 'dd MMMM yyyy')}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={STATUS_COLORS[audit.status] ?? ''}>{audit.status}</Badge>
                {audit.status !== 'CLOSED' && (
                  <Button size="sm" variant="outline" onClick={() => closeMutation.mutate(audit.id)} disabled={closeMutation.isPending}>
                    {closeMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    Close Day
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {[
                { label: 'Arrivals', value: summary.arrivals, icon: LogIn, color: 'text-blue-500' },
                { label: 'Departures', value: summary.departures, icon: LogOut, color: 'text-amber-500' },
                { label: 'No-Shows', value: summary.noShows, icon: AlertTriangle, color: 'text-red-500' },
                { label: 'Occupancy', value: `${summary.occupancyRate}%`, icon: BedDouble, color: 'text-green-500' },
                { label: 'Rooms Occupied', value: summary.roomsOccupied, icon: Users, color: 'text-indigo-500' },
                { label: 'Revenue', value: `$${Number(summary.totalRevenue).toFixed(2)}`, icon: DollarSign, color: 'text-emerald-500' },
                { label: 'Payments', value: `$${Number(summary.totalPayments).toFixed(2)}`, icon: DollarSign, color: 'text-teal-500' },
                { label: 'Charges Posted', value: summary.nightlyChargesPosted, icon: CheckCircle, color: 'text-purple-500' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Audit History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="animate-spin" /></div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 pb-4">No audits run yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Occupancy</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Revenue</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Payments</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">No-Shows</th>
                    <th className="px-4 py-2 font-medium text-muted-foreground">Closed At</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((audit: any) => (
                    <tr key={audit.id} className="border-b hover:bg-muted/10">
                      <td className="px-4 py-2.5 font-medium">{format(new Date(audit.auditDate), 'dd MMM yyyy')}</td>
                      <td className="px-4 py-2.5"><Badge className={cn('text-xs', STATUS_COLORS[audit.status] ?? '')}>{audit.status}</Badge></td>
                      <td className="px-4 py-2.5 text-right">{Number(audit.occupancyRate).toFixed(0)}%</td>
                      <td className="px-4 py-2.5 text-right">${Number(audit.totalRevenue).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right">${Number(audit.totalPayments).toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right">{audit.noShows}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{audit.closedAt ? format(new Date(audit.closedAt), 'dd MMM HH:mm') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
