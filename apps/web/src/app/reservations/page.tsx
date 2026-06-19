'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  addDays, format, startOfToday, differenceInDays,
  parseISO, isToday, isBefore, isAfter,
} from 'date-fns';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, BedDouble, LayoutGrid, CalendarDays, LogIn, LogOut, FileText, Edit, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { reservationsApi, roomsApi } from '@/lib/api';
import { FadeIn } from '@/components/ui/fade-in';
import { cn } from '@/lib/utils';
import { ReservationFormDialog } from './components/reservation-form-dialog';
import { useToast } from '@/hooks/use-toast';

import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';
const DAYS_VISIBLE = 14;
const CELL_W = 52;          // px per date column
const ROOM_H = 52;          // px per room row
const CAT_H = 30;           // px per category header row
const DATE_H = 56;          // px for the date header strip
const ROOM_COL_W = 172;     // px for the left room-label column

// Bar color classes by reservation STATUS (primary) rather than source
const BAR_COLORS: Record<string, string> = {
  RESERVED:     'bg-amber-500 border-amber-600 text-white',
  CONFIRMED:    'bg-blue-500 border-blue-600 text-white',
  CHECKED_IN:   'bg-green-600 border-green-700 text-white',
  CHECKED_OUT:  'bg-slate-400 border-slate-500 text-white',
  CANCELLED:    'bg-red-400 border-red-500 text-white opacity-60',
  NO_SHOW:      'bg-red-600 border-red-700 text-white opacity-60',
  PENDING:      'bg-yellow-400 border-yellow-500 text-gray-900',
  WAITLISTED:   'bg-purple-400 border-purple-500 text-white',
};
const BAR_DEFAULT = 'bg-secondary border-border text-foreground';

// Source label shortcodes for display in bars
const SOURCE_LABELS: Record<string, string> = {
  WALK_IN:      'Walk-In',
  PHONE:        'Phone',
  WHATSAPP:     'WhatsApp',
  EMAIL:        'Email',
  CORPORATE:    'Corp',
  TRAVEL_AGENT: 'TA',
  DIRECT:       'Direct',
  OTA:          'OTA',
  ONLINE:       'Online',
};

const PAYMENT_BADGE: Record<string, string> = {
  PAID:      'bg-green-500/25 text-green-400 border-green-500/40',
  PART_PAID: 'bg-amber-500/25 text-amber-400 border-amber-500/40',
  UNPAID:    'bg-red-500/25 text-red-400 border-red-500/40',
};

// ── Demo fallback data ────────────────────────────────────────────────────────

const DEMO_ROOMS = [
  { id: 'r1', roomNumber: '101', status: 'OCCUPIED',     category: { id: 'c1', name: 'Standard' } },
  { id: 'r2', roomNumber: '102', status: 'AVAILABLE',    category: { id: 'c1', name: 'Standard' } },
  { id: 'r3', roomNumber: '103', status: 'AVAILABLE',    category: { id: 'c1', name: 'Standard' } },
  { id: 'r4', roomNumber: '201', status: 'OCCUPIED',     category: { id: 'c2', name: 'Comfort' } },
  { id: 'r5', roomNumber: '202', status: 'AVAILABLE',    category: { id: 'c2', name: 'Comfort' } },
  { id: 'r6', roomNumber: '301', status: 'OCCUPIED',     category: { id: 'c3', name: 'Suite' } },
  { id: 'r7', roomNumber: '302', status: 'MAINTENANCE',  category: { id: 'c3', name: 'Suite' } },
];

