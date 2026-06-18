'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, format, startOfMonth, endOfMonth } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { TrendingUp, Users, BedDouble, DollarSign, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { reportsApi, reportsExportApi } from '@/lib/api';
import { cn } from '@/lib/utils';

import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';

const PRESETS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: 'This Month', days: 0 },
  { label: '90 Days', days: 90 },
];

const CHART_COLORS = ['#9079E9', '#8DD1B6', '#F9CDD0', '#F59E0B', '#60A5FA'];

export default function ReportsPage() {
  usePageTitle('Analytics');
  const propertyId = useAuthStore((s) => s.propertyId);
  const [preset, setPreset] = useState(30);

  const getRange = () => {
    if (preset === 0) return { startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'), endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd') };
    return { startDate: format(subDays(new Date(), preset), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd') };
  };
  const range = getRange();

  const { data: occupancyData } = useQuery({
    queryKey: ['report-occupancy', range],
    queryFn: () => reportsApi.occupancy({ propertyId: propertyId, ...range }).then(r => r.data),
  });

  const { data: revenueData } = useQuery({
    queryKey: ['report-revenue', range],
    queryFn: () => reportsApi.revenue({ propertyId: propertyId, ...range }).then(r => r.data),
  });

  const { data: guestsData } = useQuery({
    queryKey: ['report-guests', range],
    queryFn: () => reportsApi.guests({ propertyId: propertyId, ...range }).then(r => r.data),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['report-summary', range],
    queryFn: () => reportsApi.financialSummary({ propertyId: propertyId, ...range }).then(r => r.data),
  });

  const summary = summaryData ?? {};
  const occupancyByDay: any[] = occupancyData?.byDay ?? [];
  const revenueByDay: any[] = revenueData?.byDay ?? [];
  const revenueBySource: any[] = revenueData?.bySource ?? [];
  const topGuests: any[] = guestsData?.topGuests ?? [];
  const avgOccupancy = occupancyData?.averageOccupancy ?? 0;
  const totalRevenue = revenueData?.total ?? 0;
  const totalGuests = guestsData?.total ?? 0;
  const newGuests = guestsData?.newGuests ?? 0;

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics & Reports</h1>
          <p className="text-muted-foreground text-sm">Business intelligence and performance metrics</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(p => (
            <Button
              key={p.label}
              size="sm"
              variant={preset === p.days ? 'default' : 'outline'}
              className={cn('h-8 text-xs', preset === p.days ? 'bg-primary text-primary-foreground' : '')}
              onClick={() => setPreset(p.days)}
            >
              {p.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={async () => {
              const res = await reportsExportApi.export({ type: 'occupancy', propertyId: propertyId, ...range });
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `occupancy-${new Date().toISOString().slice(0,10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Occupancy', value: avgOccupancy, icon: BedDouble, color: 'text-primary', formatter: (v: number) => `${v.toFixed(1)}%` },
          { label: 'Total Revenue', value: totalRevenue, icon: DollarSign, color: 'text-green-500', formatter: (v: number) => `$${v.toFixed(0)}` },
          { label: 'Total Guests', value: totalGuests, icon: Users, color: 'text-amber-500' },
          { label: 'New Guests', value: newGuests, icon: TrendingUp, color: 'text-violet-500' },
        ].map(stat => (
          <StaggerItem key={stat.label}>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <stat.icon className={cn('w-8 h-8', stat.color)} />
                  <div>
                    <AnimatedCounter value={stat.value} formatter={stat.formatter} className="text-2xl font-bold block" />
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGrid>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Occupancy % Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {occupancyByDay.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data for period</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={occupancyByDay}>
                  <defs>
                    <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9079E9" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#9079E9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={d => format(new Date(d), 'MMM d')} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                  <Tooltip formatter={(v: any) => [`${Number(v).toFixed(1)}%`, 'Occupancy']} />
                  <Area type="monotone" dataKey="occupancyRate" stroke="#9079E9" fill="url(#occGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByDay.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data for period</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueByDay}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8DD1B6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8DD1B6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={d => format(new Date(d), 'MMM d')} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(0)}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#8DD1B6" fill="url(#revGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Revenue by Source</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueBySource.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data for period</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={revenueBySource} dataKey="total" nameKey="source" cx="50%" cy="50%" outerRadius={80} label={({ source, percent }) => `${source} ${(percent * 100).toFixed(0)}%`}>
                    {revenueBySource.map((_: any, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => `$${Number(v).toFixed(0)}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Guests by Spend</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topGuests.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">No guest data for period</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Guest</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Stays</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {topGuests.slice(0, 8).map((g: any, i: number) => (
                    <tr key={g.id ?? i} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-2 text-xs text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2">
                        <p className="font-medium text-foreground">{g.firstName} {g.lastName}</p>
                        <p className="text-xs text-muted-foreground">{g.email}</p>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{g.totalStays ?? g._count?.reservations ?? 0}</td>
                      <td className="px-4 py-2 text-right font-semibold">${Number(g.totalSpend ?? g._sum?.totalAmount ?? 0).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}
