'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  BookOpen, TrendingUp, TrendingDown, DollarSign,
  FileText, Building2, Receipt, BarChart3, Plus, ChevronRight,
  CreditCard, Loader2, Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { accountingApi, reportsExportApi } from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import Link from 'next/link';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { useChartColors } from '@/hooks/use-chart-colors';
import { cn } from '@/lib/utils';

import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';

const accountTypeColors: Record<string, string> = {
  ASSET:     'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  LIABILITY: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  EQUITY:    'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400',
  REVENUE:   'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400',
  EXPENSE:   'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400',
};


function AccountingContent() {
  usePageTitle('Accounting');
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(
    initialTab && ['overview', 'accounts', 'trial', 'journal', 'banking', 'receivables'].includes(initialTab)
      ? initialTab : 'overview',
  );
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | null>(null);
  const propertyId = useAuthStore((s) => s.propertyId);

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (type: string) => {
    if (type === 'chart-of-accounts') {
      const csvRows = [
        ['Code', 'Name', 'Type', 'Balance'],
        ...accountList.map((a: any) => [
          a.code, a.name, a.type, Number(a.currentBalance ?? 0).toFixed(2),
        ]),
      ];
      const csv = csvRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      triggerDownload(new Blob([csv], { type: 'text/csv' }), 'chart-of-accounts.csv');
    } else {
      const res = await reportsExportApi.export({ type, propertyId: propertyId ?? '' });
      const blob = await res.blob();
      triggerDownload(blob, `${type}-report.csv`);
    }
  };
  const chartColors = useChartColors();

  const { data: accounts } = useQuery({
    queryKey: ['chart-of-accounts', propertyId],
    queryFn: () => accountingApi.chartOfAccounts(propertyId).then((r) => r.data),
  });

  const { data: plData } = useQuery({
    queryKey: ['profit-loss', propertyId],
    queryFn: () => accountingApi.profitAndLoss({
      propertyId,
      startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    }).then((r) => r.data),
    enabled: tab === 'overview',
  });

  const { data: journalData } = useQuery({
    queryKey: ['journal-entries', propertyId],
    queryFn: () => accountingApi.journalEntries({ tenantId: propertyId, limit: 30 }).then((r) => r.data),
    enabled: tab === 'journal',
  });

  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts', propertyId],
    queryFn: () => accountingApi.bankAccounts(propertyId).then((r) => r.data),
    enabled: tab === 'banking',
  });

  const { data: bankTxns } = useQuery({
    queryKey: ['bank-transactions', selectedBankAccountId],
    queryFn: () => accountingApi.bankTransactions(selectedBankAccountId!, { limit: 50 }).then((r) => r.data),
    enabled: !!selectedBankAccountId && tab === 'banking',
  });

  const { data: agedData } = useQuery({
    queryKey: ['aged-receivables'],
    queryFn: () => accountingApi.agedReceivables().then((r) => r.data),
    enabled: tab === 'receivables',
  });

  const postMutation = useMutation({
    mutationFn: (id: string) => accountingApi.postEntry(id),
  });

  const accountList: any[] = Array.isArray(accounts) ? accounts : [];
  const journalEntries: any[] = journalData?.data ?? [];
  const bankAccountList: any[] = Array.isArray(bankAccounts) ? bankAccounts : [];
  const txnList: any[] = Array.isArray(bankTxns) ? bankTxns : [];
  const aged = agedData ?? { buckets: {}, details: [] };

  const JE_STATUS_COLORS: Record<string, string> = {
    DRAFT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
    POSTED: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
    VOIDED: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  };

  const grouped = accountList.reduce((acc: any, acct: any) => {
    if (!acc[acct.type]) acc[acct.type] = [];
    acc[acct.type].push(acct);
    return acc;
  }, {});

  return (
    <FadeIn className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Accounting</h1>
          <p className="text-muted-foreground text-sm">
            Xero-style double-entry accounting & financial management
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('chart-of-accounts')}>
                <FileText className="w-4 h-4 mr-2" /> Chart of Accounts (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('revenue')}>
                <TrendingUp className="w-4 h-4 mr-2" /> P&L Report (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('guests')}>
                <Receipt className="w-4 h-4 mr-2" /> Guest Revenue (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => router.push('/accounting/journal-entries')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Journal Entry
          </Button>
        </div>
      </div>

      {/* Quick Links */}
      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Chart of Accounts', href: '/accounting/chart-of-accounts', icon: BookOpen, color: 'text-blue-600' },
          { label: 'Journal Entries', href: '/accounting/journal-entries', icon: FileText, color: 'text-purple-600' },
          { label: 'Invoices', href: '/accounting/invoices', icon: Receipt, color: 'text-green-600' },
          { label: 'Banking', href: '/accounting/banking', icon: Building2, color: 'text-amber-600' },
          { label: 'Bills', href: '/accounting/bills', icon: Receipt, color: 'text-red-600' },
          { label: 'Budgets', href: '/accounting/budgets', icon: BarChart3, color: 'text-cyan-600' },
          { label: 'P&L Report', href: '/accounting/reports', icon: TrendingUp, color: 'text-green-600' },
          { label: 'Balance Sheet', href: '/accounting/reports', icon: DollarSign, color: 'text-blue-600' },
        ].map((item) => (
          <StaggerItem key={item.label}>
            <Link href={item.href}>
              <Card className="hover:shadow-md transition-all cursor-pointer hover:border-primary">
                <CardContent className="pt-4 pb-4">
                  <item.icon className={`w-6 h-6 ${item.color} mb-2`} />
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                </CardContent>
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGrid>

      {/* Financial Summary */}
      <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StaggerItem>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Total Revenue</p>
              </div>
              <AnimatedCounter
                value={Number(plData?.totalRevenue ?? 0)}
                formatter={(v) => `$${v.toLocaleString()}`}
                className="text-3xl font-bold text-green-700 dark:text-green-300 block"
              />
              <p className="text-xs text-green-600 mt-1">Year to date</p>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <p className="text-sm font-medium text-red-700 dark:text-red-400">Total Expenses</p>
              </div>
              <AnimatedCounter
                value={Number(plData?.totalExpenses ?? 0)}
                formatter={(v) => `$${v.toLocaleString()}`}
                className="text-3xl font-bold text-red-700 dark:text-red-300 block"
              />
              <p className="text-xs text-red-600 mt-1">Year to date</p>
            </CardContent>
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Net Profit</p>
              </div>
              <AnimatedCounter
                value={Number(plData?.netProfit ?? 0)}
                formatter={(v) => `$${v.toLocaleString()}`}
                className="text-3xl font-bold text-blue-700 dark:text-blue-300 block"
              />
              <p className="text-xs text-blue-600 mt-1">
                {plData?.totalRevenue ? ((Number(plData.netProfit) / Number(plData.totalRevenue)) * 100).toFixed(1) : '0'}% margin
              </p>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerGrid>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">P&L Overview</TabsTrigger>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="trial">Trial Balance</TabsTrigger>
          <TabsTrigger value="journal">Journal Entries</TabsTrigger>
          <TabsTrigger value="banking">Banking</TabsTrigger>
          <TabsTrigger value="receivables">Aged Receivables</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue &amp; Expenses by Account — Year to Date</CardTitle>
            </CardHeader>
            <CardContent>
              {(!plData || (plData.revenue?.length === 0 && plData.expenses?.length === 0)) ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  No posted journal entries found for this period.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      ...(plData.revenue ?? []).map((r: any) => ({ name: r.name, amount: Math.abs(Number(r.amount)), type: 'Revenue' })),
                      ...(plData.expenses ?? []).map((e: any) => ({ name: e.name, amount: Math.abs(Number(e.amount)), type: 'Expense' })),
                    ]}
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                    <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']} />
                    <Legend />
                    <Bar dataKey="amount" name="Amount" fill={chartColors.chart2} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          <div className="space-y-4">
            {Object.entries(grouped).map(([type, accts]: any) => (
              <Card key={type}>
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${accountTypeColors[type]}`}>
                      {type}
                    </span>
                    <CardTitle className="text-sm">{type} ACCOUNTS</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-background">
                      <tr className="bg-muted/50">
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground">Code</th>
                        <th className="text-left px-4 py-2 text-xs text-muted-foreground">Account Name</th>
                        <th className="text-right px-4 py-2 text-xs text-muted-foreground">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accts.map((acct: any) => (
                        <tr key={acct.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{acct.code}</td>
                          <td className="px-4 py-2.5 font-medium text-foreground">{acct.name}</td>
                          <td className={`px-4 py-2.5 text-right font-medium ${Number(acct.currentBalance) < 0 ? 'text-red-600' : 'text-foreground'}`}>
                            ${Math.abs(Number(acct.currentBalance)).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trial" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trial Balance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground">Code</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground">Account</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground">Type</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground">Debit</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {accountList.map((acct: any) => {
                    const balance = Number(acct.currentBalance);
                    const isDebit = balance > 0;
                    return (
                      <tr key={acct.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{acct.code}</td>
                        <td className="px-4 py-2.5 text-foreground">{acct.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${accountTypeColors[acct.type]}`}>
                            {acct.type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-green-700 dark:text-green-400">
                          {isDebit ? `$${balance.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-red-700 dark:text-red-400">
                          {!isDebit ? `$${Math.abs(balance).toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                    <td colSpan={3} className="px-4 py-3 text-foreground">TOTALS</td>
                    <td className="px-4 py-3 text-right text-green-700">
                      ${accountList.filter((a: any) => Number(a.currentBalance) > 0)
                        .reduce((s: number, a: any) => s + Number(a.currentBalance), 0)
                        .toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-red-700">
                      ${accountList.filter((a: any) => Number(a.currentBalance) < 0)
                        .reduce((s: number, a: any) => s + Math.abs(Number(a.currentBalance)), 0)
                        .toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Journal Entries */}
        <TabsContent value="journal" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Journal Entries</CardTitle>
              <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-3.5 h-3.5 mr-1.5" /> New Entry
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {journalEntries.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No journal entries found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-background">
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Entry #</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Description</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Debit</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Credit</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {journalEntries.map((je: any) => (
                        <tr key={je.id} className="border-b border-border hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-mono text-xs text-primary">{je.entryNumber}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {je.date ? format(new Date(je.date), 'MMM d, yyyy') : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-foreground max-w-[220px] truncate">{je.description}</td>
                          <td className="px-4 py-2.5 text-right text-green-700 dark:text-green-400">
                            ${Number(je.totalDebit).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5 text-right text-red-700 dark:text-red-400">
                            ${Number(je.totalCredit).toLocaleString()}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', JE_STATUS_COLORS[je.status] ?? '')}>
                              {je.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {je.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={postMutation.isPending}
                                onClick={() => postMutation.mutate(je.id)}
                              >
                                {postMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Post'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banking */}
        <TabsContent value="banking" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bank accounts list */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Bank Accounts</h3>
              {bankAccountList.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No bank accounts configured.
                  </CardContent>
                </Card>
              ) : (
                bankAccountList.map((acct: any) => (
                  <Card
                    key={acct.id}
                    className={cn('cursor-pointer transition-all hover:shadow-md', selectedBankAccountId === acct.id && 'ring-2 ring-primary')}
                    onClick={() => setSelectedBankAccountId(acct.id)}
                  >
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{acct.accountName}</p>
                          <p className="text-xs text-muted-foreground">{acct.bankName} · {acct.currency}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                      </div>
                      <p className="text-xl font-bold mt-3">${Number(acct.currentBalance ?? 0).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Current Balance</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Transactions */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                {selectedBankAccountId ? 'Recent Transactions' : 'Select a bank account'}
              </h3>
              {!selectedBankAccountId ? (
                <Card>
                  <CardContent className="py-16 text-center text-muted-foreground text-sm">
                    <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    Select a bank account to view transactions
                  </CardContent>
                </Card>
              ) : txnList.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-sm text-muted-foreground">No transactions found.</CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 z-10 bg-background">
                        <tr className="border-b border-border bg-muted/50">
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Description</th>
                          <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                          <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Ref</th>
                        </tr>
                      </thead>
                      <tbody>
                        {txnList.map((txn: any) => (
                          <tr key={txn.id} className="border-b border-border hover:bg-muted/30">
                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                              {txn.date ? format(new Date(txn.date), 'MMM d, yyyy') : '—'}
                            </td>
                            <td className="px-4 py-2.5 text-foreground max-w-[200px] truncate">{txn.description}</td>
                            <td className={cn('px-4 py-2.5 text-right font-medium', Number(txn.amount) >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
                              {Number(txn.amount) >= 0 ? '+' : ''}${Math.abs(Number(txn.amount)).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{txn.reference ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Aged Receivables */}
        <TabsContent value="receivables" className="mt-4 space-y-4">
          {/* Buckets */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Current', key: 'current', color: 'text-green-700 dark:text-green-400' },
              { label: '1–30 Days', key: 'days30', color: 'text-amber-600 dark:text-amber-400' },
              { label: '31–60 Days', key: 'days60', color: 'text-orange-600 dark:text-orange-400' },
              { label: '61–90 Days', key: 'days90', color: 'text-red-600 dark:text-red-400' },
              { label: 'Over 90', key: 'over90', color: 'text-red-800 dark:text-red-300' },
            ].map(({ label, key, color }) => (
              <Card key={key}>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className={cn('text-xl font-bold', color)}>
                    ${Number(aged.buckets?.[key] ?? 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detail table */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {(aged.details ?? []).length === 0 ? (
                <div className="py-10 text-center text-muted-foreground text-sm">No outstanding invoices.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-background">
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Invoice #</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Due Date</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Outstanding</th>
                        <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Days Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aged.details.map((inv: any, i: number) => (
                        <tr key={i} className="border-b border-border hover:bg-muted/30">
                          <td className="px-4 py-2.5 font-mono text-xs text-primary">{inv.invoiceNumber}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">
                            {inv.dueDate ? format(new Date(inv.dueDate), 'MMM d, yyyy') : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold">${Number(inv.outstanding).toLocaleString()}</td>
                          <td className={cn('px-4 py-2.5 text-right text-xs font-medium', inv.daysDiff > 0 ? 'text-red-600' : 'text-green-600')}>
                            {inv.daysDiff > 0 ? `${inv.daysDiff}d overdue` : 'Current'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </FadeIn>
  );
}

export default function AccountingPage() {
  return (
    <Suspense fallback={null}>
      <AccountingContent />
    </Suspense>
  );
}
