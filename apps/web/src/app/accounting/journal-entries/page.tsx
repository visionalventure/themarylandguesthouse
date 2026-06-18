'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Loader2, BookOpen, CheckCircle2, Clock, FileText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { accountingApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { FadeIn } from '@/components/ui/fade-in';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/use-page-title';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:  { label: 'Draft',  color: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  POSTED: { label: 'Posted', color: 'border-green-500/30 bg-green-500/10 text-green-400' },
  VOID:   { label: 'Void',   color: 'border-red-500/30 bg-red-500/10 text-red-400' },
};

const emptyLine = () => ({ accountId: '', type: 'DEBIT', amount: '', description: '' });

export default function JournalEntriesPage() {
  usePageTitle('Journal Entries');
  const propertyId = useAuthStore((s) => s.propertyId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');

  const { data: entriesData, isLoading } = useQuery({
    queryKey: ['journal-entries', propertyId, statusFilter],
    queryFn: () => accountingApi.journalEntries({
      propertyId,
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    }).then(r => r.data),
  });

  const { data: accountsData } = useQuery({
    queryKey: ['chart-of-accounts', propertyId],
    queryFn: () => accountingApi.chartOfAccounts(propertyId).then(r => r.data),
    enabled: dialogOpen,
  });

  const entries: any[] = entriesData?.data ?? (Array.isArray(entriesData) ? entriesData : []);
  const accounts: any[] = accountsData?.accounts ?? (Array.isArray(accountsData) ? accountsData : []);

  const totalDebits = entries.reduce((s: number, e: any) => s + Number(e.totalDebit ?? 0), 0);
  const draftCount  = entries.filter((e: any) => e.status === 'DRAFT').length;
  const postedCount = entries.filter((e: any) => e.status === 'POSTED').length;

  const createMutation = useMutation({
    mutationFn: () => accountingApi.createJournalEntry({
      propertyId,
      date: entryDate,
      description,
      reference,
      lines: lines.filter(l => l.accountId && l.amount).map(l => ({
        accountId: l.accountId,
        type: l.type,
        amount: parseFloat(l.amount as string),
        description: l.description,
      })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({ title: 'Journal entry created' });
      setDialogOpen(false);
      setLines([emptyLine(), emptyLine()]);
      setDescription('');
      setReference('');
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to create entry' }),
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => accountingApi.postEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast({ title: 'Entry posted to ledger' });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to post' }),
  });

  const totalD = lines.filter(l => l.type === 'DEBIT').reduce((s, l) => s + (parseFloat(l.amount as string) || 0), 0);
  const totalC = lines.filter(l => l.type === 'CREDIT').reduce((s, l) => s + (parseFloat(l.amount as string) || 0), 0);
  const isBalanced = Math.abs(totalD - totalC) < 0.01 && totalD > 0;

  const updateLine = (i: number, field: string, value: string) =>
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Journal Entries</h1>
          <p className="text-muted-foreground text-sm">Double-entry bookkeeping ledger</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Entry
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Entries', value: entries.length, icon: FileText,    color: 'text-primary' },
          { label: 'Draft',         value: draftCount,     icon: Clock,        color: 'text-amber-400' },
          { label: 'Posted',        value: postedCount,    icon: CheckCircle2, color: 'text-green-400' },
          { label: 'Total Debits',  value: null, display: `$${totalDebits.toLocaleString()}`, icon: BookOpen, color: 'text-primary' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-5 pb-5 flex items-center gap-3">
              <kpi.icon className={cn('w-8 h-8', kpi.color)} />
              <div>
                {kpi.value !== null
                  ? <AnimatedCounter value={kpi.value!} className={cn('text-2xl font-bold', kpi.color)} />
                  : <p className={cn('text-xl font-bold', kpi.color)}>{kpi.display}</p>}
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {['ALL', 'DRAFT', 'POSTED', 'VOID'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={cn('px-3 py-1 rounded-lg text-xs font-medium border transition-all',
              statusFilter === s
                ? 'bg-gold-main/20 text-gold-main border-gold-main/40'
                : 'border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.04]')}>
            {s}
          </button>
        ))}
      </div>

      {/* Entries table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" /></div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No journal entries yet. Create your first entry.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Entry #', 'Date', 'Description', 'Reference', 'Debits', 'Credits', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry: any) => {
                    const cfg = STATUS_CONFIG[entry.status] ?? STATUS_CONFIG.DRAFT;
                    return (
                      <tr key={entry.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-primary">{entry.entryNumber}</td>
                        <td className="px-4 py-3 text-xs">{entry.date ? format(new Date(entry.date), 'MMM d, yyyy') : '—'}</td>
                        <td className="px-4 py-3 max-w-[180px] truncate">{entry.description}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{entry.reference || '—'}</td>
                        <td className="px-4 py-3 font-semibold">${Number(entry.totalDebit ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3 font-semibold">${Number(entry.totalCredit ?? 0).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <Badge className={cn('text-[10px] border', cfg.color)}>{cfg.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {entry.status === 'DRAFT' && (
                            <Button size="sm" variant="outline" className="h-6 text-xs px-2"
                              onClick={() => postMutation.mutate(entry.id)}
                              disabled={postMutation.isPending}>
                              Post
                            </Button>
                          )}
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

      {/* New Entry Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => {
        setDialogOpen(v);
        if (!v) { setLines([emptyLine(), emptyLine()]); setDescription(''); setReference(''); }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New Journal Entry</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Description *</Label>
                <Input placeholder="e.g. Monthly rent payment" value={description} onChange={e => setDescription(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reference <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input placeholder="e.g. INV-2024-0001" value={reference} onChange={e => setReference(e.target.value)} />
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <Label>Line Items</Label>
              <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                      {['Account', 'Type', 'Amount', 'Note', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => (
                      <tr key={i} className="border-b border-white/[0.04]">
                        <td className="px-2 py-1.5">
                          <Select value={line.accountId} onValueChange={v => updateLine(i, 'accountId', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent>
                              {accounts.length === 0 && <SelectItem value="-" disabled>Connect API to load accounts</SelectItem>}
                              {accounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.code} — {a.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5 w-24">
                          <Select value={line.type} onValueChange={v => updateLine(i, 'type', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DEBIT">Debit</SelectItem>
                              <SelectItem value="CREDIT">Credit</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-1.5 w-28">
                          <Input type="number" placeholder="0.00" className="h-8 text-xs"
                            value={line.amount} onChange={e => updateLine(i, 'amount', e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input placeholder="Optional" className="h-8 text-xs"
                            value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} />
                        </td>
                        <td className="px-2 py-1.5 w-8">
                          {lines.length > 2 && (
                            <button onClick={() => setLines(p => p.filter((_, idx) => idx !== i))}
                              className="text-muted-foreground hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setLines(p => [...p, emptyLine()])}>
                <Plus className="w-3 h-3 mr-1" /> Add Line
              </Button>
            </div>

            {/* Balance indicator */}
            <div className={cn('flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm',
              isBalanced ? 'border-green-500/30 bg-green-500/10' : 'border-amber-500/30 bg-amber-500/10')}>
              <span className="text-muted-foreground text-xs">Debits: <strong className="text-foreground">${totalD.toFixed(2)}</strong></span>
              <span className={cn('text-xs font-semibold', isBalanced ? 'text-green-400' : 'text-amber-400')}>
                {isBalanced ? '✓ Balanced' : `Out of balance by $${Math.abs(totalD - totalC).toFixed(2)}`}
              </span>
              <span className="text-muted-foreground text-xs">Credits: <strong className="text-foreground">${totalC.toFixed(2)}</strong></span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()}
              disabled={!isBalanced || !description || createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