function makeDemoReservations() {
  const t = startOfToday();
  return [
    { id: '1', reservationNo: 'RES-001', status: 'CHECKED_IN', source: 'DIRECT',    paymentStatus: 'PAID',      guest: { firstName: 'James',   lastName: 'Wilson'   }, checkIn: format(addDays(t, -2), 'yyyy-MM-dd'), checkOut: format(addDays(t, 2),  'yyyy-MM-dd'), rooms: [{ roomId: 'r1' }] },
    { id: '2', reservationNo: 'RES-002', status: 'CONFIRMED',  source: 'OTA',       paymentStatus: 'PART_PAID', guest: { firstName: 'Sarah',   lastName: 'Johnson'  }, checkIn: format(addDays(t,  1), 'yyyy-MM-dd'), checkOut: format(addDays(t, 4),  'yyyy-MM-dd'), rooms: [{ roomId: 'r2' }] },
    { id: '3', reservationNo: 'RES-003', status: 'RESERVED',   source: 'ONLINE',    paymentStatus: 'UNPAID',    guest: { firstName: 'Michael', lastName: 'Brown'    }, checkIn: format(addDays(t,  3), 'yyyy-MM-dd'), checkOut: format(addDays(t, 6),  'yyyy-MM-dd'), rooms: [{ roomId: 'r3' }] },
    { id: '4', reservationNo: 'RES-004', status: 'CHECKED_IN', source: 'DIRECT',    paymentStatus: 'PAID',      guest: { firstName: 'Emma',    lastName: 'Davis'    }, checkIn: format(addDays(t, -1), 'yyyy-MM-dd'), checkOut: format(addDays(t, 3),  'yyyy-MM-dd'), rooms: [{ roomId: 'r4' }] },
    { id: '5', reservationNo: 'RES-005', status: 'CONFIRMED',  source: 'CORPORATE', paymentStatus: 'PAID',      guest: { firstName: 'Robert',  lastName: 'Smith'    }, checkIn: format(addDays(t,  2), 'yyyy-MM-dd'), checkOut: format(addDays(t, 5),  'yyyy-MM-dd'), rooms: [{ roomId: 'r6' }] },
    { id: '6', reservationNo: 'RES-006', status: 'CHECKED_IN', source: 'WALK_IN',   paymentStatus: 'PAID',      guest: { firstName: 'Lisa',    lastName: 'Martinez' }, checkIn: format(t,             'yyyy-MM-dd'), checkOut: format(addDays(t, 2),  'yyyy-MM-dd'), rooms: [{ roomId: 'r5' }] },
    { id: '7', reservationNo: 'RES-007', status: 'RESERVED',   source: 'ONLINE',    paymentStatus: 'UNPAID',    guest: { firstName: 'Carlos',  lastName: 'Reyes'    }, checkIn: format(addDays(t,  5), 'yyyy-MM-dd'), checkOut: format(addDays(t, 9),  'yyyy-MM-dd'), rooms: [{ roomId: 'r7' }] },
    { id: '8', reservationNo: 'RES-008', status: 'CONFIRMED',  source: 'DIRECT',    paymentStatus: 'PART_PAID', guest: { firstName: 'Anna',    lastName: 'Kovacs'   }, checkIn: format(addDays(t,  6), 'yyyy-MM-dd'), checkOut: format(addDays(t, 10), 'yyyy-MM-dd'), rooms: [{ roomId: 'r1' }] },
  ];
}

// ── Types ─────────────────────────────────────────────────────────────────────

type RowEntry =
  | { kind: 'category'; name: string; y: number }
  | { kind: 'room'; room: any; y: number };

// ── Main component ────────────────────────────────────────────────────────────

