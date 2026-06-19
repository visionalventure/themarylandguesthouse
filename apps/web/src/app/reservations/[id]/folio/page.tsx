'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft, Plus, CreditCard, Printer, LogOut,
  Loader2, Trash2, FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { api, accountingApi, reservationsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const CHARGE_TYPES = ['ROOM', 'F&B', 'BAR', 'LAUNDRY', 'SPA', 'TELEPHONE', 'MINIBAR', 'OTHER'];
const PAYMENT_METHODS = ['CASH', 'VISA', 'MASTERCARD', 'BANK_TRANSFER', 'ORANGE_MONEY', 'MTN_MOBILE_MONEY', 'CHECK'];

const STATUS_COLORS: Record<string, string> = {
  RESERVED:   'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  CONFIRMED:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  CHECKED_IN: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  CHECKED_OUT:'bg-slate-100 text-slate-600',
  CANCELLED:  'bg-red-100 text-red-800',
};

export default function FolioPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { propertyId } = useAuthStore();

  const [chargeOpen, setChargeOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [chargeForm, setChargeForm] = useState({ chargeType: 'ROOM', description: '', amount: '', quantity: '1', taxRate: '0' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'CASH', notes: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['folio', id],
    queryFn: () => api.get(`/v1/folio/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const postChargeMutation = useMutation({
    mutationFn: (values: any) => api.post(`/v1/folio/${id}/charges`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folio', id] });
      toast({ title: 'Charge posted' });
      setChargeOpen(false);
      setChargeForm({ chargeType: 'ROOM', description: '', amount: '', quantity: '1', taxRate: '0' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Failed to post charge' }),
  });

  const collectPaymentMutation = useMutation({
    mutationFn: (values: any) => api.post(`/v1/folio/${id}/payments`, values),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['folio', id] });
      toast({ title: `Payment recorded — ${res.data.receiptNumber}` });
      setPaymentOpen(false);
      setPaymentForm({ amount: '', method: 'CASH', notes: '' });
      // Navigate to receipt
      if (res.data?.payment?.id) {
        router.push(`/reservations/${id}/folio/receipt/${res.data.payment.id}`);
      }
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Failed to collect payment' }),
  });

  const voidChargeMutation = useMutation({
    mutationFn: (chargeId: string) => api.delete(`/v1/folio/${id}/charges/${chargeId}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['folio', id] }); toast({ title: 'Charge voided' }); },
  });

  const checkOutMutation = useMutation({
    mutationFn: () => reservationsApi.checkOut(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folio', id] });
      toast({ title: 'Guest checked out' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Check-out failed' }),
  });

  const generateInvoiceMutation = useMutation({
    mutationFn: () => {
      const folio = data!;
      return accountingApi.createInvoice({
        propertyId,
        guestId: folio.reservation.guestId,
        notes: `Invoice for reservation ${folio.reservation.reservationNo}`,
        lineItems: folio.charges.map((c: any) => ({
          description: c.description,
          quantity: c.quantity ?? 1,
          unitPrice: Number(c.unitPrice ?? c.amount),
          taxRate: Number(c.taxRate ?? 0),
        })),
      });
    },
    onSuccess: () => {
      toast({ title: 'Invoice generated', description: 'View it in Accounting → Invoices' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Invoice generation failed' }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="p-6">Folio not found</div>;

  const { reservation, ledger, totalCharges, totalPaid, balance, payments } = data;
  const guest = reservation?.guest;
  const room = reservation?.rooms?.[0]?.room;
  const status = reservation?.status;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Guest Folio</h1>
          <p className="text-sm text-muted-foreground">{reservation?.reservationNo}</p>
        </div>
        <Badge className={STATUS_COLORS[status] ?? ''}>{status?.replace('_', ' ')}</Badge>
      </div>

      {/* Reservation Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Guest</p>
              <p className="font-semibold">{guest?.firstName} {guest?.lastName}</p>
              <p className="text-xs text-muted-foreground">{guest?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Room</p>
              <p className="font-semibold">Room {room?.roomNumber ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{room?.category?.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Check-in</p>
              <p className="font-semibold">{reservation?.checkIn ? format(new Date(reservation.checkIn), 'dd MMM yyyy') : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Check-out</p>
              <p className="font-semibold">{reservation?.checkOut ? format(new Date(reservation.checkOut), 'dd MMM yyyy') : '—'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setChargeOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Post Charge
        </Button>
        <Button size="sm" variant="outline" onClick={() => setPaymentOpen(true)}>
          <CreditCard className="w-4 h-4 mr-1" /> Collect Payment
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" /> Print Folio
        </Button>
        <Button
          size="sm" variant="outline"
          onClick={() => generateInvoiceMutation.mutate()}
          disabled={generateInvoiceMutation.isPending || !data?.charges?.length}
        >
          {generateInvoiceMutation.isPending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
          Generate Invoice
        </Button>
        {status === 'CHECKED_IN' && (
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white ml-auto"
            onClick={() => checkOutMutation.mutate()}
            disabled={checkOutMutation.isPending}
          >
            {checkOutMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            <LogOut className="w-4 h-4 mr-1" /> Check Out
          </Button>
        )}
      </div>

      {/* Ledger */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Folio Ledger</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Charge</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Payment</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Balance</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">No transactions yet</td></tr>
                )}
                {ledger.map((entry: any, i: number) => (
                  <tr key={i} className={cn('border-b hover:bg-muted/10', entry.type === 'PAYMENT' && 'bg-green-50/30 dark:bg-green-900/10')}>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(entry.date), 'dd MMM HH:mm')}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn('text-xs font-medium mr-1.5 px-1.5 py-0.5 rounded', entry.type === 'CHARGE' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300')}>
                        {entry.type === 'CHARGE' ? (entry.data.chargeType ?? 'CHARGE') : 'PAYMENT'}
                      </span>
                      {entry.type === 'CHARGE' ? entry.data.description : (entry.data.method?.replace('_', ' '))}
                      {entry.type === 'PAYMENT' && entry.data.receiptNumber && (
                        <button
                          className="ml-2 text-xs text-primary underline"
                          onClick={() => router.push(`/reservations/${id}/folio/receipt/${entry.data.id}`)}
                        >
                          {entry.data.receiptNumber}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">{entry.type === 'CHARGE' ? `$${Number(entry.data.amount).toFixed(2)}` : ''}</td>
                    <td className="px-4 py-2.5 text-right text-green-600">{entry.type === 'PAYMENT' ? `$${Number(entry.data.amount).toFixed(2)}` : ''}</td>
                    <td className={cn('px-4 py-2.5 text-right font-medium', entry.runningBalance > 0 ? 'text-red-600' : 'text-green-600')}>
                      ${Number(entry.runningBalance).toFixed(2)}
                    </td>
                    <td className="px-2 py-2">
                      {entry.type === 'CHARGE' && (
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => voidChargeMutation.mutate(entry.data.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Balance Summary */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-end">
            <div className="space-y-1 text-sm w-64">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Charges</span>
                <span>${Number(totalCharges).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Total Paid</span>
                <span>${Number(totalPaid).toFixed(2)}</span>
              </div>
              <div className={cn('flex justify-between font-bold text-base border-t pt-1', Number(balance) > 0 ? 'text-red-600' : 'text-green-600')}>
                <span>Outstanding Balance</span>
                <span>${Number(balance).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Post Charge Dialog */}
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Post Charge</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Charge Type</Label>
                <Select value={chargeForm.chargeType} onValueChange={v => setChargeForm(f => ({ ...f, chargeType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHARGE_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('&', '& ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Amount (USD)</Label>
                <Input type="number" min="0" step="0.01" value={chargeForm.amount} onChange={e => setChargeForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={chargeForm.description} onChange={e => setChargeForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Dinner for 2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Quantity</Label>
                <Input type="number" min="1" value={chargeForm.quantity} onChange={e => setChargeForm(f => ({ ...f, quantity: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Tax Rate (%)</Label>
                <Input type="number" min="0" max="100" value={chargeForm.taxRate} onChange={e => setChargeForm(f => ({ ...f, taxRate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeOpen(false)}>Cancel</Button>
            <Button
              disabled={!chargeForm.amount || !chargeForm.description || postChargeMutation.isPending}
              onClick={() => postChargeMutation.mutate(chargeForm)}
            >
              {postChargeMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Post Charge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collect Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Collect Payment</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount (USD)</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={paymentForm.amount}
                  placeholder={`Balance: $${Number(balance).toFixed(2)}`}
                  onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Payment Method</Label>
                <Select value={paymentForm.method} onValueChange={v => setPaymentForm(f => ({ ...f, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={2} value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)}>Cancel</Button>
            <Button
              disabled={!paymentForm.amount || collectPaymentMutation.isPending}
              onClick={() => collectPaymentMutation.mutate(paymentForm)}
            >
              {collectPaymentMutation.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Collect & Generate Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
