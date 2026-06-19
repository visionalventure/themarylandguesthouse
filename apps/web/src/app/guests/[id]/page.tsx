'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft, User, Phone, Mail, Globe, Award,
  BedDouble, Loader2, ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { guestsApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  RESERVED:    'bg-amber-100 text-amber-800',
  CONFIRMED:   'bg-blue-100 text-blue-800',
  CHECKED_IN:  'bg-green-100 text-green-800',
  CHECKED_OUT: 'bg-slate-100 text-slate-600',
  CANCELLED:   'bg-red-100 text-red-800',
  NO_SHOW:     'bg-red-200 text-red-900',
};

export default function GuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: guest, isLoading } = useQuery({
    queryKey: ['guest', id],
    queryFn: () => guestsApi.get(id).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>;
  if (!guest) return <div className="p-6 text-muted-foreground">Guest not found</div>;

  const totalStays    = (guest.reservations ?? []).filter((r: any) => r.status === 'CHECKED_OUT').length;
  const activeBooking = (guest.reservations ?? []).find((r: any) => ['RESERVED', 'CONFIRMED', 'CHECKED_IN'].includes(r.status));
  const loyaltyPts    = guest.loyaltyAccount?.pointsBalance ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
              {guest.firstName?.[0]}{guest.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold">{guest.firstName} {guest.lastName}</h1>
              <p className="text-sm text-muted-foreground">
                Guest #{guest.guestNo ?? id.slice(-6).toUpperCase()}
                {guest.vipStatus && <span className="ml-2 text-amber-600 font-medium">⭐ VIP</span>}
              </p>
            </div>
          </div>
        </div>
        {activeBooking && (
          <Button size="sm" onClick={() => router.push(`/reservations/${activeBooking.id}`)}>
            Active Booking <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" /> Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {guest.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{guest.email}</span>
              </div>
            )}
            {guest.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{guest.phone}</span>
              </div>
            )}
            {guest.nationality && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{guest.nationality}</span>
              </div>
            )}
            {guest.address && (
              <p className="text-muted-foreground text-xs mt-1">{guest.address}</p>
            )}
            {guest.dateOfBirth && (
              <p className="text-xs text-muted-foreground">DOB: {format(new Date(guest.dateOfBirth), 'dd MMM yyyy')}</p>
            )}
            {guest.idType && (
              <p className="text-xs text-muted-foreground">{guest.idType}: {guest.idNumber}</p>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4" /> Stay History</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{totalStays}</p>
                <p className="text-xs text-muted-foreground">Stays</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-500">{loyaltyPts.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Loyalty Pts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {guest.reservations?.length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Total Bookings</p>
              </div>
            </div>
            {guest.notes && (
              <div className="mt-3 bg-muted/40 rounded p-2 text-xs text-muted-foreground italic">
                "{guest.notes}"
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Reservation History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><BedDouble className="w-4 h-4" /> Reservation History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {(guest.reservations ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 py-4">No reservations yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Booking #</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Room</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Check-in</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Check-out</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(guest.reservations as any[]).map((r: any) => {
                    const roomNo = r.rooms?.[0]?.room?.roomNumber;
                    return (
                      <tr key={r.id} className="border-b hover:bg-muted/10 cursor-pointer" onClick={() => router.push(`/reservations/${r.id}`)}>
                        <td className="px-4 py-2.5 font-mono text-xs">{r.reservationNo}</td>
                        <td className="px-4 py-2.5">{roomNo ? `Room ${roomNo}` : '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.checkIn ? format(new Date(r.checkIn), 'dd MMM yyyy') : '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.checkOut ? format(new Date(r.checkOut), 'dd MMM yyyy') : '—'}</td>
                        <td className="px-4 py-2.5">
                          <Badge className={cn('text-xs', STATUS_COLORS[r.status] ?? '')}>{r.status?.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
