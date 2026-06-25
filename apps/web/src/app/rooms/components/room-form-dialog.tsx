'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { roomsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ROOM_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_ORDER'];

const AMENITY_PRESETS = [
  'WiFi', 'Air Conditioning', 'TV', 'Mini-bar', 'Safe',
  'Balcony', 'Sea View', 'Bathtub', 'Shower', 'Kitchenette',
  'Work Desk', 'Parking',
];

const roomSchema = z.object({
  roomNumber: z.string().min(1, 'Room number is required'),
  floor: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  status: z.string().min(1, 'Status is required'),
  notes: z.string().optional(),
});

type RoomForm = z.infer<typeof roomSchema>;

interface RoomFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialData?: any;
  propertyId: string;
}

export function RoomFormDialog({ open, onOpenChange, mode, initialData, propertyId }: RoomFormDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pricePerNight, setPricePerNight] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);

  const { data: categories } = useQuery({
    queryKey: ['room-categories', propertyId],
    queryFn: () => roomsApi.categories(propertyId).then((r) => r.data),
    enabled: open,
  });

  // Load existing default pricing when editing
  const { data: existingPricing } = useQuery({
    queryKey: ['room-pricing', initialData?.id],
    queryFn: () => roomsApi.getPricing(initialData.id).then((r) => r.data),
    enabled: open && mode === 'edit' && !!initialData?.id,
  });

  const form = useForm<RoomForm>({
    resolver: zodResolver(roomSchema),
    defaultValues: { roomNumber: '', floor: '', categoryId: '', status: 'AVAILABLE', notes: '' },
  });

  const watchedCategoryId = form.watch('categoryId');

  // Reset form and local state when dialog opens
  useEffect(() => {
    if (!open) return;
    if (initialData) {
      form.reset({
        roomNumber: initialData.roomNumber || '',
        floor: initialData.floor != null ? String(initialData.floor) : '',
        categoryId: initialData.categoryId || initialData.category?.id || '',
        status: initialData.status || 'AVAILABLE',
        notes: initialData.notes || '',
      });
      setAmenities(initialData.amenities ?? []);
    } else {
      form.reset({ roomNumber: '', floor: '', categoryId: '', status: 'AVAILABLE', notes: '' });
      setPricePerNight('');
      setAmenities([]);
    }
  }, [open, initialData, form]);

  // Populate price from existing default pricing on edit
  useEffect(() => {
    if (!open || mode !== 'edit') return;
    const pricing = Array.isArray(existingPricing) ? existingPricing : (existingPricing as any)?.data ?? [];
    const defaultPricing = pricing.find((p: any) => p.isDefault);
    if (defaultPricing) {
      setPricePerNight(String(Number(defaultPricing.pricePerNight).toFixed(2)));
    } else if (initialData?.category?.basePrice) {
      setPricePerNight(String(Number(initialData.category.basePrice).toFixed(2)));
    }
  }, [existingPricing, open, mode, initialData]);

  // Auto-fill price from selected category's basePrice on create
  useEffect(() => {
    if (mode !== 'create' || !watchedCategoryId || !categories) return;
    const cat = (Array.isArray(categories) ? categories : (categories as any)?.data ?? [])
      .find((c: any) => c.id === watchedCategoryId);
    if (cat) setPricePerNight(String(Number(cat.basePrice).toFixed(2)));
  }, [watchedCategoryId, categories, mode]);

  const toggleAmenity = (name: string) => {
    setAmenities((prev) =>
      prev.includes(name) ? prev.filter((a) => a !== name) : [...prev, name],
    );
  };

  const mutation = useMutation({
    mutationFn: async (data: RoomForm) => {
      const payload: any = {
        ...data,
        propertyId,
        floor: data.floor ? Number(data.floor) : undefined,
        amenities,
      };

      if (mode === 'create') {
        const room = await roomsApi.create(payload).then((r) => r.data);
        const roomId = room?.id ?? room?.data?.id;
        if (roomId && pricePerNight && Number(pricePerNight) > 0) {
          await roomsApi.createPricing(roomId, {
            name: 'Default',
            pricePerNight: Number(pricePerNight),
            isDefault: true,
            minNights: 1,
          });
        }
        return room;
      } else {
        const room = await roomsApi.update(initialData.id, payload).then((r) => r.data);
        if (pricePerNight && Number(pricePerNight) > 0) {
          const pricing = Array.isArray(existingPricing) ? existingPricing : (existingPricing as any)?.data ?? [];
          const defaultPricing = pricing.find((p: any) => p.isDefault);
          if (defaultPricing) {
            await roomsApi.updatePricing(defaultPricing.id, { pricePerNight: Number(pricePerNight) });
          } else {
            await roomsApi.createPricing(initialData.id, {
              name: 'Default',
              pricePerNight: Number(pricePerNight),
              isDefault: true,
              minNights: 1,
            });
          }
        }
        return room;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: mode === 'create' ? 'Room created' : 'Room updated' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to save room',
        description: error.response?.data?.message || 'Something went wrong',
      });
    },
  });

  const onSubmit = (data: RoomForm) => mutation.mutate(data);

  const catList: any[] = Array.isArray(categories) ? categories : (categories as any)?.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Room' : 'Edit Room'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Add a new room to this property.' : 'Update room details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomNumber">Room Number</Label>
              <Input id="roomNumber" placeholder="101" {...form.register('roomNumber')} />
              {form.formState.errors.roomNumber && (
                <p className="text-red-500 text-xs">{form.formState.errors.roomNumber.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">Floor</Label>
              <Input id="floor" type="number" {...form.register('floor')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={form.watch('categoryId')}
              onValueChange={(v) => form.setValue('categoryId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {catList.map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name} (${Number(cat.basePrice).toFixed(0)}/night)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-red-500 text-xs">{form.formState.errors.categoryId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pricePerNight">Price per Night</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="pricePerNight"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="pl-7"
                value={pricePerNight}
                onChange={(e) => setPricePerNight(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Overrides the category base price for this room. Saved as a default pricing rule.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROOM_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="flex flex-wrap gap-2">
              {AMENITY_PRESETS.map((name) => {
                const active = amenities.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleAmenity(name)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-transparent text-muted-foreground border-border hover:border-primary/50 hover:text-foreground',
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
            {amenities.length > 0 && (
              <p className="text-xs text-muted-foreground">{amenities.length} selected</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...form.register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Create Room' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
