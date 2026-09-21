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
import { roomsApi, shortStayApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const DURATION_PRESETS = [1, 3, 6, 12];
const DEPOSIT_METHODS = ['CASH', 'VISA', 'MASTERCARD', 'BANK_TRANSFER', 'ORANGE_MONEY', 'MTN_MOBILE_MONEY'];

interface Props { open: boolean; onOpenChange: (v: boolean) => void; propertyId: string; }

export function ShortStayDialog({ open, onOpenChange, propertyId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      roomId: '', guestName: '', guestPhone: '', durationHours: 3, hourlyRate: '',
      depositAmount: '', depositMethod: '', notes: '',
    },
  });

  useEffect(() => {
    if (open) reset({ roomId: '', guestName: '', guestPhone: '', durationHours: 3, hourlyRate: '', depositAmount: '', depositMethod: '', notes: '' });
  }, [open, reset]);

  const { data: roomsData } = useQuery({
    queryKey: ['rooms-available', propertyId],
    queryFn: () => roomsApi.list({ propertyId, status: 'AVAILABLE', limit: 200 }).then((r) => r.data),
    enabled: open && !!propertyId,
  });
  const rooms: any[] = Array.isArray(roomsData) ? roomsData : [];

  const durationHours = Number(watch('durationHours')) || 0;
  const hourlyRate = Number(watch('hourlyRate')) || 0;
  const total = durationHours * hourlyRate;
  const checkoutPreview = durationHours > 0 ? format(new Date(Date.now() + durationHours * 60 * 60 * 1000), 'h:mm a') : '—';

  const mutation = useMutation({
    mutationFn: (values: any) => shortStayApi.create({
      roomId: values.roomId,
      guestName: values.guestName || undefined,
      guestPhone: values.guestPhone || undefined,
      durationHours: Number(values.durationHours),
      hourlyRate: Number(values.hourlyRate),
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
                    <SelectItem key={r.id} value={r.id}>Room {r.roomNumber} — {r.category?.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
            {errors.roomId && <p className="text-xs text-destructive">Pick a room</p>}
            {rooms.length === 0 && <p className="text-xs text-muted-foreground">No available rooms right now.</p>}
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

          <div className="space-y-1.5">
            <Label className="text-xs">Duration</Label>
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
              <Input
                type="number"
                min="1"
                className="w-24 h-9"
                placeholder="Custom"
                {...register('durationHours', { required: true, min: 1 })}
              />
            </div>
            <p className="text-xs text-muted-foreground">Checkout at ~{checkoutPreview}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Hourly Rate ($) *</Label>
              <Input type="number" min="0" step="0.01" placeholder="15.00" {...register('hourlyRate', { required: true, min: 0 })} />
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
