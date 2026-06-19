'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays } from 'date-fns';
import {
  ArrowLeft, FileText, Edit, LogIn, LogOut, XCircle,
  BedDouble, User, Calendar, CreditCard, Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { reservationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  RESERVED:    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  CONFIRMED:   'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  CHECKED_IN:  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  CHECKED_OUT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  CANCELLED:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  NO_SHOW:     'bg-red-200 text-red-900 dark:bg-red-900/40 dark:text-red-300',
  PENDING:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const SOURCE_LABELS: Record<string, string> = {
  WALK_IN: 'Walk-In', PHONE: 'Phone', WHATSAPP: 'WhatsApp',
  EMAIL: 'Email', CORPORATE: 'Corporate', TRAVEL_AGENT: 'Travel Agent',
  DIRECT: 'Direct', OTA: 'OTA', ONLINE: 'Online',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  UNPAID:    'text-red-600',
  PART_PAID: 'text-amber-600',
  PAID:      'text-green-600',
};

export default function ReservationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { propertyId } = useAuthStore();

  const { data: res, isLoading } = useQuery({
    queryKey: ['reservation', id],
    queryFn: () => reservationsApi.get(id).then(r => r.data),
    enabled: !!id,
  });

  const checkInMutation = useMutation({
    mutationFn: () => reservationsApi.checkIn(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reservation', id] }); toast({ title: 'Guest checked in' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Check-in failed' }),
  });

  const checkOutMutation = useMutation({
    mutationFn: () => reservationsApi.checkOut(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reservation', id] }); router.push(`/reservations/${id}/folio`); },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Check-out failed' }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => reservationsApi.cancel(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reservation', id] }); toast({ title: 'Reservation cancelled' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Cancel failed' }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>;
  if (!res) return <div className="p-6 text-muted-foreground">Reservation not found</div>;

  const nights = differenceInDays(new Date(res.checkOut), new Date(res.checkIn));
  const room = res.rooms?.[0]?.room;
  const totalPaid = (res.payments ?? []).filter((p: any) => p.status === 'COMPLETED').reduce((s: number, p: any) => s + Number(p.amount), 0);
  const balance = Number(res.totalAmount) - totalPaid;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold">{res.reservationNo}</h1>
            <Badge className={cn('text-xs', STATUS_COLORS[res.status] ?? '')}>{res.status?.replace('_', ' ')}</Badge>
            {res.source && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {SOURCE_LABELS[res.source] ?? res.source}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {res.guest?.firstName} {res.guest?.lastName}
          </p>
        </div>
        {/* Action buttons */}
        <div className="flex gap-2 flex-shrink-0 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => router.push(`/reservations/${id}/folio`)}>
            <FileText className="w-4 h-4 mr-1" /> Folio
          </Button>
          {['RESERVED', 'CONFIRMED'].includes(res.status) && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending}>
              {checkInMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <LogIn className="w-4 h-4 mr-1" />}
              Check In
            </Button>
          )}
          {res.status === 'CHECKED_IN' && (
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={() => checkOutMutation.mutate()} disabled={checkOutMutation.isPending}>
              {checkOutMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <LogOut className="w-4 h-4 mr-1" />}
              Check Out
            </Button>
          )}
          {!['CHECKED_OUT', 'CANCELLED', 'NO_SHOW'].includes(res.status) && (
            <Button size="sm" variant="destructive"
              onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
              {cancelMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stay Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4" /> Stay Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Check-in</p>
                <p className="font-semibold">{res.checkIn ? format(new Date(res.checkIn), 'EEE dd MMM yyyy') : '—'}</p>
                {res.checkedInAt && <p className="text-xs text-muted-foreground">{format(new Date(res.checkedInAt), 'HH:mm')}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Check-out</p>
                <p className="font-semibold">{res.checkOut ? format(new Date(res.checkOut), 'EEE dd MMM yyyy') : '—'}</p>
                {res.checkedOutAt && <p className="text-xs text-muted-foreground">{format(new Date(res.checkedOutAt), 'HH:mm')}</p>}
              </div>
            </div>
            <div className="flex gap-6">
              <div><p className="text-xs text-muted-foreground">Nights</p><p className="font-semibold">{nights}</p></div>
              <div><p className="text-xs text-muted-foreground">Adults</p><p className="font-semibold">{res.adults}</p></div>
              <div><p className="text-xs text-muted-foreground">Children</p><p className="font-semibold">{res.children ?? 0}</p></div>
            </div>
            {res.specialRequests && (
              <div className="bg-muted/40 rounded p-2 text-xs text-muted-foreground italic">
                "{res.specialRequests}"
              </div>
            )}
          </CardContent>
        </Card>

        {/* Room Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><BedDouble className="w-4 h-4" /> Room</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {res.rooms?.length === 0 ? (
              <p className="text-muted-foreground">No room assigned</p>
            ) : (
              res.rooms?.map((rr: any) => (
                <div key={rr.id} className="space-y-1">
                  <p className="font-semibold text-base">Room {rr.room?.roomNumber}</p>
                  <p className="text-muted-foreground">{rr.room?.category?.name}</p>
                  <div className="flex gap-6 mt-2">
                    <div><p className="text-xs text-muted-foreground">Rate / night</p><p className="font-medium">${Number(rr.ratePerNight).toFixed(2)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Total</p><p className="font-medium">${Number(rr.totalAmount).toFixed(2)}</p></div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Guest Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" /> Guest</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold">{res.guest?.firstName} {res.guest?.lastName}</p>
            {res.guest?.email && <p className="text-muted-foreground">{res.guest.email}</p>}
            {res.guest?.phone && <p className="text-muted-foreground">{res.guest.phone}</p>}
            {res.guest?.nationality && <p className="text-muted-foreground">{res.guest.nationality}</p>}
            <Button size="sm" variant="outline" className="mt-2" onClick={() => router.push(`/guests/${res.guestId}`)}>
              View Guest Profile
            </Button>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-semibold">${Number(res.totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid</span>
              <span>${totalPaid.toFixed(2)}</span>
            </div>
            <div className={cn('flex justify-between font-bold border-t pt-2', balance > 0 ? 'text-red-600' : 'text-green-600')}>
              <span>Balance</span>
              <span>${balance.toFixed(2)}</span>
            </div>
            {(res.payments ?? []).length > 0 && (
              <div className="pt-1 space-y-1">
                {(res.payments as any[]).map((p: any) => (
                  <div key={p.id} className="flex justify-between text-xs text-muted-foreground">
                    <span>{p.method?.replace('_', ' ')} {p.status === 'COMPLETED' ? '✓' : ''}</span>
                    <span>${Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => router.push(`/reservations/${id}/folio`)}>
              Open Full Folio
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
