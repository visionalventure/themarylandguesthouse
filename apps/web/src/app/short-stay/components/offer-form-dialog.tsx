'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { shortStayApi, roomsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propertyId: string;
  offer?: any | null; // existing offer for edit mode
}

export function OfferFormDialog({ open, onOpenChange, propertyId, offer }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!offer?.id;

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: { name: '', hourlyRate: '', roomIds: [] as string[] },
  });

  const { data: roomsData } = useQuery({
    queryKey: ['all-rooms-for-offers', propertyId],
    queryFn: () => roomsApi.list({ propertyId, limit: 200 }).then((r) => r.data),
    enabled: open && !!propertyId,
  });
  const rooms: any[] = roomsData?.data ?? (Array.isArray(roomsData) ? roomsData : []);

  useEffect(() => {
    if (!open) return;
    if (offer) {
      reset({
        name: offer.name ?? '',
        hourlyRate: offer.hourlyRate != null ? String(offer.hourlyRate) : '',
        roomIds: (offer.rooms ?? []).map((r: any) => r.id),
      });
    } else {
      reset({ name: '', hourlyRate: '', roomIds: [] });
    }
  }, [open, offer, reset]);

  const mutation = useMutation({
    mutationFn: (values: any) => {
      const payload = { name: values.name, hourlyRate: Number(values.hourlyRate), roomIds: values.roomIds };
      return isEdit
        ? shortStayApi.updateOffer(offer.id, payload)
        : shortStayApi.createOffer(propertyId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['short-stay-offers'] });
      queryClient.invalidateQueries({ queryKey: ['short-stay-eligible-rooms'] });
      toast({ title: isEdit ? 'Offer updated' : 'Offer created' });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to save offer' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Short Stay Offer' : 'New Short Stay Offer'}</DialogTitle>
          <DialogDescription>Set the hourly rate once here — front desk just picks the room and duration.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Offer Name *</Label>
            <Input placeholder="e.g. Standard Room Short Stay" {...register('name', { required: true })} />
            {errors.name && <p className="text-xs text-destructive">Name is required</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Hourly Rate ($) *</Label>
            <Input type="number" min="0" step="0.01" placeholder="15.00" {...register('hourlyRate', { required: true, min: 0 })} />
            {errors.hourlyRate && <p className="text-xs text-destructive">Enter a valid rate</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Assign to Rooms</Label>
            <Controller
              name="roomIds"
              control={control}
              render={({ field }) => (
                <div className="rounded-md border divide-y max-h-60 overflow-y-auto">
                  {rooms.length === 0 && <p className="px-3 py-4 text-xs text-muted-foreground">No rooms found.</p>}
                  {rooms.map((r) => {
                    const checked = field.value.includes(r.id);
                    return (
                      <label key={r.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v: boolean) => {
                            field.onChange(v ? [...field.value, r.id] : field.value.filter((id: string) => id !== r.id));
                          }}
                        />
                        <span>Room {r.roomNumber} — {r.category?.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
            <p className="text-xs text-muted-foreground">A room can only carry one offer at a time — assigning it here removes it from any other offer.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Offer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
