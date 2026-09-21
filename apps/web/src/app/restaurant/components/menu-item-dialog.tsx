'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { restaurantApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Props { open: boolean; onOpenChange: (v: boolean) => void; restaurantId: string; item?: any | null; }

export function MenuItemDialog({ open, onOpenChange, restaurantId, item }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!item?.id;
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { name: '', description: '', price: '', categoryId: '', isAvailable: true },
  });

  useEffect(() => {
    if (!open) return;
    if (item) {
      reset({
        name: item.name ?? '',
        description: item.description ?? '',
        price: item.price != null ? String(item.price) : '',
        categoryId: item.categoryId ?? '',
        isAvailable: item.isAvailable ?? true,
      });
    } else {
      reset({ name: '', description: '', price: '', categoryId: '', isAvailable: true });
    }
  }, [open, item, reset]);

  const { data: menuData } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => restaurantApi.menu(restaurantId).then(r => r.data),
    enabled: open && !!restaurantId,
  });
  const categories: any[] = menuData?.categories ?? [];

  const mutation = useMutation({
    mutationFn: (values: any) => {
      const payload = { ...values, price: Number(values.price), categoryId: values.categoryId || undefined };
      return isEdit ? restaurantApi.updateMenuItem(item.id, payload) : restaurantApi.createMenuItem(restaurantId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast({ title: isEdit ? 'Menu item updated' : 'Menu item added' });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Item Name *</Label>
            <Input placeholder="e.g. Grilled Chicken" {...register('name', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={2} placeholder="Brief description..." {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Price ($) *</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" {...register('price', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={watch('categoryId')} onValueChange={v => setValue('categoryId', v)}>
                <SelectTrigger><SelectValue placeholder="Uncategorised" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Uncategorised</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              checked={watch('isAvailable')}
              onCheckedChange={(v: boolean) => setValue('isAvailable', v)}
            />
            <Label>Available on menu</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
