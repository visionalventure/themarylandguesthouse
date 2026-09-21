'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Plus, Search, Phone, Mail, Loader2, PhoneCall, Users, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { inquiriesApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { ReservationFormDialog } from '@/app/reservations/components/reservation-form-dialog';

const TYPE_LABELS: Record<string, string> = {
  EVENT_PARTY: 'Event / Party',
  LONG_STAY: 'Long Stay',
  ROOM_BOOKING: 'Room Booking',
  OTHER: 'Other',
};

const CUSTOM_TYPE_SENTINEL = '__custom__';

// Which detail fields matter for each inquiry type, grouped into rows of up
// to two. Types with no entry here (custom categories, or before one is
// known) fall back to DEFAULT_FIELD_ROWS and show everything.
const TYPE_FIELD_ROWS: Record<string, string[][]> = {
  EVENT_PARTY: [['eventDate', 'partySize']],
  LONG_STAY: [['startDate', 'endDate'], ['partySize']],
  ROOM_BOOKING: [['startDate', 'endDate'], ['partySize']],
};
const DEFAULT_FIELD_ROWS = [['eventDate', 'partySize'], ['startDate', 'endDate']];

const FIELD_DEFS: Record<string, { label: string; type: string; props?: Record<string, any> }> = {
  eventDate: { label: 'Event Date', type: 'date' },
  startDate: { label: 'Start Date', type: 'date' },
  endDate: { label: 'End Date', type: 'date' },
  partySize: { label: 'Party Size', type: 'number', props: { min: '1', placeholder: '30' } },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NEW:       { label: 'New',       color: 'bg-primary/15 text-primary border-primary/30' },
  CONTACTED: { label: 'Contacted', color: 'bg-amber-500/15 text-amber-500 border-amber-500/30' },
  CONVERTED: { label: 'Converted', color: 'bg-green-500/15 text-green-500 border-green-500/30' },
  LOST:      { label: 'Lost',      color: 'bg-muted text-muted-foreground border-border' },
};

const SOURCE_OPTIONS = [
  'Word of mouth / Referral', 'Walk-in', 'Phone', 'WhatsApp', 'Social Media', 'Website', 'Repeat customer', 'Other',
];

