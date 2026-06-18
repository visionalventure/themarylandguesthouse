'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { Plus, Loader2, FileText, DollarSign, Clock, AlertCircle, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { accountingApi, guestsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { FadeIn } from '@/components/ui/fade-in';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/use-page-title';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:          { label: 'Draft',   color: 'border-white/10 bg-white/5 text-muted-foreground' },
  SENT:           { label: 'Sent',    color: 'border-blue-500/30 bg-blue-500/10 text-blue-400' },
  PAID:           { label: 'Paid',    color: 'border-green-500/30 bg-green-500/10 text-green-400' },
  PARTIALLY_PAID: { label: 'Partial', color: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  OVERDUE:        { label: 'Overdue', color: 'border-red-500/30 bg-red-500/10 text-red-400' },
  CANCELLED:      { label: 'Void',    color: 'border-red-500/30 bg-red-500/10 text-red-400' },
  VOID:           { label: 'Void',    color: 'border-red-500/30 bg-red-500/10 text-red-400' },
};

const emptyLine = () => ({ description: '', quantity: '1', unitPrice: '', taxRate: '0' });

export default function InvoicesPage() {
  usePageTitle('Invoices');
  const propertyId = useAuthStore((s) => s.propertyId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [markPaidId, setMarkPaidId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [guestId, setGuestId] = useState('');
  const [issueDate, setIssueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([emptyLine()]);

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ['invoices', propertyId, statusFilter, search],
    queryFn: () => accountingApi.invoices({
      propertyId,
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      ...(search ? { search } : {}),
    }).then(r => r.data),
  });

  const { data: guestsData } = useQuery({
    queryKey: ['guests-select'],
    queryFn: () => guestsApi.list({ limit: 100 }).then(r => r.data),
    enabled: dialogOpen,
  });

  const invoices: any[] = invoicesData?.data ?? (Array.isArray(invoicesData) ? invoicesData : []);
  const guests: any[]   = guestsData?.data   ?? (Array.isArray(guestsData)   ? guestsData   : []);

  const totalInvoiced    = invoices.reduce((s: number, i: any) => s + Number(i.totalAmount ?? 0), 0);
  const totalPaid        = invoices.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + Number(i.totalAmount ?? 0), 0);
  const totalOutstanding = invoices.reduce((s: number, i: any) => s + Math.max(0, Number(i.totalAmount ?? 0) - Number(i.paidAmount ?? 0)), 0);
  const overdueCount     = invoices.filter((i: any) => i.status === 'OVERDUE').length;

  const lineSubtotal = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0), 0);
  const lineTax      = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0) * ((parseFloat(l.taxRate) || 0) / 100), 0);
  const lineTotal    = lineSubtotal + lineTax;

  const resetDialog = () => { setLines([emptyLine()]); setGuestId(''); setNotes(''); };

  const createMutation = useMutation({
    mutationFn: () => accountingApi.createInvoice({
      propertyId, guestId, issueDate, dueDate, notes,
      lineItems: lines.filter(l => l.description && l.unitPrice),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Invoice created' });
      setDialogOpen(false); resetDialog();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to create invoice' }),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => accountingApi.sendInvoice(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['invoices'] }); toast({ title: 'Invoice marked as sent' }); },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const paidMutation = useMutation({
    mutationFn: () => accountingApi.markInvoicePaid(markPaidId!, { amount: parseFloat(payAmount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Payment recorded' });
      setMarkPaidId(null); setPayAmount('');
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const updateLine = (i: number, field: string, value: string) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground text-sm">Guest and corporate invoicing</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" /> New Invoice</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoiced', display: `$${totalInvoiced.toLocaleString()}`,   icon: FileText,    color: 'text-primary' },
          { label: 'Paid',           display: `$${totalPaid.toLocaleString()}`,        icon: DollarSign,  color: 'text-green-400' },
          { label: 'Outstanding',    display: `$${totalOutstanding.toLocaleString()}`, icon: Clock,       color: 'text-amber-400' },
          { label: 'Overdue',        display: `${overdueCount}`,                       icon: AlertCircle, color: 'text-red-400' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-5 pb-5 flex items-center gap-3">
              <kpi.icon className={cn('w-8 h-8', kpi.color)} />
              <div><p className={cn('text-xl font-bold', kpi.color)}>{kpi.display}</p><p className="text-xs text-muted-foreground">{kpi.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {['ALL', 'DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('px-3 py-1 rounded-lg text-xs font-medium border transition-all',
              statusFilter === s ? 'bg-gold-main/20 text-gold-main border-gold-main/40' : 'border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.04]')}>
            {s === 'PARTIALLY_PAID' ? 'Partial' : s}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search…" className="pl-8 h-8 text-xs w-48" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" /></div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center">
              <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No invoices found. Create your first invoice.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Invoice #', 'Guest', 'Issue Date', 'Due Date', 'Total', 'Paid', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv: any) => {
                    const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.DRAFT;
                    return (
                      <tr key={inv.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-primary">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3">{inv.guest ? `${inv.guest.firstName} ${inv.guest.lastName}` : '—'}</td>
                        <td className="px-4 py-3 text-xs">{inv.issueDate ? format(new Date(inv.issueDate), 'MMM d, yyyy') : '—'}</td>
                        <td className="px-4 py-3 text-xs">{inv.dueDate ? format(new Date(inv.dueDate), 'MMM d, yyyy') : '—'}</td>
                        <td className="px-4 py-3 font-semibold">${Number(inv.totalAmount ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-green-400">${Number(inv.paidAmount ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3"><Badge className={cn('text-[10px] border', cfg.color)}>{cfg.label}</Badge></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {inv.status === 'DRAFT' && (
                              <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                                onClick={() => sendMutation.mutate(inv.id)} disabled={sendMutation.isPending}>Send</Button>
                            )}
                            {['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status) && (
                              <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                                onClick={() => { setMarkPaidId(inv.id); setPayAmount(String(Number(inv.totalAmount) - Number(inv.paidAmount))); }}>Pay</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Guest *</Label>
              <Select value={guestId} onValueChange={setGuestId}>
                <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
                <SelectContent>{guests.map((g: any) => <SelectItem key={g.id} value={g.id}>{g.firstName} {g.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Issue Date</Label><Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Due Date</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Line Items</Label>
              <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-white/[0.02] border-b border-white/[0.06]">
                    {['Description', 'Qty', 'Price', 'Tax %', 'Total', ''].map(h => <th key={h} className="px-3 py-2 text-left text-xs text-muted-foreground">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {lines.map((line, i) => {
                      const amt = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
                      const tax = amt * ((parseFloat(line.taxRate) || 0) / 100);
                      return (
                        <tr key={i} className="border-b border-white/[0.04]">
                          <td className="px-2 py-1.5"><Input placeholder="Service" className="h-8 text-xs" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} /></td>
                          <td className="px-2 py-1.5 w-16"><Input type="number" className="h-8 text-xs" value={line.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} /></td>
                          <td className="px-2 py-1.5 w-28"><Input type="number" placeholder="0.00" className="h-8 text-xs" value={line.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)} /></td>
                          <td className="px-2 py-1.5 w-16"><Input type="number" placeholder="0" className="h-8 text-xs" value={line.taxRate} onChange={e => updateLine(i, 'taxRate', e.target.value)} /></td>
                          <td className="px-2 py-1.5 w-20 text-xs font-medium">${(amt + tax).toFixed(2)}</td>
                          <td className="px-2 py-1.5 w-8">{lines.length > 1 && <button onClick={() => setLines(p => p.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setLines(p => [...p, emptyLine()])}><Plus className="w-3 h-3 mr-1" /> Add Line</Button>
            </div>
            <div className="rounded-xl border border-white/[0.08] p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${lineSubtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${lineTax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold border-t border-white/[0.06] pt-1.5"><span>Total</span><span className="text-primary">${lineTotal.toFixed(2)}</span></div>
            </div>
            <div className="space-y-1.5"><Label>Notes</Label><Input placeholder="Payment terms…" value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!guestId || lines.every(l => !l.unitPrice) || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Create Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Paid Dialog */}
      <Dialog open={!!markPaidId} onOpenChange={(v) => { if (!v) { setMarkPaidId(null); setPayAmount(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <div className="space-y-1.5"><Label>Amount *</Label><Input type="number" placeholder="0.00" value={payAmount} onChange={e => setPayAmount(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidId(null)}>Cancel</Button>
            <Button onClick={() => paidMutation.mutate()} disabled={!payAmount || paidMutation.isPending}>
              {paidMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
