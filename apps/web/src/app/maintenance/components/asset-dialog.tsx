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
import { maintenanceApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = ['AC', 'GENERATOR', 'FURNITURE', 'ELECTRONICS', 'PLUMBING', 'OTHER'];

interface Props { open: boolean; onOpenChange: (v: boolean) => void; propertyId: string; }

export function AssetDialog({ open, onOpenChange, propertyId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { name: '', category: 'OTHER', brand: '', location: '', purchaseDate: '', purchasePrice: '' },
  });

  useEffect(() => {
    if (open) reset({ name: '', category: 'OTHER', brand: '', location: '', purchaseDate: '', purchasePrice: '' });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: any) => maintenanceApi.createAsset({
      propertyId,
      ...values,
      purchaseDate: values.purchaseDate ? new Date(values.purchaseDate).toISOString() : undefined,
      purchasePrice: values.purchasePrice ? Number(values.purchasePrice) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast({ title: 'Asset added' });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Asset</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Asset Name *</Label>
              <Input placeholder="Split AC Unit" {...register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={watch('category')} onValueChange={v => setValue('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input placeholder="LG, Daikin..." {...register('brand')} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input placeholder="Room 101, Lobby..." {...register('location')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input type="date" {...register('purchaseDate')} />
            </div>
            <div className="space-y-2">
              <Label>Purchase Price ($)</Label>
              <Input type="number" min="0" step="0.01" {...register('purchasePrice')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Asset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
