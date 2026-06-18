'use client';

import { useEffect } from 'react';
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

const ROOM_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_ORDER'];

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

  const { data: categories } = useQuery({
    queryKey: ['room-categories', propertyId],
    queryFn: () => roomsApi.categories(propertyId).then((r) => r.data),
    enabled: open,
  });

  const form = useForm<RoomForm>({
    resolver: zodResolver(roomSchema),
    defaultValues: { roomNumber: '', floor: '', categoryId: '', status: 'AVAILABLE', notes: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        initialData
          ? {
              roomNumber: initialData.roomNumber || '',
              floor: initialData.floor != null ? String(initialData.floor) : '',
              categoryId: initialData.categoryId || initialData.category?.id || '',
              status: initialData.status || 'AVAILABLE',
              notes: initialData.notes || '',
            }
          : { roomNumber: '', floor: '', categoryId: '', status: 'AVAILABLE', notes: '' },
      );
    }
  }, [open, initialData, form]);

  const mutation = useMutation({
    mutationFn: (data: RoomForm) => {
      const payload: any = {
        ...data,
        propertyId,
        floor: data.floor ? Number(data.floor) : undefined,
      };
      return mode === 'create'
        ? roomsApi.create(payload)
        : roomsApi.update(initialData.id, payload);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
                {(categories || []).map((cat: any) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name} (${Number(cat.basePrice).toFixed(0)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-red-500 text-xs">{form.formState.errors.categoryId.message}</p>
            )}
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
