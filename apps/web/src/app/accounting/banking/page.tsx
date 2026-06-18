'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Landmark, TrendingUp, TrendingDown, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { accountingApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { FadeIn } from '@/components/ui/fade-in';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/use-page-title';

const demoAccounts = [
  { id: '1', bankName: 'Trust Bank Liberia', accountName: 'Main Operating', accountNumber: '****4521', currency: 'LRD', currentBalance: 284500, isActive: true },
  { id: '2', bankName: 'Ecobank',            accountName: 'USD Account',    accountNumber: '****8834', currency: 'USD', currentBalance: 12340,  isActive: true },
  { id: '3', bankName: 'United Bank',        accountName: 'Petty Cash',     accountNumber: '****2210', currency: 'LRD', currentBalance: 3200,   isActive: true },
];

const demoTxns = [
  { id: 't1', date: new Date(), description: 'Room revenue', reference: 'RES-001', amount: 4500, type: 'CREDIT', isReconciled: true },
  { id: 't2', date: new Date(), description: 'Supplier payment – Fresh Foods',  reference: 'BILL-2024-0012', amount: 1200, type: 'DEBIT',  isReconciled: true },
  { id: 't3', date: new Date(), description: 'Staff payroll',  reference: 'PAY-JAN', amount: 8400, type: 'DEBIT',  isReconciled: false },
  { id: 't4', date: new Date(), description: 'Corporate booking – Firestone',  reference: 'RES-003', amount: 12000, type: 'CREDIT', isReconciled: false },
];

export default function BankingPage() {
  usePageTitle('Banking');
  const propertyId = useAuthStore((s) => s.propertyId);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const { data: accountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ['bank-accounts', propertyId],
    queryFn: () => accountingApi.bankAccounts(propertyId).then(r => r.data),
    placeholderData: demoAccounts,
  });

  const accounts: any[] = Array.isArray(accountsData) ? accountsData : (accountsData?.data ?? demoAccounts);
  const activeId = selectedAccountId || accounts[0]?.id;
  const selectedAccount = accounts.find((a: any) => a.id === activeId) ?? accounts[0];

  const { data: txnData, isLoading: loadingTxns } = useQuery({
    queryKey: ['bank-transactions', activeId],
    queryFn: () => accountingApi.bankTransactions(activeId, { limit: 50 }).then(r => r.data),
    enabled: !!activeId,
    placeholderData: demoTxns,
  });

  const transactions: any[] = Array.isArray(txnData) ? txnData : (txnData?.data ?? demoTxns);

  const totalAssets = accounts.reduce((s: number, a: any) => s + (Number(a.currentBalance) > 0 ? Number(a.currentBalance) : 0), 0);
  const totalCredits = transactions.filter((t: any) => t.type === 'CREDIT').reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);
  const totalDebits  = transactions.filter((t: any) => t.type === 'DEBIT' ).reduce((s: number, t: any) => s + Number(t.amount ?? 0), 0);

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Banking</h1>
          <p className="text-muted-foreground text-sm">Bank accounts and transaction history</p>
        </div>
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
          {accounts.map((acc: any) => {
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
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
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
    </FadeIn>
  );
}
