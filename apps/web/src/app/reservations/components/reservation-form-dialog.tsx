'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { reservationsApi, guestsApi, roomsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const SOURCES = ['DIRECT', 'ONLINE', 'OTA', 'WALK_IN', 'CORPORATE'];

const schema = z.object({
  guestId:         z.string().min(1, 'Guest is required'),
  roomId:          z.string().min(1, 'Room is required'),
  checkIn:         z.string().min(1, 'Check-in date is required'),
  checkOut:        z.string().min(1, 'Check-out date is required'),
  adults:          z.string().min(1),
  children:        z.string(),
  source:          z.string().min(1, 'Source is required'),
  specialRequests: z.string().optional(),
}).refine((d) => new Date(d.checkOut) > new Date(d.checkIn), {
  message: 'Check-out must be after check-in',
  path: ['checkOut'],
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  initialData?: any; // existing reservation for edit mode
}

export function ReservationFormDialog({ open, onOpenChange, propertyId, initialData }: Props) {
  const isEdit = !!initialData?.id;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: guestsData } = useQuery({
    queryKey: ['guests-for-reservation', propertyId],
    queryFn: () => guestsApi.list({ propertyId, limit: 200 }).then((r) => r.data),
    enabled: open,
  });

  const { data: roomsData } = useQuery({
    queryKey: ['all-rooms', propertyId],
    queryFn: () => roomsApi.list({ propertyId, limit: 200 }).then((r) => r.data),
    enabled: open,
  });

  const guests: any[] = guestsData?.data ?? [];
  const rooms: any[] = roomsData?.data ?? [];

  const blankDefaults = {
    guestId: '', roomId: '', checkIn: '', checkOut: '',
    adults: '1', children: '0', source: 'DIRECT', specialRequests: '',
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: blankDefaults,
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          guestId: initialData.guest?.id ?? initialData.guestId ?? '',
          roomId: initialData.rooms?.[0]?.roomId ?? '',
          checkIn: initialData.checkIn?.slice(0, 10) ?? '',
          checkOut: initialData.checkOut?.slice(0, 10) ?? '',
          adults: String(initialData.adults ?? 1),
          children: String(initialData.children ?? 0),
          source: initialData.source ?? 'DIRECT',
          specialRequests: initialData.specialRequests ?? '',
        });
      } else {
        form.reset(blankDefaults);
      }
    }
  }, [open, initialData, form]);

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        propertyId,
        guestId:         values.guestId,
        checkIn:         new Date(values.checkIn).toISOString(),
        checkOut:        new Date(values.checkOut).toISOString(),
        adults:          Number(values.adults),
        children:        Number(values.children),
        source:          values.source,
        status:          isEdit ? initialData.status : 'RESERVED',
        totalAmount:     0,
        specialRequests: values.specialRequests,
        ...(!isEdit && { rooms: { create: [{ roomId: values.roomId }] } }),
      };
      return isEdit
        ? reservationsApi.update(initialData.id, payload)
        : reservationsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: isEdit ? 'Reservation updated' : 'Reservation created successfully' });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        variant: 'destructive',
        title: isEdit ? 'Failed to update reservation' : 'Failed to create reservation',
        description: err.response?.data?.message || 'Something went wrong',
      });
    },
  });

  const onSubmit = (values: FormValues) => mutation.mutate(values);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Reservation — ${initialData?.reservationNo ?? ''}` : 'New Reservation'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update reservation details.' : 'Book a room for a guest. Status will be set to Reserved.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

          {/* Guest */}
          <div className="space-y-2">
            <Label>Guest</Label>
            {guests.length > 0 ? (
              <Select
                value={form.watch('guestId')}
                onValueChange={(v) => form.setValue('guestId', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select guest" />
                </SelectTrigger>
                <SelectContent>
                  {guests.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.firstName} {g.lastName}
                      {g.email ? ` · ${g.email}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Paste guest ID (no guests in DB yet)"
                {...form.register('guestId')}
              />
            )}
            {form.formState.errors.guestId && (
              <p className="text-destructive text-xs">{form.formState.errors.guestId.message}</p>
            )}
          </div>

          {/* Room */}
          <div className="space-y-2">
            <Label>Room</Label>
            {rooms.length > 0 ? (
              <Select
                value={form.watch('roomId')}
                onValueChange={(v) => form.setValue('roomId', v, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select available room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      Room {r.roomNumber} — {r.category?.name ?? 'Uncategorized'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="Paste room ID (no available rooms found)"
                {...form.register('roomId')}
              />
            )}
            {form.formState.errors.roomId && (
              <p className="text-destructive text-xs">{form.formState.errors.roomId.message}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="checkIn">Check-in</Label>
              <Input id="checkIn" type="date" {...form.register('checkIn')} />
              {form.formState.errors.checkIn && (
                <p className="text-destructive text-xs">{form.formState.errors.checkIn.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkOut">Check-out</Label>
              <Input id="checkOut" type="date" {...form.register('checkOut')} />
              {form.formState.errors.checkOut && (
                <p className="text-destructive text-xs">{form.formState.errors.checkOut.message}</p>
              )}
            </div>
          </div>

          {/* Guests count + Source */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="adults">Adults</Label>
              <Input id="adults" type="number" min="1" {...form.register('adults')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="children">Children</Label>
              <Input id="children" type="number" min="0" {...form.register('children')} />
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={form.watch('source')}
                onValueChange={(v) => form.setValue('source', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Special requests */}
          <div className="space-y-2">
            <Label htmlFor="specialRequests">Special Requests</Label>
            <Textarea
              id="specialRequests"
              placeholder="Late check-in, extra bed, dietary requirements…"
              rows={2}
              {...form.register('specialRequests')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Reservation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
