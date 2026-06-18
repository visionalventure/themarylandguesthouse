'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { inventoryApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';

const STOCK_OUT_REASONS = ['CONSUMPTION', 'WASTAGE', 'TRANSFER', 'ADJUSTMENT'];

const stockSchema = z.object({
  quantity: z.string().min(1, 'Quantity is required'),
  unitCost: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

type StockForm = z.infer<typeof stockSchema>;

interface StockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'in' | 'out';
  item: any;
}

export function StockDialog({ open, onOpenChange, mode, item }: StockDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const form = useForm<StockForm>({
    resolver: zodResolver(stockSchema),
    defaultValues: { quantity: '', unitCost: '', batchNumber: '', expiryDate: '', reason: 'CONSUMPTION', notes: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ quantity: '', unitCost: '', batchNumber: '', expiryDate: '', reason: 'CONSUMPTION', notes: '' });
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: (data: StockForm) => {
      const payload: any = {
        itemId: item.id,
        quantity: Number(data.quantity),
        notes: data.notes,
        performedBy: user?.id,
      };
      if (mode === 'in') {
        payload.unitCost = data.unitCost ? Number(data.unitCost) : undefined;
        payload.batchNumber = data.batchNumber;
        payload.expiryDate = data.expiryDate || undefined;
        return inventoryApi.stockIn(payload);
      }
      payload.reason = data.reason;
      return inventoryApi.stockOut(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-valuation'] });
      toast({ title: mode === 'in' ? 'Stock received' : 'Stock issued' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: mode === 'in' ? 'Stock-in failed' : 'Stock-out failed',
        description: error.response?.data?.message || 'Something went wrong',
      });
    },
  });

  const onSubmit = (data: StockForm) => mutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'in' ? 'Stock In' : 'Stock Out'}</DialogTitle>
          <DialogDescription>
            {item?.name} — current stock: {Number(item?.currentStock ?? 0)} {item?.unit}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input id="quantity" type="number" step="0.01" {...form.register('quantity')} />
            {form.formState.errors.quantity && (
              <p className="text-red-500 text-xs">{form.formState.errors.quantity.message}</p>
            )}
          </div>

          {mode === 'in' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitCost">Unit Cost</Label>
                  <Input id="unitCost" type="number" step="0.01" {...form.register('unitCost')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number</Label>
                  <Input id="batchNumber" {...form.register('batchNumber')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input id="expiryDate" type="date" {...form.register('expiryDate')} />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={form.watch('reason')} onValueChange={(v) => form.setValue('reason', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STOCK_OUT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...form.register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className={mode === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-amber-600 hover:bg-amber-700'}
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'in' ? 'Receive Stock' : 'Issue Stock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
