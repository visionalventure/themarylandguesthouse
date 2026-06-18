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
import { procurementApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = ['FOOD_BEVERAGE', 'HOUSEKEEPING', 'MAINTENANCE', 'LINEN', 'ELECTRONICS', 'OFFICE', 'OTHER'];
const PAYMENT_TERMS = ['NET_7', 'NET_15', 'NET_30', 'NET_60', 'COD', 'PREPAID'];

interface Props { open: boolean; onOpenChange: (v: boolean) => void; propertyId: string; }

export function SupplierDialog({ open, onOpenChange, propertyId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { name: '', contactName: '', email: '', phone: '', category: 'OTHER', paymentTerms: 'NET_30', address: '' },
  });

  useEffect(() => {
    if (open) reset({ name: '', contactName: '', email: '', phone: '', category: 'OTHER', paymentTerms: 'NET_30', address: '' });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: any) => procurementApi.createSupplier({ propertyId, tenantId: propertyId, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Supplier added' });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Supplier</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Company Name *</Label>
            <Input placeholder="Acme Supplies Ltd." {...register('name', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input placeholder="John Doe" {...register('contactName')} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+1 555 0100" {...register('phone')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" placeholder="supplier@example.com" {...register('email')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={watch('category')} onValueChange={v => setValue('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select value={watch('paymentTerms')} onValueChange={v => setValue('paymentTerms', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Supplier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
