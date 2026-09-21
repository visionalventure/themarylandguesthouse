'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { shortStayApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const PAYMENT_METHODS = ['CASH', 'VISA', 'MASTERCARD', 'BANK_TRANSFER', 'ORANGE_MONEY', 'MTN_MOBILE_MONEY'];

interface Props { booking: any | null; onOpenChange: (v: boolean) => void; }

export function CheckoutDialog({ booking, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const amountPaid = booking ? (booking.payments ?? []).reduce((s: number, p: any) => s + Number(p.amount), 0) : 0;

  // Preview the final total the same way the backend computes it: round any
  // overage up to the next full hour. The backend uses its own clock at the
  // moment of the actual request, so this is an estimate that can shift by
  // an hour if the dialog sits open across an hour boundary.
  const previewTotal = (() => {
    if (!booking) return 0;
    let total = Number(booking.totalAmount);
    const plannedEnd = new Date(booking.checkOutPlanned).getTime();
    const now = Date.now();
    if (now > plannedEnd) {
      const overageHours = Math.ceil((now - plannedEnd) / (60 * 60 * 1000));
      total += overageHours * Number(booking.hourlyRate);
    }
    return total;
  })();
  const balanceDue = Math.max(previewTotal - amountPaid, 0);

  useEffect(() => {
    if (booking) {
      setPaymentAmount(balanceDue > 0 ? balanceDue.toFixed(2) : '');
      setPaymentMethod('CASH');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.id]);

  const mutation = useMutation({
    mutationFn: () => shortStayApi.checkOut(booking.id, {
      paymentAmount: paymentAmount ? Number(paymentAmount) : undefined,
      paymentMethod: paymentAmount ? paymentMethod : undefined,
    }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['short-stays'] });
      queryClient.invalidateQueries({ queryKey: ['short-stay-stats'] });
      const finalAmount = res.data?.booking?.totalAmount;
      toast({ title: 'Checked out', description: finalAmount ? `Final amount: $${Number(finalAmount).toFixed(2)}` : undefined });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to check out' }),
  });

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Check Out</DialogTitle>
          <DialogDescription>Room {booking?.room?.roomNumber} — {booking?.guestName || 'Walk-in guest'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 divide-y">
            <div className="px-3 py-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Total (incl. any overage)</span>
              <span className="font-semibold">${previewTotal.toFixed(2)}</span>
            </div>
            <div className="px-3 py-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Already paid</span>
              <span>${amountPaid.toFixed(2)}</span>
            </div>
            <div className="px-3 py-2 flex justify-between text-sm">
              <span className="font-medium">Balance due</span>
              <span className="font-bold text-primary">${balanceDue.toFixed(2)}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Collect Payment</Label>
              <Input type="number" min="0" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Leave the amount at $0 to check out without collecting anything now.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={mutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm Check Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
