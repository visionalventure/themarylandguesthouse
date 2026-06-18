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

interface Props { open: boolean; onOpenChange: (v: boolean) => void; restaurantId: string; }

export function MenuItemDialog({ open, onOpenChange, restaurantId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { name: '', description: '', price: '', categoryId: '', isAvailable: true },
  });

  useEffect(() => {
    if (open) reset({ name: '', description: '', price: '', categoryId: '', isAvailable: true });
  }, [open, reset]);

  const { data: menuData } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => restaurantApi.menu(restaurantId).then(r => r.data),
    enabled: open && !!restaurantId,
  });
  const categories: any[] = menuData?.categories ?? [];

  const mutation = useMutation({
    mutationFn: (values: any) => restaurantApi.createMenuItem(restaurantId, {
      ...values,
      price: Number(values.price),
      categoryId: values.categoryId || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast({ title: 'Menu item added' });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Menu Item</DialogTitle></DialogHeader>
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
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