export default function ReservationsPage() {
  usePageTitle('Reservations');
  const propertyId = useAuthStore((s) => s.propertyId);
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const today = startOfToday();
  const [viewMode, setViewMode] = useState<'gantt' | 'grid'>('gantt');
  const [windowOffset, setWindowOffset] = useState(-2);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editReservation, setEditReservation] = useState<any>(null);
  const [activePopover, setActivePopover] = useState<string | null>(null);

  const checkInMutation = useMutation({
    mutationFn: (id: string) => reservationsApi.checkIn(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reservations-calendar'] }); toast({ title: 'Guest checked in' }); setActivePopover(null); },
    onError: () => toast({ variant: 'destructive', title: 'Check-in failed' }),
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: string) => reservationsApi.checkOut(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reservations-calendar'] }); toast({ title: 'Guest checked out' }); setActivePopover(null); },
    onError: () => toast({ variant: 'destructive', title: 'Check-out failed' }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reservations-calendar'] }); toast({ title: 'Reservation cancelled' }); setActivePopover(null); },
    onError: () => toast({ variant: 'destructive', title: 'Cancel failed' }),
  });

  const windowStart = addDays(today, windowOffset);
  const windowEnd   = addDays(windowStart, DAYS_VISIBLE - 1);

  const dates = useMemo(
    () => Array.from({ length: DAYS_VISIBLE }, (_, i) => addDays(windowStart, i)),
    [windowStart],
  );

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: roomsData } = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: () => roomsApi.list({ propertyId: propertyId, limit: 200 }).then((r) => r.data),
    placeholderData: { data: DEMO_ROOMS },
  });

  const { data: calendarData } = useQuery({
    queryKey: [
      'reservations-calendar', propertyId,
      format(windowStart, 'yyyy-MM-dd'),
      format(windowEnd, 'yyyy-MM-dd'),
    ],
    queryFn: () =>
      reservationsApi.calendar({
        propertyId: propertyId,
        startDate: format(windowStart, 'yyyy-MM-dd'),
        endDate:   format(windowEnd, 'yyyy-MM-dd'),
      }).then((r) => r.data),
    placeholderData: makeDemoReservations(),
  });

  // Fall back to demo data when DB is empty so the Gantt has something to show
  const roomsArray: any[] = roomsData?.data ?? (Array.isArray(roomsData) ? roomsData : []);
  const rooms: any[] = roomsArray.length ? roomsArray : DEMO_ROOMS;
  const rawCalendar: any[] = Array.isArray(calendarData) ? calendarData : [];

  // Normalise calendar entries: real data uses rooms[].roomId, demo uses rooms[].roomId
  // When DB is empty, show demo reservations keyed to DEMO_ROOMS so bars render
  const reservations: any[] = rawCalendar.length > 0 ? rawCalendar : makeDemoReservations();

  // ── Filtered + grouped rooms ───────────────────────────────────────────────

  const filteredRooms = useMemo(() => {
    if (!search) return rooms;
    const q = search.toLowerCase();
    return rooms.filter(
      (r) => r.roomNumber.toLowerCase().includes(q) || r.category?.name?.toLowerCase().includes(q),
    );
  }, [rooms, search]);

  const groupedRooms = useMemo(() => {
    const groups = new Map<string, any[]>();
    filteredRooms.forEach((room) => {
      const cat = room.category?.name ?? 'Uncategorized';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(room);
    });
    return groups;
  }, [filteredRooms]);

  // ── Flat row list with Y offsets (shared by left panel + right grid) ───────

  const { rows, roomYMap, totalHeight } = useMemo(() => {
    const rows: RowEntry[] = [];
    const roomYMap = new Map<string, number>();
    let y = 0;
    groupedRooms.forEach((catRooms, catName) => {
      rows.push({ kind: 'category', name: catName, y });
      y += CAT_H;
      catRooms.forEach((room) => {
        rows.push({ kind: 'room', room, y });
        roomYMap.set(room.id, y);
        y += ROOM_H;
      });
    });
    return { rows, roomYMap, totalHeight: y };
  }, [groupedRooms]);

  // ── Status chip counts ─────────────────────────────────────────────────────

  const { occupied, checkInOut, reserved } = useMemo(() => {
    const todayStr = format(today, 'yyyy-MM-dd');
    return {
      occupied:   reservations.filter((r) => r.status === 'CHECKED_IN').length,
      checkInOut: reservations.filter((r) => r.checkIn === todayStr || r.checkOut === todayStr).length,
      reserved:   reservations.filter((r) => r.status === 'RESERVED' || r.status === 'CONFIRMED').length,
    };
  }, [reservations, today]);

  // ── Reservation bar geometry ───────────────────────────────────────────────

  const bars = useMemo(() => {
    const result: any[] = [];
    const windowEndExcl = addDays(windowEnd, 1);

    reservations.forEach((res) => {
      const roomIds: string[] = res.rooms
        ? res.rooms.map((rr: any) => rr.roomId ?? rr.room?.id).filter(Boolean)
        : res.roomId ? [res.roomId] : [];

      roomIds.forEach((roomId) => {
        const roomY = roomYMap.get(roomId);
        if (roomY === undefined) return;

        const checkIn  = parseISO(res.checkIn);
        const checkOut = parseISO(res.checkOut);

        // Skip if entirely outside the visible window
        if (isBefore(checkOut, windowStart) || isAfter(checkIn, windowEnd)) return;

        const clampedStart = isBefore(checkIn, windowStart) ? windowStart : checkIn;
        const clampedEnd   = isAfter(checkOut, windowEndExcl) ? windowEndExcl : checkOut;

        const leftDays  = differenceInDays(clampedStart, windowStart);
        const widthDays = differenceInDays(clampedEnd, clampedStart);
        if (widthDays <= 0) return;

        result.push({
          id:           `${res.id}-${roomId}`,
          res,
          left:         leftDays * CELL_W + 2,
          width:        widthDays * CELL_W - 4,
          top:          roomY + 6,
          height:       ROOM_H - 12,
          barClass:     BAR_COLORS[res.status] ?? BAR_DEFAULT,
          paymentClass: PAYMENT_BADGE[res.paymentStatus] ?? PAYMENT_BADGE.UNPAID,
          startClipped: isBefore(checkIn, windowStart),
          endClipped:   isAfter(checkOut, windowEndExcl),
        });
      });
    });
    return result;
  }, [reservations, roomYMap, windowStart, windowEnd]);

  // ── Today indicator ────────────────────────────────────────────────────────

  const todayColIdx   = differenceInDays(today, windowStart);
  const todayLineX    = todayColIdx * CELL_W + CELL_W / 2;
  const showTodayLine = todayColIdx >= 0 && todayColIdx < DAYS_VISIBLE;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <FadeIn className="space-y-4">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reservations</h1>
          <p className="text-muted-foreground text-sm">Room timeline — booking calendar view</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="icon"
            onClick={() => setShowSearch((s) => !s)}
            className={showSearch ? 'bg-muted' : ''}
          >
            <Search className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            title={viewMode === 'gantt' ? 'Switch to Grid View' : 'Switch to Gantt View'}
            onClick={() => setViewMode(v => v === 'gantt' ? 'grid' : 'gantt')}
          >
            {viewMode === 'gantt' ? <LayoutGrid className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />}
          </Button>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Reservation
          </Button>
        </div>
      </div>

      {/* ── Status chips + date nav ───────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <StatusChip
          dotClass="bg-primary"
          wrapClass="bg-primary/10 border border-primary/25 text-primary"
          label="Occupied" count={occupied}
        />
        <StatusChip
          dotClass="bg-[#8DD1B6]"
          wrapClass="bg-[#8DD1B6]/10 border border-[#8DD1B6]/25 text-[#8DD1B6]"
          label="Check-in / Check-out" count={checkInOut}
        />
        <StatusChip
          dotClass="bg-[#F9CDD0]"
          wrapClass="bg-[#F9CDD0]/10 border border-[#F9CDD0]/25 text-[#F9CDD0]"
          label="Reserved" count={reserved}
        />

        {/* Date window navigator */}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setWindowOffset((o) => o - 7)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground min-w-[130px] text-center select-none">
            {format(windowStart, 'MMM d')} – {format(windowEnd, 'MMM d, yyyy')}
          </span>
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setWindowOffset((o) => o + 7)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="text-xs ml-2 h-7"
            onClick={() => setWindowOffset(-2)}>
            Today
          </Button>
        </div>
      </div>

      {/* ── Collapsible search ───────────────────────────────────── */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by room number or category..."
                className="pl-9 h-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Grid availability view ────────────────────────────────── */}
      {viewMode === 'grid' && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {rooms.map(room => {
              const todayStr = format(today, 'yyyy-MM-dd');
              const occupying = reservations.find(r =>
                r.rooms?.some((rr: any) => (rr.roomId ?? rr.room?.id) === room.id) &&
                r.status === 'CHECKED_IN' &&
                r.checkIn <= todayStr && r.checkOut > todayStr
              );
              const checking_in = reservations.find(r =>
                r.rooms?.some((rr: any) => (rr.roomId ?? rr.room?.id) === room.id) &&
                r.checkIn === todayStr && ['RESERVED', 'CONFIRMED'].includes(r.status)
              );
              const status = occupying ? 'OCCUPIED' : checking_in ? 'ARRIVING' : room.status;
              const STATUS_CARD: Record<string, string> = {
                AVAILABLE: 'bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-400',
                OCCUPIED: 'bg-primary/10 border-primary/40 text-primary',
                ARRIVING: 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-400',
                CLEANING: 'bg-violet-500/10 border-violet-500/40 text-violet-700 dark:text-violet-400',
                MAINTENANCE: 'bg-red-500/10 border-red-500/40 text-red-700 dark:text-red-400',
              };
              return (
                <div
                  key={room.id}
                  className={cn('border rounded-xl p-4 text-center space-y-1 transition-all', STATUS_CARD[status] ?? 'bg-muted border-border text-muted-foreground')}
                >
                  <p className="text-xl font-bold">{room.roomNumber}</p>
                  <p className="text-[10px] font-medium">{room.category?.name ?? '—'}</p>
                  <p className="text-[11px] font-semibold capitalize">{status.toLowerCase().replace('_', ' ')}</p>
                  {occupying && (
                    <p className="text-[9px] opacity-70 truncate">{occupying.guest?.firstName} {occupying.guest?.lastName}</p>
                  )}
                  {checking_in && (
                    <p className="text-[9px] opacity-70 truncate">CI: {checking_in.guest?.firstName} {checking_in.guest?.lastName}</p>
                  )}
                  {status === 'AVAILABLE' && (
                    <button
                      className="text-[10px] font-medium px-2 py-0.5 mt-1 rounded-full border border-green-500/50 bg-green-500/15 hover:bg-green-500/25 transition-colors"
                      onClick={() => setDialogOpen(true)}
                    >
                      Book
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            {[
              { label: 'Available', cls: 'bg-green-500/15 border-green-500/40' },
              { label: 'Occupied', cls: 'bg-primary/15 border-primary/40' },
              { label: 'Arriving Today', cls: 'bg-amber-500/15 border-amber-500/40' },
              { label: 'Cleaning', cls: 'bg-violet-500/15 border-violet-500/40' },
              { label: 'Maintenance', cls: 'bg-red-500/15 border-red-500/40' },
            ].map(({ label, cls }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={cn('w-3 h-3 rounded border', cls)} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Gantt calendar grid ──────────────────────────────────── */}
      {viewMode === 'gantt' && (<div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex">

          {/* ── Left: room-label column ─────────────────────────── */}
          <div
            className="flex-shrink-0 border-r border-border"
            style={{ width: ROOM_COL_W }}
          >
            {/* Column header */}
            <div
              className="flex items-center gap-2 px-4 border-b border-border bg-muted/50"
              style={{ height: DATE_H }}
            >
              <BedDouble className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Room
              </span>
            </div>

            {/* Room rows (mirrors right-panel row heights exactly) */}
            {rows.map((row) =>
              row.kind === 'category' ? (
                <div
                  key={`label-cat-${row.name}`}
                  className="flex items-center px-4 bg-muted/50 border-b border-border"
                  style={{ height: CAT_H }}
                >
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {row.name}
                  </span>
                </div>
              ) : (
                <div
                  key={`label-room-${row.room.id}`}
                  className="flex items-center px-4 gap-2.5 border-b border-border/30"
                  style={{ height: ROOM_H }}
                >
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      row.room.status === 'OCCUPIED'    ? 'bg-primary' :
                      row.room.status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-green-500',
                    )}
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-none">
                      {row.room.roomNumber}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">
                      {(row.room.status ?? 'available').toLowerCase().replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>

          {/* ── Right: scrollable date columns + grid ───────────── */}
          <div className="flex-1 overflow-x-auto">

            {/* Date header strip */}
            <div
              className="flex border-b border-border bg-card sticky top-0 z-10"
              style={{ minWidth: DAYS_VISIBLE * CELL_W, height: DATE_H }}
            >
              {dates.map((date, i) => {
                const isT = isToday(date);
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex-shrink-0 flex flex-col items-center justify-center border-r border-border/40',
                      isT && 'bg-primary/10',
                    )}
                    style={{ width: CELL_W }}
                  >
                    <span className={cn('text-[9px] font-bold uppercase tracking-wider', isT ? 'text-primary' : 'text-muted-foreground')}>
                      {format(date, 'EEE')}
                    </span>
                    <span className={cn('text-base font-bold leading-none mt-0.5', isT ? 'text-primary' : 'text-foreground')}>
                      {format(date, 'd')}
                    </span>
                    <span className={cn('text-[8px] leading-none mt-0.5', isT ? 'text-primary/70' : 'text-muted-foreground')}>
                      {format(date, 'MMM')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Grid body */}
            <div
              className="relative"
              style={{ height: totalHeight, minWidth: DAYS_VISIBLE * CELL_W }}
            >
              {/* Day column backgrounds + vertical grid lines */}
              {dates.map((date, i) => (
                <div
                  key={i}
                  className={cn(
                    'absolute top-0 bottom-0 border-r border-border/20',
                    isToday(date) && 'bg-primary/5',
                  )}
                  style={{ left: i * CELL_W, width: CELL_W }}
                />
              ))}

              {/* Row backgrounds & separators matching the left panel */}
              {rows.map((row) =>
                row.kind === 'category' ? (
                  <div
                    key={`grid-cat-${row.name}`}
                    className="absolute left-0 right-0 bg-muted/40 border-b border-border"
                    style={{ top: row.y, height: CAT_H }}
                  />
                ) : (
                  <div
                    key={`grid-room-${row.room.id}`}
                    className="absolute left-0 right-0 border-b border-border/20"
                    style={{ top: row.y + ROOM_H - 1, height: 1 }}
                  />
                ),
              )}

              {/* Today vertical indicator line */}
              {showTodayLine && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-primary/50 z-10 pointer-events-none"
                  style={{ left: todayLineX }}
                >
                  {/* Dot at top */}
                  <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-primary/70" />
                </div>
              )}

              {/* ── Reservation bars ─────────────────────────────── */}
              {bars.map((bar) => (
                <Popover key={bar.id} open={activePopover === bar.id} onOpenChange={(o: boolean) => setActivePopover(o ? bar.id : null)}>
                  <PopoverTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0.88 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className={cn(
                        'absolute flex items-center gap-1.5 px-2 rounded border overflow-hidden z-20',
                        'text-xs font-medium select-none cursor-pointer',
                        'hover:brightness-110 active:brightness-95 transition-[filter] duration-100',
                        bar.barClass,
                        bar.startClipped && 'rounded-l-none border-l-2',
                        bar.endClipped   && 'rounded-r-none border-r-2',
                      )}
                      style={{
                        left:   bar.left,
                        width:  bar.width,
                        top:    bar.top,
                        height: bar.height,
                      }}
                      title={`${bar.res.guest.firstName} ${bar.res.guest.lastName} · ${bar.res.reservationNo}`}
                    >
                  {/* Guest name */}
                  <span className="truncate font-semibold text-[11px]">
                    {bar.res.guest.firstName} {bar.res.guest.lastName}
                  </span>

                  {/* Source label (only if wide enough) */}
                  {bar.width > 96 && (
                    <span className="opacity-60 text-[9px] truncate flex-shrink-0">
                      {SOURCE_LABELS[bar.res.source] ?? bar.res.source?.replace('_', '-')}
                    </span>
                  )}

                  {/* Payment badge (only if wide enough) */}
                  {bar.width > 140 && bar.res.paymentStatus && (
                    <span
                      className={cn(
                        'ml-auto flex-shrink-0 text-[8px] px-1.5 py-px rounded-full border font-bold',
                        bar.paymentClass,
                      )}
                    >
                      {bar.res.paymentStatus === 'PAID'
                        ? 'Paid'
                        : bar.res.paymentStatus === 'PART_PAID'
                        ? 'Part'
                        : 'Unpaid'}
                    </span>
                  )}
                    </motion.div>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="start" className="w-48 p-1 z-50">
                    <p className="text-xs font-semibold px-2 py-1 text-muted-foreground truncate">
                      {bar.res.guest.firstName} {bar.res.guest.lastName}
                    </p>
                    <p className="text-[10px] px-2 pb-1 text-muted-foreground">{bar.res.reservationNo}</p>
                    <div className="border-t my-1" />
                    {['RESERVED', 'CONFIRMED'].includes(bar.res.status) && (
                      <button
                        className="w-full flex items-center gap-2 text-xs px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
                        onClick={() => checkInMutation.mutate(bar.res.id)}
                      >
                        <LogIn className="w-3.5 h-3.5 text-green-600" /> Check In
                      </button>
                    )}
                    {bar.res.status === 'CHECKED_IN' && (
                      <button
                        className="w-full flex items-center gap-2 text-xs px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
                        onClick={() => router.push(`/reservations/${bar.res.id}/folio`)}
                      >
                        <LogOut className="w-3.5 h-3.5 text-amber-600" /> Check Out / Folio
                      </button>
                    )}
                    <button
                      className="w-full flex items-center gap-2 text-xs px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
                      onClick={() => router.push(`/reservations/${bar.res.id}/folio`)}
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" /> View Folio
                    </button>
                    <button
                      className="w-full flex items-center gap-2 text-xs px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
                      onClick={() => { setEditReservation(bar.res); setDialogOpen(true); setActivePopover(null); }}
                    >
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    {!['CHECKED_OUT', 'CANCELLED'].includes(bar.res.status) && (
                      <button
                        className="w-full flex items-center gap-2 text-xs px-2 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded cursor-pointer"
                        onClick={() => cancelMutation.mutate(bar.res.id)}
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}
                  </PopoverContent>
                </Popover>
              ))}
            </div>
          </div>
        </div>
      </div>)}

      {/* ── Status legend ─────────────────────────────────────────── */}
      {viewMode === 'gantt' && <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pb-1">
        <span className="font-medium text-foreground">Status:</span>
        {Object.entries(BAR_COLORS).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={cn('w-3 h-3 rounded-sm border', cls)} />
            <span className="capitalize">{status.toLowerCase().replace('_', ' ')}</span>
          </div>
        ))}
      </div>}

      {/* ── New / Edit Reservation dialog ─────────────────────────── */}
      <ReservationFormDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditReservation(null); }}
        propertyId={propertyId}
        initialData={editReservation}
      />

    </FadeIn>
  );
}

// ── StatusChip sub-component ──────────────────────────────────────────────────

function StatusChip({
  dotClass,
  wrapClass,
  label,
  count,
}: {
  dotClass: string;
  wrapClass: string;
  label: string;
  count: number;
}) {
  return (
    <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium', wrapClass)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotClass)} />
      {label}
      <span className="ml-1 font-bold tabular-nums">
        {String(count).padStart(2, '0')}
      </span>
    </div>
  );
}
