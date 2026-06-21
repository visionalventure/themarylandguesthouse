'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Landmark, TrendingUp, TrendingDown, Loader2, RefreshCw, CheckCircle2, GitMerge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { accountingApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { FadeIn } from '@/components/ui/fade-in';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';

export default function BankingPage() {
  usePageTitle('Banking');
  const propertyId = useAuthStore((s) => s.propertyId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [reconOpen, setReconOpen] = useState(false);
  const [reconId, setReconId] = useState<string>('');
  const [closingBalance, setClosingBalance] = useState('');
  const [statementDate, setStatementDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkedTxns, setCheckedTxns] = useState<Set<string>>(new Set());

  const { data: accountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ['bank-accounts', propertyId],
    queryFn: () => accountingApi.bankAccounts(propertyId).then(r => r.data),
  });

  const accounts: any[] = Array.isArray(accountsData) ? accountsData : (accountsData?.data ?? []);
  const activeId = selectedAccountId || accounts[0]?.id;
  const selectedAccount = accounts.find((a: any) => a.id === activeId) ?? accounts[0];

  const { data: txnData, isLoading: loadingTxns, refetch: refetchTxns } = useQuery({
    queryKey: ['bank-transactions', activeId],
    queryFn: () => accountingApi.bankTransactions(activeId, { limit: 100 }).then(r => r.data),
    enabled: !!activeId,
  });

  const transactions: any[] = Array.isArray(txnData) ? txnData : (txnData?.data ?? []);

  const { data: reconData } = useQuery({
    queryKey: ['reconciliation', reconId],
    queryFn: () => accountingApi.getReconciliation(reconId).then(r => r.data),
    enabled: !!reconId,
  });

  const reconTxns: any[] = reconData?.transactions ?? [];

  const startReconMutation = useMutation({
    mutationFn: () =>
      accountingApi.startReconciliation({ bankAccountId: activeId, closingBalance: Number(closingBalance), statementDate }).then(r => r.data),
    onSuccess: (data) => {
      setReconId(data.reconciliation.id);
      setCheckedTxns(new Set());
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Failed to start reconciliation' }),
  });

  const reconcileTxnMutation = useMutation({
    mutationFn: (txnId: string) => accountingApi.reconcileTransaction(reconId, txnId).then(r => r.data),
    onSuccess: (_, txnId) => {
      setCheckedTxns((prev) => new Set([...prev, txnId]));
      queryClient.invalidateQueries({ queryKey: ['bank-transactions', activeId] });
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => accountingApi.finalizeReconciliation(reconId).then(r => r.data),
    onSuccess: () => {
      setReconOpen(false);
      setReconId('');
      setCheckedTxns(new Set());
      setClosingBalance('');
      queryClient.invalidateQueries({ queryKey: ['bank-transactions', activeId] });
      toast({ title: 'Reconciliation completed!' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Failed to finalize' }),
  });

  const totalAssets = accounts.reduce((s: number, a: any) => s + (Number(a.currentBalance) > 0 ? Number(a.currentBalance) : 0), 0);
  const totalCredits = transactions.filter((t: any) => t.type === 'CREDIT').reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);
  const totalDebits  = transactions.filter((t: any) => t.type === 'DEBIT' ).reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);

  const reconciledTotal = reconTxns
    .filter((t) => checkedTxns.has(t.id))
    .reduce((s, t) => s + (t.type === 'CREDIT' ? Number(t.amount) : -Number(t.amount)), 0);
  const difference = Number(closingBalance || 0) - reconciledTotal;

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Banking</h1>
          <p className="text-muted-foreground text-sm">Bank accounts and transaction history</p>
        </div>
        {activeId && (
          <Button variant="outline" onClick={() => setReconOpen(true)}>
            <GitMerge className="w-4 h-4 mr-2" />
            Reconcile
          </Button>
        )}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Assets',  display: `$${totalAssets.toLocaleString()}`,  icon: Landmark,    color: 'text-primary' },
          { label: 'Credits (selected)', display: `$${totalCredits.toLocaleString()}`, icon: TrendingUp,  color: 'text-green-400' },
          { label: 'Debits (selected)',  display: `$${totalDebits.toLocaleString()}`,  icon: TrendingDown, color: 'text-red-400' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-5 pb-5 flex items-center gap-3">
              <kpi.icon className={cn('w-8 h-8', kpi.color)} />
              <div><p className={cn('text-xl font-bold', kpi.color)}>{kpi.display}</p><p className="text-xs text-muted-foreground">{kpi.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Accounts</h2>
          {loadingAccounts && <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" /></div>}
          {accounts.length === 0 && !loadingAccounts ? (
            <Card><CardContent className="py-16 text-center">
              <Landmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-base font-medium text-foreground">No bank accounts</p>
              <p className="text-sm text-muted-foreground mt-1">Bank accounts can be added by your system administrator.</p>
            </CardContent></Card>
          ) : accounts.map((acc: any) => {
            const balance = Number(acc.currentBalance ?? 0);
            const isSelected = acc.id === activeId;
            return (
              <Card key={acc.id}
                className={cn('cursor-pointer transition-all', isSelected ? 'border-primary/50 bg-primary/5' : 'hover:border-white/20')}
                onClick={() => setSelectedAccountId(acc.id)}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{acc.accountName}</p>
                      <p className="text-xs text-muted-foreground">{acc.bankName}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{acc.currency ?? 'LRD'}</Badge>
                  </div>
                  <p className={cn('text-xl font-bold', balance >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {balance >= 0 ? '' : '-'}${Math.abs(balance).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">{acc.accountNumber}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Transactions */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {selectedAccount ? `${selectedAccount.accountName} — Transactions` : 'Transactions'}
            </h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => refetchTxns()}>
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {loadingTxns ? (
                <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" /></div>
              ) : transactions.length === 0 ? (
                <div className="py-12 text-center">
                  <Landmark className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No transactions for this account.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Date', 'Description', 'Reference', 'Amount', 'Reconciled'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn: any) => {
                        const isCredit = txn.type === 'CREDIT';
                        return (
                          <tr key={txn.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {txn.date ? format(new Date(txn.date), 'MMM d, yyyy') : '—'}
                            </td>
                            <td className="px-4 py-3 max-w-[200px] truncate">{txn.description}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{txn.reference || '—'}</td>
                            <td className={cn('px-4 py-3 font-semibold', isCredit ? 'text-green-400' : 'text-red-400')}>
                              {isCredit ? '+' : '-'}${Number(txn.amount ?? 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3">
                              {txn.isReconciled ? (
                                <Badge className="text-[10px] border border-green-500/30 bg-green-500/10 text-green-400">Reconciled</Badge>
                              ) : (
                                <Badge className="text-[10px] border border-amber-500/30 bg-amber-500/10 text-amber-400">Pending</Badge>
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
        </div>
      </div>

      {/* Reconciliation Sheet */}
      <Sheet open={reconOpen} onOpenChange={(v) => { setReconOpen(v); if (!v) { setReconId(''); setCheckedTxns(new Set()); } }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <GitMerge className="w-5 h-5" />
              Bank Reconciliation
              {selectedAccount && <span className="text-muted-foreground font-normal text-sm">— {selectedAccount.accountName}</span>}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            {!reconId ? (
              <>
                <p className="text-sm text-muted-foreground">Enter your bank statement details to start a reconciliation session.</p>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>Statement Date</Label>
                    <Input type="date" value={statementDate} onChange={(e) => setStatementDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Closing Balance (from bank statement)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={closingBalance}
                      onChange={(e) => setClosingBalance(e.target.value)}
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => startReconMutation.mutate()}
                  disabled={startReconMutation.isPending || !closingBalance || !activeId}
                >
                  {startReconMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Start Reconciliation
                </Button>
              </>
            ) : (
              <>
                {/* Running totals */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Statement Closing</p>
                    <p className="text-lg font-bold text-foreground">${Number(closingBalance).toLocaleString()}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Reconciled Balance</p>
                    <p className="text-lg font-bold text-foreground">${reconciledTotal.toLocaleString()}</p>
                  </div>
                </div>
                <div className={cn('rounded-lg p-3 text-center', Math.abs(difference) < 0.01 ? 'bg-green-500/10' : 'bg-amber-500/10')}>
                  <p className="text-xs text-muted-foreground">Difference</p>
                  <p className={cn('text-xl font-bold', Math.abs(difference) < 0.01 ? 'text-green-400' : 'text-amber-400')}>
                    {difference >= 0 ? '' : '-'}${Math.abs(difference).toFixed(2)}
                  </p>
                  {Math.abs(difference) < 0.01 && (
                    <p className="text-xs text-green-400 mt-1 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Balanced
                    </p>
                  )}
                </div>

                {/* Transaction list */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Unreconciled Transactions</p>
                  {reconTxns.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">All transactions reconciled</p>
                  ) : (
                    <div className="space-y-1 max-h-72 overflow-y-auto">
                      {reconTxns.map((txn: any) => {
                        const checked = checkedTxns.has(txn.id);
                        return (
                          <div key={txn.id} className={cn('flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30', checked && 'opacity-50')}>
                            <Checkbox
                              checked={checked}
                              disabled={checked || reconcileTxnMutation.isPending}
                              onCheckedChange={() => {
                                if (!checked) reconcileTxnMutation.mutate(txn.id);
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{txn.description}</p>
                              <p className="text-[10px] text-muted-foreground">{txn.date ? format(new Date(txn.date), 'dd MMM yyyy') : '—'}</p>
                            </div>
                            <span className={cn('text-xs font-semibold shrink-0', txn.type === 'CREDIT' ? 'text-green-400' : 'text-red-400')}>
                              {txn.type === 'CREDIT' ? '+' : '-'}${Number(txn.amount).toLocaleString()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={() => finalizeMutation.mutate()}
                  disabled={finalizeMutation.isPending}
                >
                  {finalizeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Finalize Reconciliation
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </FadeIn>
  );
}