function NewInquiryDialog({ open, onOpenChange, propertyId }: { open: boolean; onOpenChange: (v: boolean) => void; propertyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: typesData } = useQuery({
    queryKey: ['inquiry-types'],
    queryFn: () => inquiriesApi.types().then((r) => r.data),
    enabled: open,
  });
  const customTypes: string[] = typesData?.custom ?? [];

  const { register, handleSubmit, control, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      guestName: '', phone: '', email: '', type: 'ROOM_BOOKING', customType: '',
      eventDate: '', startDate: '', endDate: '', partySize: '', quotedPrice: '',
      source: '', notes: '',
    },
  });
  const typeValue = watch('type');
  const fieldRows = TYPE_FIELD_ROWS[typeValue] ?? DEFAULT_FIELD_ROWS;

  // Clear out whatever the previous type's fields held so switching, say,
  // Event/Party -> Room Booking doesn't silently submit a leftover Event Date.
  useEffect(() => {
    const visible = new Set(fieldRows.flat());
    (['eventDate', 'startDate', 'endDate', 'partySize'] as const).forEach((key) => {
      if (!visible.has(key)) setValue(key, '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeValue]);

  const mutation = useMutation({
    mutationFn: (values: any) => inquiriesApi.create({
      propertyId,
      guestName: values.guestName,
      phone: values.phone,
      email: values.email || undefined,
      type: values.type === CUSTOM_TYPE_SENTINEL ? values.customType.trim() : values.type,
      eventDate: values.eventDate || undefined,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
      partySize: values.partySize ? Number(values.partySize) : undefined,
      quotedPrice: values.quotedPrice ? Number(values.quotedPrice) : undefined,
      source: values.source || undefined,
      notes: values.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['inquiry-stats'] });
      queryClient.invalidateQueries({ queryKey: ['inquiry-types'] });
      toast({ title: 'Inquiry logged' });
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to log inquiry' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log a New Inquiry</DialogTitle>
          <DialogDescription>Capture the details of a customer inquiry, just like the front-desk notebook.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name *</Label>
              <Input {...register('guestName', { required: true })} placeholder="Stanley" />
              {errors.guestName && <p className="text-xs text-destructive">Name is required</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone *</Label>
              <Input {...register('phone', { required: true })} placeholder="0772066114" />
              {errors.phone && <p className="text-xs text-destructive">Phone is required</p>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input type="email" {...register('email')} placeholder="optional" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Inquiry Type</Label>
            <Controller name="type" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).filter(([v]) => v !== 'OTHER').map(([v, label]) => <SelectItem key={v} value={v}>{label}</SelectItem>)}
                  {customTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  <SelectItem value={CUSTOM_TYPE_SENTINEL}>+ Add new category…</SelectItem>
                </SelectContent>
              </Select>
            )} />
            {typeValue === CUSTOM_TYPE_SENTINEL && (
              <Input
                {...register('customType', { required: typeValue === CUSTOM_TYPE_SENTINEL })}
                placeholder="e.g. Catering, Airport Pickup"
                className="mt-1.5"
              />
            )}
            {errors.customType && <p className="text-xs text-destructive">Enter a name for the new category</p>}
          </div>
          {fieldRows.map((row) => (
            <div key={row.join('-')} className={cn('grid gap-3', row.length === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
              {row.map((key) => {
                const def = FIELD_DEFS[key];
                return (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{def.label}</Label>
                    <Input type={def.type} {...def.props} {...register(key as any)} />
                  </div>
                );
              })}
            </div>
          ))}
          <div className="space-y-1.5">
            <Label className="text-xs">Quoted Price ($)</Label>
            <Input type="number" min="0" step="0.01" {...register('quotedPrice')} placeholder="250" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">How did they discover us?</Label>
            <Controller name="source" control={control} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} {...register('notes')} placeholder="Help needed, follow-up details…" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Log Inquiry
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function InquiriesPage() {
  usePageTitle('Inquiries');
  const propertyId = useAuthStore((s) => s.propertyId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [newOpen, setNewOpen] = useState(false);
  const [convertPrefill, setConvertPrefill] = useState<any | null>(null);
  const [convertingInquiryId, setConvertingInquiryId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: stats } = useQuery({
    queryKey: ['inquiry-stats', propertyId],
    queryFn: () => inquiriesApi.stats(propertyId).then((r) => r.data),
    enabled: !!propertyId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['inquiries', propertyId, statusFilter, debouncedSearch],
    queryFn: () => inquiriesApi.list({
      propertyId,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: debouncedSearch || undefined,
      limit: 50,
    }).then((r) => r.data),
    enabled: !!propertyId,
  });

  const inquiries: any[] = data?.data ?? [];
  const byStatus = stats?.byStatus ?? {};

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => inquiriesApi.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['inquiry-stats'] });
      toast({ title: 'Status updated' });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to update status' }),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => inquiriesApi.prepareConversion(id).then((r) => r.data),
    onSuccess: (seed, id) => {
      setConvertingInquiryId(id);
      setConvertPrefill(seed);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to start conversion' }),
  });

  const linkMutation = useMutation({
    mutationFn: ({ id, reservationId }: { id: string; reservationId: string }) => inquiriesApi.convert(id, reservationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
      queryClient.invalidateQueries({ queryKey: ['inquiry-stats'] });
      toast({ title: 'Inquiry converted to reservation' });
    },
  });

  const formatRange = (i: any) => {
    if (i.eventDate) return format(new Date(i.eventDate), 'MMM d, yyyy');
    if (i.startDate && i.endDate) return `${format(new Date(i.startDate), 'MMM d')} – ${format(new Date(i.endDate), 'MMM d, yyyy')}`;
    if (i.startDate) return format(new Date(i.startDate), 'MMM d, yyyy');
    return '—';
  };

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inquiries</h1>
          <p className="text-muted-foreground text-sm">Track every customer inquiry from first contact to booking</p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Log Inquiry
        </Button>
      </div>

      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Inquiries', value: stats?.total ?? 0, icon: PhoneCall, color: 'text-primary' },
          { label: 'New',             value: byStatus.NEW ?? 0, icon: Clock, color: 'text-primary' },
          { label: 'Needs Follow-up', value: stats?.needsFollowUp ?? 0, icon: Users, color: 'text-amber-500' },
          { label: 'Converted',       value: byStatus.CONVERTED ?? 0, icon: CheckCircle2, color: 'text-green-500' },
        ].map((s) => (
          <StaggerItem key={s.label}>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <s.icon className={cn('w-8 h-8', s.color)} />
                  <div>
                    <AnimatedCounter value={s.value} className="text-2xl font-bold block" />
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGrid>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
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
          ) : inquiries.length === 0 ? (
            <div className="py-16 text-center">
              <PhoneCall className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">No inquiries yet</p>
              <p className="text-sm text-muted-foreground mt-1">Log your first customer inquiry to start tracking the pipeline.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Received</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Dates</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Party</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Quoted</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((i) => (
                  <tr key={i.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(i.inquiryDate), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{i.guestName}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{i.phone}</p>
                      {i.email && <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{i.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{TYPE_LABELS[i.type] ?? i.type}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatRange(i)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{i.partySize ?? '—'}</td>
                    <td className="px-4 py-3 text-xs font-medium">{i.quotedPrice ? `$${Number(i.quotedPrice).toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[140px] truncate" title={i.source ?? ''}>{i.source ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Select value={i.status} onValueChange={(v) => statusMutation.mutate({ id: i.id, status: v })}>
                        <SelectTrigger className={cn('h-7 w-32 text-xs border', STATUS_CONFIG[i.status]?.color)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([v, cfg]) => <SelectItem key={v} value={v}>{cfg.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {i.status === 'CONVERTED' ? (
                        <Badge variant="outline" className="text-xs border-green-500/30 text-green-500">
                          <CheckCircle2 className="w-3 h-3 mr-1" />Booked
                        </Badge>
                      ) : i.status === 'LOST' ? (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><XCircle className="w-3 h-3" />Lost</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={convertMutation.isPending}
                          onClick={() => convertMutation.mutate(i.id)}
                        >
                          {convertMutation.isPending && convertMutation.variables === i.id && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          Convert
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <NewInquiryDialog open={newOpen} onOpenChange={setNewOpen} propertyId={propertyId} />

      {convertPrefill && (
        <ReservationFormDialog
          open={!!convertPrefill}
          onOpenChange={(v) => { if (!v) { setConvertPrefill(null); setConvertingInquiryId(null); } }}
          propertyId={propertyId}
          initialData={convertPrefill}
          onSuccess={(reservation) => {
            if (convertingInquiryId) linkMutation.mutate({ id: convertingInquiryId, reservationId: reservation.id });
            setConvertPrefill(null);
            setConvertingInquiryId(null);
          }}
        />
      )}
    </FadeIn>
  );
}
