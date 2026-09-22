'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { restaurantApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const PAYMENT_METHODS = ['CASH', 'VISA', 'MASTERCARD', 'BANK_TRANSFER', 'ORANGE_MONEY', 'MTN_MOBILE_MONEY'];

interface Props { order: any | null; onOpenChange: (v: boolean) => void; onClosed?: () => void; }

export function CloseBillDialog({ order, onOpenChange, onClosed }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [payMode, setPayMode] = useState<'PAY_NOW' | 'CHARGE_TO_ROOM'>('PAY_NOW');

  useEffect(() => {
    if (order) { setPaymentMethod('CASH'); setPayMode('PAY_NOW'); }
  }, [order]);

  const mutation = useMutation({
    mutationFn: () => restaurantApi.updateOrderStatus(
      order.id, 'SERVED',
      payMode === 'CHARGE_TO_ROOM' ? { chargeToRoom: true } : { paymentMethod },
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast({ title: 'Bill closed' });
      onOpenChange(false);
      onClosed?.();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to close bill' }),
  });

  return (
    <Dialog open={!!order} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Close Bill</DialogTitle>
          <DialogDescription>{order?.orderNumber} — how was this paid?</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 px-3 py-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-primary">${Number(order?.totalAmount ?? 0).toFixed(2)}</span>
          </div>

          {order?.reservationId && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPayMode('PAY_NOW')}
                className={cn('flex-1 text-xs font-medium rounded-md border px-3 py-1.5 transition-colors',
                  payMode === 'PAY_NOW' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground')}
              >
                Pay Now
              </button>
              <button
                type="button"
                onClick={() => setPayMode('CHARGE_TO_ROOM')}
                className={cn('flex-1 text-xs font-medium rounded-md border px-3 py-1.5 transition-colors',
                  payMode === 'CHARGE_TO_ROOM' ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground')}
              >
                Charge to Room
              </button>
            </div>
          )}

          {payMode === 'CHARGE_TO_ROOM' ? (
            <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/20 px-3 py-2">
              This amount will be added to {order?.guestName ?? 'the guest'}&rsquo;s folio
              {order?.roomNumber ? ` (Room ${order.roomNumber})` : ''} and settled at checkout.
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={mutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {payMode === 'CHARGE_TO_ROOM' ? 'Charge to Room & Close Bill' : 'Confirm & Close Bill'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
