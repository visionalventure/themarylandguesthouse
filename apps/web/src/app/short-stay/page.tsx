'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Plus, Clock, DollarSign, AlarmClock, BedDouble, Phone, Loader2, CheckCircle2, XCircle,
  PlusCircle, ArrowUpCircle, Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { shortStayApi, reservationsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { ShortStayDialog } from './components/short-stay-dialog';
import { ExtendStayDialog } from './components/extend-stay-dialog';
import { CheckoutDialog } from './components/checkout-dialog';
import { ManageOffersDialog } from './components/manage-offers-dialog';
import { ReservationFormDialog } from '@/app/reservations/components/reservation-form-dialog';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  CHECKED_IN:  { label: 'Checked In',  color: 'bg-primary/15 text-primary border-primary/30' },
  CHECKED_OUT: { label: 'Checked Out', color: 'bg-muted text-muted-foreground border-border' },
  CANCELLED:   { label: 'Cancelled',   color: 'bg-red-500/15 text-red-500 border-red-500/30' },
  UPGRADED:    { label: 'Upgraded',    color: 'bg-violet-500/15 text-violet-500 border-violet-500/30' },
};

export default function ShortStayPage() {
  usePageTitle('Short Stay');
  const propertyId = useAuthStore((s) => s.propertyId);
  const currentUser = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('CHECKED_IN');
  const [newOpen, setNewOpen] = useState(false);
  const [offersOpen, setOffersOpen] = useState(false);
  const [extendingBooking, setExtendingBooking] = useState<any | null>(null);
  const [checkoutBooking, setCheckoutBooking] = useState<any | null>(null);
  const [upgradePrefill, setUpgradePrefill] = useState<any | null>(null);
  const [upgradingBookingId, setUpgradingBookingId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: stats } = useQuery({
    queryKey: ['short-stay-stats', propertyId],
    queryFn: () => shortStayApi.stats(propertyId).then((r) => r.data),
    enabled: !!propertyId,
    refetchInterval: 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['short-stays', propertyId, statusFilter, debouncedSearch],
    queryFn: () => shortStayApi.list({
      propertyId,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: debouncedSearch || undefined,
      limit: 50,
    }).then((r) => r.data),
    enabled: !!propertyId,
    refetchInterval: 60_000,
  });

  const bookings: any[] = data?.data ?? [];

  const cancelMutation = useMutation({
    mutationFn: (id: string) => shortStayApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['short-stays'] });
      queryClient.invalidateQueries({ queryKey: ['short-stay-stats'] });
      toast({ title: 'Booking cancelled' });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to cancel' }),
  });

  const prepareUpgradeMutation = useMutation({
    mutationFn: (id: string) => shortStayApi.prepareUpgrade(id).then((r) => r.data),
    onSuccess: (seed, id) => {
      setUpgradingBookingId(id);
      // ReservationFormDialog reads the room to prefill from
      // initialData.rooms[0].roomId (the shape a real reservation carries).
      setUpgradePrefill({ ...seed, rooms: [{ roomId: seed.roomId }] });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to start upgrade' }),
  });

  const finalizeUpgradeMutation = useMutation({
    mutationFn: async (reservation: any) => {
      // The guest is already in the room - bring the new reservation to
      // CHECKED_IN immediately rather than leaving it sitting as RESERVED.
      await reservationsApi.checkIn(reservation.id);
      await shortStayApi.upgrade(upgradingBookingId as string, reservation.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['short-stays'] });
      queryClient.invalidateQueries({ queryKey: ['short-stay-stats'] });
      queryClient.invalidateQueries({ queryKey: ['reservations-calendar'] });
      toast({ title: 'Upgraded to a full reservation' });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Reservation created, but the upgrade link failed to save' }),
  });

  const isOverdue = (b: any) => b.status === 'CHECKED_IN' && new Date(b.checkOutPlanned) < new Date();

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Short Stay</h1>
          <p className="text-muted-foreground text-sm">Hourly / day-use guests — quick check-in, no name required</p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser?.role === 'SUPER_ADMIN' && (
            <Button variant="outline" onClick={() => setOffersOpen(true)}>
              <Tag className="w-4 h-4 mr-2" /> Manage Offers
            </Button>
          )}
          <Button onClick={() => setNewOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> New Short Stay
          </Button>
        </div>
      </div>

      <StaggerGrid className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Active Short Stays', value: stats?.active ?? 0, icon: BedDouble, color: 'text-primary' },
          { label: "Today's Revenue", value: stats?.todaysRevenue ?? 0, icon: DollarSign, color: 'text-green-500', formatter: (v: number) => `$${v.toFixed(0)}` },
          { label: 'Checking Out Soon', value: stats?.checkingOutSoon ?? 0, icon: AlarmClock, color: 'text-amber-500' },
        ].map((s) => (
          <StaggerItem key={s.label}>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <s.icon className={cn('w-8 h-8', s.color)} />
                  <div>
                    <AnimatedCounter value={s.value} formatter={s.formatter} className="text-2xl font-bold block" />
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGrid>

      <div className="flex items-center gap-3 flex-wrap">
        <Input placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([v, cfg]) => <SelectItem key={v} value={v}>{cfg.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
          ) : bookings.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">No short stays yet</p>
              <p className="text-sm text-muted-foreground mt-1">Check in your first hourly guest to start tracking it here.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Room</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Guest</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Check-in</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Checkout</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => {
                  const paid = (b.payments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0);
                  const overdue = isOverdue(b);
                  const canUpgrade = !b.guestPhone && !b.guestId;
                  return (
                    <tr key={b.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">Room {b.room?.roomNumber}</td>
                      <td className="px-4 py-3">
                        <p className="text-foreground">{b.guestName || <span className="text-muted-foreground italic">Walk-in guest</span>}</p>
                        {b.guestPhone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{b.guestPhone}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{format(new Date(b.checkIn), 'MMM d, HH:mm')}</td>
                      <td className={cn('px-4 py-3 text-xs whitespace-nowrap', overdue ? 'text-red-500 font-semibold' : 'text-muted-foreground')}>
                        {format(new Date(b.checkOutActual ?? b.checkOutPlanned), 'MMM d, HH:mm')}
                        {overdue && ' (overdue)'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-medium text-foreground">${Number(b.totalAmount).toFixed(2)}</p>
                        {paid > 0 && <p className="text-[10px] text-muted-foreground">${paid.toFixed(2)} paid</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn('text-xs border', STATUS_CONFIG[b.status]?.color)}>
                          {STATUS_CONFIG[b.status]?.label ?? b.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {b.status === 'CHECKED_IN' ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" title="Extend Stay" onClick={() => setExtendingBooking(b)}>
                              <PlusCircle className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm" variant="ghost"
                              title={canUpgrade ? 'Add a phone number first so a guest can be linked' : 'Upgrade to Reservation'}
                              disabled={canUpgrade || prepareUpgradeMutation.isPending}
                              onClick={() => prepareUpgradeMutation.mutate(b.id)}
                            >
                              <ArrowUpCircle className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setCheckoutBooking(b)}>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Check Out
                            </Button>
                            <Button
                              size="sm" variant="ghost" className="text-red-600 hover:text-red-700"
                              disabled={cancelMutation.isPending}
                              onClick={() => { if (confirm('Cancel this short stay?')) cancelMutation.mutate(b.id); }}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <ShortStayDialog open={newOpen} onOpenChange={setNewOpen} propertyId={propertyId} />
      {currentUser?.role === 'SUPER_ADMIN' && (
        <ManageOffersDialog open={offersOpen} onOpenChange={setOffersOpen} propertyId={propertyId} />
      )}
      <ExtendStayDialog booking={extendingBooking} onOpenChange={(v) => { if (!v) setExtendingBooking(null); }} />
      <CheckoutDialog booking={checkoutBooking} onOpenChange={(v) => { if (!v) setCheckoutBooking(null); }} />

      {upgradePrefill && (
        <ReservationFormDialog
          open={!!upgradePrefill}
          onOpenChange={(v) => { if (!v) { setUpgradePrefill(null); setUpgradingBookingId(null); } }}
          propertyId={propertyId}
          initialData={upgradePrefill}
          onSuccess={(reservation) => {
            finalizeUpgradeMutation.mutate(reservation);
            setUpgradePrefill(null);
            setUpgradingBookingId(null);
          }}
        />
      )}
    </FadeIn>
  );
}
