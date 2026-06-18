'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Target, Loader2, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { accountingApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { FadeIn } from '@/components/ui/fade-in';
import { cn } from '@/lib/utils';
import { usePageTitle } from '@/hooks/use-page-title';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const STORAGE_KEY = 'mgh-budgets';

function loadBudgets(): Record<string, Record<string, number>> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { return {}; }
}

function saveBudgets(data: Record<string, Record<string, number>>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function BudgetsPage() {
  usePageTitle('Budgets');
  const propertyId = useAuthStore((s) => s.propertyId);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [budgets, setBudgets] = useState<Record<string, Record<string, number>>>({});
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const periodKey = format(currentMonth, 'yyyy-MM');
  const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
  const endDate   = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

  useEffect(() => { setBudgets(loadBudgets()); }, []);

  const { data: plData, isLoading } = useQuery({
    queryKey: ['pl-budgets', propertyId, startDate, endDate],
    queryFn: () => accountingApi.profitAndLoss({ propertyId, startDate, endDate }).then(r => r.data),
  });

  const revenue: any[]  = plData?.revenue  ?? [];
  const expenses: any[] = plData?.expenses ?? [];
  const allItems = [
    ...revenue.map((r: any) => ({ ...r, section: 'Revenue' })),
    ...expenses.map((e: any) => ({ ...e, section: 'Expenses' })),
  ];

  const getBudget = useCallback((name: string) => budgets[periodKey]?.[name] ?? 0, [budgets, periodKey]);

  const saveEdit = (name: string) => {
    const val = parseFloat(editValue) || 0;
    const updated = { ...budgets, [periodKey]: { ...(budgets[periodKey] ?? {}), [name]: val } };
    setBudgets(updated); saveBudgets(updated); setEditingRow(null);
  };

  const totalBudget  = allItems.reduce((s, i) => s + getBudget(i.name), 0);
  const totalActual  = allItems.reduce((s, i) => s + Math.abs(Number(i.amount ?? 0)), 0);
  const totalVariance = totalBudget - totalActual;

  const chartData = allItems.slice(0, 8).map(i => ({
    name: i.name.length > 14 ? i.name.slice(0, 14) + '…' : i.name,
    Budget: getBudget(i.name),
    Actual: Math.abs(Number(i.amount ?? 0)),
  }));

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Budget vs Actual</h1>
          <p className="text-muted-foreground text-sm">Compare planned budgets to actual P&L performance</p>
        </div>
        {/* Month selector */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[110px] text-center">{format(currentMonth, 'MMMM yyyy')}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Budget',   display: `$${totalBudget.toLocaleString()}`,              icon: Target,      color: 'text-primary' },
          { label: 'Total Actual',   display: `$${totalActual.toLocaleString()}`,               icon: TrendingUp,  color: 'text-blue-400' },
          { label: 'Variance',       display: `${totalVariance >= 0 ? '+' : ''}$${totalVariance.toLocaleString()}`,
            icon: totalVariance >= 0 ? TrendingUp : TrendingDown, color: totalVariance >= 0 ? 'text-green-400' : 'text-red-400' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="pt-5 pb-5 flex items-center gap-3">
              <kpi.icon className={cn('w-8 h-8', kpi.color)} />
              <div><p className={cn('text-xl font-bold', kpi.color)}>{kpi.display}</p><p className="text-xs text-muted-foreground">{kpi.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Budget vs Actual by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v: any) => [`$${Number(v).toLocaleString()}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Budget" fill="rgba(212,175,55,0.6)"  radius={[4,4,0,0]} />
                <Bar dataKey="Actual" fill="rgba(99,205,120,0.7)"  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" /></div>
          ) : allItems.length === 0 ? (
            <div className="py-16 text-center">
              <Target className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No P&L data for this period. Set budgets and post journal entries to see data.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {['Section', 'Category', 'Budget', 'Actual', 'Variance', '% Used'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allItems.map((item: any) => {
                    const budget   = getBudget(item.name);
                    const actual   = Math.abs(Number(item.amount ?? 0));
                    const variance = budget - actual;
                    const pctUsed  = budget > 0 ? Math.round((actual / budget) * 100) : null;
                    const isEditing = editingRow === item.name;
                    return (
                      <tr key={item.name} className="border-b border-border/50 hover:bg-white/[0.02] transition-colors group">
                        <td className="px-4 py-3">
                          <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-medium',
                            item.section === 'Revenue' ? 'border-green-500/30 bg-green-500/10 text-green-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400')}>
                            {item.section}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{item.name}</td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Input type="number" className="h-7 w-28 text-xs" value={editValue} onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(item.name); if (e.key === 'Escape') setEditingRow(null); }}
                                autoFocus />
                              <button onClick={() => saveEdit(item.name)} className="text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingRow(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span>{budget > 0 ? `$${budget.toLocaleString()}` : <span className="text-muted-foreground/50">—</span>}</span>
                              <button onClick={() => { setEditingRow(item.name); setEditValue(String(budget || '')); }}
                                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity">
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold">${actual.toLocaleString()}</td>
                        <td className={cn('px-4 py-3 font-semibold', budget > 0 ? (variance >= 0 ? 'text-green-400' : 'text-red-400') : 'text-muted-foreground')}>
                          {budget > 0 ? `${variance >= 0 ? '+' : ''}$${variance.toLocaleString()}` : '—'}
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
      <p className="text-xs text-muted-foreground text-center">Budget figures are stored locally in your browser. Click the pencil icon to edit any row.</p>
    </FadeIn>
  );
}
