'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { guestsApi, shortStayApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const DURATION_PRESETS = [1, 2, 3];
const DEPOSIT_METHODS = ['CASH', 'VISA', 'MASTERCARD', 'BANK_TRANSFER', 'ORANGE_MONEY', 'MTN_MOBILE_MONEY'];

interface Props { open: boolean; onOpenChange: (v: boolean) => void; propertyId: string; }

export function ShortStayDialog({ open, onOpenChange, propertyId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      roomId: '', guestId: '', guestName: '', guestPhone: '', checkIn: '', durationHours: 1,
      depositAmount: '', depositMethod: '', notes: '',
    },
  });

  useEffect(() => {
    if (open) reset({ roomId: '', guestId: '', guestName: '', guestPhone: '', checkIn: '', durationHours: 1, depositAmount: '', depositMethod: '', notes: '' });
  }, [open, reset]);

  const { data: roomsData } = useQuery({
    queryKey: ['short-stay-eligible-rooms', propertyId],
    queryFn: () => shortStayApi.eligibleRooms(propertyId).then((r) => r.data),
    enabled: open && !!propertyId,
  });
  const rooms: any[] = Array.isArray(roomsData) ? roomsData : [];

  const { data: guestsData } = useQuery({
    queryKey: ['guests-for-short-stay', propertyId],
    queryFn: () => guestsApi.list({ propertyId, limit: 200 }).then((r) => r.data),
    enabled: open && !!propertyId,
  });
  const guests: any[] = guestsData?.data ?? [];

  const roomId = watch('roomId');
  const selectedRoom = rooms.find((r) => r.id === roomId);
  const hourlyRate = Number(selectedRoom?.shortStayOffer?.hourlyRate) || 0;

  const durationHours = Number(watch('durationHours')) || 0;
  const total = durationHours * hourlyRate;
  const checkInValue = watch('checkIn');
  const checkInBase = checkInValue ? new Date(checkInValue).getTime() : Date.now();
  const checkoutPreview = durationHours > 0 ? format(new Date(checkInBase + durationHours * 60 * 60 * 1000), 'MMM d, h:mm a') : '—';

  const mutation = useMutation({
    mutationFn: (values: any) => shortStayApi.create({
      roomId: values.roomId,
      checkIn: values.checkIn ? new Date(values.checkIn).toISOString() : undefined,
      guestId: values.guestId || undefined,
      guestName: values.guestName || undefined,
      guestPhone: values.guestPhone || undefined,
      durationHours: Number(values.durationHours),
      depositAmount: values.depositAmount ? Number(values.depositAmount) : undefined,
      depositMethod: values.depositAmount ? (values.depositMethod || 'CASH') : undefined,
      notes: values.notes || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['short-stays'] });
      queryClient.invalidateQueries({ queryKey: ['short-stay-stats'] });
      toast({ title: 'Guest checked in' });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to check in guest' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Short Stay</DialogTitle>
          <DialogDescription>Check in an hourly guest — a name isn't required.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Room *</Label>
            <Controller name="roomId" control={control} rules={{ required: true }} render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue placeholder="Select an available room…" /></SelectTrigger>
                <SelectContent>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      Room {r.roomNumber} — {r.category?.name} (${Number(r.shortStayOffer?.hourlyRate).toFixed(2)}/hr — {r.shortStayOffer?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
            {errors.roomId && <p className="text-xs text-destructive">Pick a room</p>}
            {rooms.length === 0 && <p className="text-xs text-muted-foreground">No rooms with a short stay offer assigned right now — ask a super admin to set one up.</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Guest Name (optional)</Label>
              <Input {...register('guestName')} placeholder="Walk-in guest" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone (optional)</Label>
              <Input {...register('guestPhone')} placeholder="optional" />
            </div>
          </div>

          {guests.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Link Existing Guest (optional)</Label>
              <Controller name="guestId" control={control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="None — treat as a new/anonymous guest" /></SelectTrigger>
                  <SelectContent>
                    {guests.map((g: any) => (
                      <SelectItem key={g.id} value={g.id}>{g.firstName} {g.lastName}{g.phone ? ` · ${g.phone}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              <p className="text-xs text-muted-foreground">Linking a guest enables loyalty points on checkout.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Check-in Time (optional)</Label>
            <Input type="datetime-local" {...register('checkIn')} />
            <p className="text-xs text-muted-foreground">Leave blank to use the current time. Set this when logging a stay that already started.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Duration (max 3 hours)</Label>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map((h) => (
                <Button
                  key={h}
                  type="button"
                  size="sm"
                  variant={durationHours === h ? 'default' : 'outline'}
                  className={cn(durationHours === h && 'bg-primary text-primary-foreground')}
                  onClick={() => setValue('durationHours', h)}
                >
                  {h}h
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Checkout at ~{checkoutPreview}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Hourly Rate</Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-muted/40 text-sm">
                {selectedRoom ? `$${hourlyRate.toFixed(2)} (${selectedRoom.shortStayOffer?.name})` : '— select a room —'}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Total</Label>
              <div className="h-9 flex items-center px-3 rounded-md border bg-muted/40 font-semibold text-sm">
                ${total.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Deposit (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ss-depositAmount">Amount</Label>
                <Input id="ss-depositAmount" type="number" min="0" step="0.01" placeholder="0.00" {...register('depositAmount')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ss-depositMethod">Payment Method</Label>
                <Select onValueChange={(v) => setValue('depositMethod', v)} defaultValue="">
                  <SelectTrigger id="ss-depositMethod"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {DEPOSIT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Check In Guest
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
