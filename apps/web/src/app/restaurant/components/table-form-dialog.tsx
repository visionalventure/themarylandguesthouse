'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { restaurantApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const TABLE_STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED'];

interface Props { open: boolean; onOpenChange: (v: boolean) => void; restaurantId: string; table?: any | null; }

export function TableFormDialog({ open, onOpenChange, restaurantId, table }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!table?.id;
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { tableNumber: '', capacity: '', location: '', status: 'AVAILABLE' },
  });

  useEffect(() => {
    if (!open) return;
    if (table) {
      reset({
        tableNumber: table.tableNumber ?? '',
        capacity: table.capacity != null ? String(table.capacity) : '',
        location: table.location ?? '',
        status: table.status ?? 'AVAILABLE',
      });
    } else {
      reset({ tableNumber: '', capacity: '', location: '', status: 'AVAILABLE' });
    }
  }, [open, table, reset]);

  const mutation = useMutation({
    mutationFn: (values: any) => {
      const payload = { ...values, capacity: Number(values.capacity), location: values.location || undefined };
      return isEdit ? restaurantApi.updateTable(table.id, payload) : restaurantApi.createTable(restaurantId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast({ title: isEdit ? 'Table updated' : 'Table added' });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Table' : 'Add Table'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Table Number *</Label>
              <Input placeholder="e.g. T9" {...register('tableNumber', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Capacity *</Label>
              <Input type="number" min="1" placeholder="4" {...register('capacity', { required: true })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input placeholder="e.g. Patio, Main Hall" {...register('location')} />
          </div>
          {isEdit && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={watch('status')} onValueChange={v => setValue('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TABLE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Table'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
