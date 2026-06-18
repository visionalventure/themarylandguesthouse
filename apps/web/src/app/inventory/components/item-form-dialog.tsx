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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { inventoryApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const UNITS = ['PCS', 'KG', 'LITRE', 'BOX', 'DOZEN'];

const itemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  minimumStock: z.string().optional(),
  maximumStock: z.string().optional(),
  reorderPoint: z.string().optional(),
  unitCost: z.string().optional(),
  location: z.string().optional(),
  expiryTracking: z.boolean().optional(),
});

type ItemForm = z.infer<typeof itemSchema>;

interface ItemFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
}

export function ItemFormDialog({ open, onOpenChange, propertyId }: ItemFormDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      sku: '', name: '', description: '', unit: 'PCS', minimumStock: '',
      maximumStock: '', reorderPoint: '', unitCost: '', location: '', expiryTracking: false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        sku: '', name: '', description: '', unit: 'PCS', minimumStock: '',
        maximumStock: '', reorderPoint: '', unitCost: '', location: '', expiryTracking: false,
      });
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: (data: ItemForm) =>
      inventoryApi.createItem({
        ...data,
        propertyId,
        minimumStock: data.minimumStock ? Number(data.minimumStock) : undefined,
        maximumStock: data.maximumStock ? Number(data.maximumStock) : undefined,
        reorderPoint: data.reorderPoint ? Number(data.reorderPoint) : undefined,
        unitCost: data.unitCost ? Number(data.unitCost) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-low-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-valuation'] });
      toast({ title: 'Item created' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create item',
        description: error.response?.data?.message || 'Something went wrong',
      });
    },
  });

  const onSubmit = (data: ItemForm) => mutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
          <DialogDescription>Add a new item to inventory tracking.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...form.register('sku')} />
              {form.formState.errors.sku && (
                <p className="text-red-500 text-xs">{form.formState.errors.sku.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...form.register('description')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select value={form.watch('unit')} onValueChange={(v) => form.setValue('unit', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" placeholder="Main Store" {...form.register('location')} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minimumStock">Min Stock</Label>
              <Input id="minimumStock" type="number" {...form.register('minimumStock')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maximumStock">Max Stock</Label>
              <Input id="maximumStock" type="number" {...form.register('maximumStock')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input id="reorderPoint" type="number" {...form.register('reorderPoint')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitCost">Unit Cost</Label>
            <Input id="unitCost" type="number" step="0.01" {...form.register('unitCost')} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="expiryTracking"
              checked={form.watch('expiryTracking')}
              onCheckedChange={(checked) => form.setValue('expiryTracking', checked === true)}
            />
            <Label htmlFor="expiryTracking">Track expiry dates for this item</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
