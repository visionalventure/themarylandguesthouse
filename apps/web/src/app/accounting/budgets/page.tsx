'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown, Target, Loader2, Pencil, Check, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { accountingApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';
import { FadeIn } from '@/components/ui/fade-in';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/use-page-title';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer } from 'recharts';

export default function BudgetsPage() {
  usePageTitle('Budgets');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const propertyId = useAuthStore((s) => s.propertyId);

  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', period: 'MONTHLY', startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'), endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd') });

  // Fetch budget list
  const { data: budgetsData, isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets', propertyId],
    queryFn: () => accountingApi.getBudgets(propertyId!).then(r => r.data),
    enabled: !!propertyId,
  });
  const budgets: any[] = Array.isArray(budgetsData) ? budgetsData : [];

  // Auto-select first budget
  const activeBudgetId = selectedBudgetId || budgets[0]?.id || '';

  // Fetch selected budget with actuals
  const { data: budgetDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['budget-detail', activeBudgetId],
    queryFn: () => accountingApi.getBudget(activeBudgetId).then(r => r.data),
    enabled: !!activeBudgetId,
  });

  const lines: any[] = budgetDetail?.lines ?? [];
  const revenue = lines.filter((l: any) => l.accountName?.startsWith('4') || l.section === 'Revenue');
  const allLines = lines;

  const totalBudget = allLines.reduce((s: number, l: any) => s + Number(l.amount ?? 0), 0);
  const totalActual = allLines.reduce((s: number, l: any) => s + Number(l.actual ?? 0), 0);
  const totalVariance = totalBudget - totalActual;

  const chartData = allLines.slice(0, 8).map((l: any) => ({
    name: (l.accountName ?? '').length > 14 ? (l.accountName ?? '').slice(0, 14) + '…' : (l.accountName ?? ''),
    Budget: Number(l.amount ?? 0),
    Actual: Number(l.actual ?? 0),
  }));

  // Update budget line mutation
  const updateLineMutation = useMutation({
    mutationFn: ({ lineId, amount }: { lineId: string; amount: number }) =>
      accountingApi.updateBudgetLine(activeBudgetId, lineId, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-detail', activeBudgetId] });
      setEditingLineId(null);
      toast({ title: 'Budget line updated' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Failed to update budget line' }),
  });

  // Create budget mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => accountingApi.createBudget({ ...data, propertyId }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['budgets', propertyId] });
      setSelectedBudgetId(res.data.id);
      setCreateOpen(false);
      toast({ title: 'Budget created' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Failed to create budget' }),
  });

  const saveEdit = (lineId: string) => {
    const amount = parseFloat(editValue) || 0;
    updateLineMutation.mutate({ lineId, amount });
  };

  const activeBudget = budgets.find(b => b.id === activeBudgetId);

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget vs Actual</h1>
          <p className="text-muted-foreground text-sm">Compare planned budgets to actual P&L performance</p>
        </div>
        <div className="flex items-center gap-2">
          {budgets.length > 0 && (
            <Select value={activeBudgetId} onValueChange={setSelectedBudgetId}>
              <SelectTrigger className="w-52 h-8 text-xs">
                <SelectValue placeholder="Select a budget…" />
              </SelectTrigger>
              <SelectContent>
                {budgets.map((b: any) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> New Budget
          </Button>
        </div>
      </div>

      {/* Budget metadata */}
      {activeBudget && (
        <p className="text-xs text-muted-foreground">
          {activeBudget.period} · {activeBudget.startDate ? format(new Date(activeBudget.startDate), 'MMM d, yyyy') : ''} — {activeBudget.endDate ? format(new Date(activeBudget.endDate), 'MMM d, yyyy') : ''}
        </p>
      )}

      {/* KPIs */}
      {activeBudgetId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Budget', display: `$${totalBudget.toLocaleString()}`, icon: Target, color: 'text-primary' },
            { label: 'Total Actual', display: `$${totalActual.toLocaleString()}`, icon: TrendingUp, color: 'text-blue-400' },
            {
              label: 'Variance', icon: totalVariance >= 0 ? TrendingUp : TrendingDown,
              display: `${totalVariance >= 0 ? '+' : ''}$${Math.abs(totalVariance).toLocaleString()}`,
              color: totalVariance >= 0 ? 'text-green-400' : 'text-red-400',
            },
          ].map(kpi => (
            <Card key={kpi.label}>
              <CardContent className="pt-5 pb-5 flex items-center gap-3">
                <kpi.icon className={cn('w-8 h-8', kpi.color)} />
                <div>
                  <p className={cn('text-xl font-bold', kpi.color)}>{kpi.display}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Budget vs Actual by Line</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`$${Number(v).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Budget" fill="rgba(212,175,55,0.6)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="rgba(99,205,120,0.7)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {budgetsLoading || detailLoading ? (
            <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" /></div>
          ) : !activeBudgetId || budgets.length === 0 ? (
            <div className="py-16 text-center">
              <Target className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No budgets yet. Create one to start tracking.</p>
              <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Budget
              </Button>
            </div>
          ) : allLines.length === 0 ? (
            <div className="py-16 text-center">
              <Target className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">This budget has no line items yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Account', 'Budget', 'Actual', 'Variance', '% Used'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allLines.map((line: any) => {
                    const budget = Number(line.amount ?? 0);
                    const actual = Number(line.actual ?? 0);
                    const variance = budget - actual;
                    const pctUsed = budget > 0 ? Math.round((actual / budget) * 100) : null;
                    const isEditing = editingLineId === line.id;
                    return (
                      <tr key={line.id} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors group">
                        <td className="px-4 py-3 font-medium">{line.accountName ?? '—'}</td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input type="number" className="h-7 w-28 text-xs" value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(line.id); if (e.key === 'Escape') setEditingLineId(null); }}
                                autoFocus />
                              <button onClick={() => saveEdit(line.id)} className="text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingLineId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span>{budget > 0 ? `$${budget.toLocaleString()}` : <span className="text-muted-foreground/50">—</span>}</span>
                              <button onClick={() => { setEditingLineId(line.id); setEditValue(String(budget || '')); }}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity">
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold">${actual.toLocaleString()}</td>
                        <td className={cn('px-4 py-3 font-semibold', budget > 0 ? (variance >= 0 ? 'text-green-400' : 'text-red-400') : 'text-muted-foreground')}>
                          {budget > 0 ? `${variance >= 0 ? '+' : ''}$${Math.abs(variance).toLocaleString()}` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {pctUsed !== null ? (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden w-20">
                                <div className={cn('h-full rounded-full', pctUsed > 100 ? 'bg-red-500' : pctUsed > 80 ? 'bg-amber-500' : 'bg-green-500')}
                                  style={{ width: `${Math.min(100, pctUsed)}%` }} />
                              </div>
                              <span className={cn('text-xs font-medium', pctUsed > 100 ? 'text-red-400' : pctUsed > 80 ? 'text-amber-400' : 'text-green-400')}>
                                {pctUsed}%
                              </span>
                            </div>
                          ) : <span className="text-muted-foreground/40 text-xs">no budget</span>}
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

      {/* Create Budget Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Budget</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Budget Name</Label>
              <Input className="h-8 text-xs" placeholder="e.g. Q1 2026 Operating Budget"
                value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Period</Label>
              <Select value={createForm.period} onValueChange={v => setCreateForm(f => ({ ...f, period: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="ANNUAL">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <Input type="date" className="h-8 text-xs" value={createForm.startDate}
                  onChange={e => setCreateForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Date</Label>
                <Input type="date" className="h-8 text-xs" value={createForm.endDate}
                  onChange={e => setCreateForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Budget lines are added per GL account. After creating, go to Chart of Accounts to associate accounts.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!createForm.name.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate(createForm)}>
              {createMutation.isPending ? 'Creating…' : 'Create Budget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
