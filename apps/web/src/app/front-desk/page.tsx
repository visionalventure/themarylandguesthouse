'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  Users, LogIn, LogOut, BedDouble, CheckCircle, DollarSign,
  AlertCircle, Plus, Search, RefreshCw, ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, reservationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const ROOM_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  AVAILABLE:    { label: 'Vacant Clean',  color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',   dot: 'bg-green-500' },
  VACANT_DIRTY: { label: 'Vacant Dirty',  color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', dot: 'bg-yellow-400' },
  OCCUPIED:     { label: 'Occupied',      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',         dot: 'bg-blue-500' },
  RESERVED:     { label: 'Reserved',      color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',     dot: 'bg-amber-500' },
  CLEANING:     { label: 'Cleaning',      color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',         dot: 'bg-cyan-400' },
  MAINTENANCE:  { label: 'Maintenance',   color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', dot: 'bg-orange-500' },
  OUT_OF_ORDER: { label: 'Out of Service',color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',             dot: 'bg-red-500' },
  BLOCKED:      { label: 'Blocked',       color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',        dot: 'bg-slate-400' },
};

export default function FrontDeskPage() {
  const { propertyId } = useAuthStore();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['front-desk', propertyId],
    queryFn: () => api.get('/v1/dashboard/front-desk', { params: { propertyId } }).then(r => r.data),
    refetchInterval: 60000, // auto-refresh every minute
  });

  const checkInMutation = useMutation({
    mutationFn: (id: string) => reservationsApi.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['front-desk'] });
      toast({ title: 'Guest checked in' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Check-in failed' }),
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => reservationsApi.checkOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['front-desk'] });
      toast({ title: 'Guest checked out' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Check-out failed' }),
  });

  const stats = data?.stats ?? {};
  const arrivals: any[] = data?.recentArrivals ?? [];
  const departures: any[] = data?.recentDepartures ?? [];
  const roomsStatus: any[] = data?.roomsStatus ?? [];

  const statCards = [
    { label: 'Arrivals Today',    value: stats.arrivals ?? 0,       icon: LogIn,       color: 'text-blue-600' },
    { label: 'Departures Today',  value: stats.departures ?? 0,     icon: LogOut,      color: 'text-amber-600' },
    { label: 'Occupancy',         value: `${stats.occupancyRate ?? 0}%`, icon: BedDouble, color: 'text-green-600' },
    { label: 'Available Rooms',   value: stats.availableRooms ?? 0, icon: CheckCircle, color: 'text-emerald-600' },
    { label: 'Occupied Rooms',    value: stats.occupiedRooms ?? 0,  icon: Users,       color: 'text-indigo-600' },
    { label: 'Outstanding Balance', value: `$${Number(stats.outstandingBalance ?? 0).toFixed(2)}`, icon: DollarSign, color: 'text-red-600' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Front Desk</h1>
          <p className="text-muted-foreground text-sm">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground" onClick={() => router.push('/reservations')}>
            <Plus className="w-4 h-4 mr-1" /> New Reservation
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <div className="text-2xl font-bold">{isLoading ? '—' : value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Arrivals & Departures */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Arrivals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LogIn className="w-4 h-4 text-blue-500" /> Today's Arrivals
              <Badge variant="secondary" className="ml-auto">{arrivals.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {arrivals.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 pb-4">No arrivals today</p>
            ) : (
              <div className="divide-y">
                {arrivals.map((r: any) => {
                  const room = r.rooms?.[0]?.room;
                  return (
                    <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{r.guest?.firstName} {r.guest?.lastName}</p>
                        <p className="text-xs text-muted-foreground">
                          Room {room?.roomNumber ?? '—'} · {r.source?.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{r.status}</Badge>
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => checkInMutation.mutate(r.id)}
                          disabled={checkInMutation.isPending}
                        >
                          Check In
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => router.push(`/reservations/${r.id}/folio`)}>
                          <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Departures */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LogOut className="w-4 h-4 text-amber-500" /> Today's Departures
              <Badge variant="secondary" className="ml-auto">{departures.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {departures.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 pb-4">No departures today</p>
            ) : (
              <div className="divide-y">
                {departures.map((r: any) => {
                  const room = r.rooms?.[0]?.room;
                  return (
                    <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{r.guest?.firstName} {r.guest?.lastName}</p>
                        <p className="text-xs text-muted-foreground">Room {room?.roomNumber ?? '—'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                          onClick={() => router.push(`/reservations/${r.id}/folio`)}
                        >
                          View Folio
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                          onClick={() => checkOutMutation.mutate(r.id)}
                          disabled={checkOutMutation.isPending}
                        >
                          Check Out
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Room Status Board */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BedDouble className="w-4 h-4" /> Room Status Board
            <Button variant="ghost" size="sm" className="ml-auto h-7 text-xs" onClick={() => router.push('/rooms')}>
              Manage Rooms <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roomsStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rooms configured</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
              {roomsStatus.map((room: any) => {
                const cfg = ROOM_STATUS_CONFIG[room.status] ?? ROOM_STATUS_CONFIG['AVAILABLE'];
                return (
                  <div
                    key={room.id}
                    className={`rounded-lg p-3 text-center cursor-pointer transition-opacity hover:opacity-80 ${cfg.color}`}
                    onClick={() => router.push('/rooms')}
                  >
                    <div className="font-bold text-lg leading-none">{room.roomNumber}</div>
                    <div className="text-xs mt-1 opacity-80">{room.category?.name ?? ''}</div>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-xs">{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
