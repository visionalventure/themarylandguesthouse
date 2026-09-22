'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  Percent,
  UserCheck,
  ShieldCheck,
  Wrench,
  Printer,
  Download,
  ArrowRight,
  Receipt,
  Users2,
  CalendarClock,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { useChartColors } from '@/hooks/use-chart-colors';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';
import { ownerApi, ownerExportApi } from '@/lib/api';
import { cn } from '@/lib/utils';

function KPICard({
  title, value, numericValue, formatter, subtitle, icon: Icon, color = 'blue', loading,
}: {
  title: string; value: string | number; numericValue?: number; formatter?: (v: number) => string;
  subtitle?: string; icon: any; color?: string; loading?: boolean;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-primary/10 text-primary',
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    red: 'bg-red-500/10 text-red-600 dark:text-red-400',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {numericValue !== undefined ? (
              <AnimatedCounter value={numericValue} formatter={formatter} className="text-2xl font-bold mt-1 text-foreground block" />
            ) : (
              <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
            )}
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={cn('p-3 rounded-xl', colorMap[color] || colorMap.blue)}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({
  icon: Icon, title, section, propertyId, href, hrefLabel,
}: { icon: any; title: string; section: string; propertyId: string; href: string; hrefLabel: string }) {
  return (
    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
      <CardTitle className="text-base flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        {title}
      </CardTitle>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs gap-1"
          onClick={async () => {
            const res = await ownerExportApi.export({ section, propertyId });
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `owner-overview-${section}-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="w-3 h-3" /> CSV
        </Button>
        <Link href={href}>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary">
            {hrefLabel} <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </CardHeader>
  );
}

function StatRow({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
      {items.map((it) => (
        <div key={it.label}>
          <p className="text-xs text-muted-foreground">{it.label}</p>
          <p className="text-lg font-semibold text-foreground">{it.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function OwnerOverviewPage() {
  usePageTitle('Owner Overview');
  const { user, propertyId } = useAuthStore();
  const chartColors = useChartColors();
  const CHART_COLORS = [chartColors.chart1, chartColors.chart2, chartColors.chart3, chartColors.chart4, chartColors.chart5, chartColors.primary];

  const { data, isLoading } = useQuery({
    queryKey: ['owner-overview', propertyId],
    queryFn: () => ownerApi.overview(propertyId).then((r) => r.data),
    refetchInterval: 60000,
  });

  const financial = data?.financial;
  const bookings = data?.bookings;
  const people = data?.people;
  const compliance = data?.compliance;
  const operations = data?.operations;

  const revenueCategoryData: any[] = financial?.revenueByCategory ?? [];
  const revenueChartData: any[] = bookings?.revenueChart ?? [];
  const bookingSourcesData: any[] = bookings?.bookingSources ?? [];
  const headcountData: any[] = people?.headcountByDepartment ?? [];
  const maintenanceByStatus: any[] = operations?.maintenance?.byStatus ?? [];

  const buckets = financial?.agedReceivables ?? { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Owner Overview{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            A complete view of financials, bookings, people, compliance and operations.
          </p>
        </div>
        <Button
          variant="outline"
          className="h-9 gap-1.5"
          onClick={() => window.open(`/owner-overview/print?propertyId=${propertyId}`, '_blank')}
        >
          <Printer className="w-4 h-4" /> Print Full Report
        </Button>
      </div>

      <StaggerGrid className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StaggerItem>
          <KPICard title="Revenue Today" value={`$${(financial?.revenueToday ?? 0).toLocaleString()}`}
            numericValue={financial?.revenueToday ?? 0} formatter={(v) => `$${v.toLocaleString()}`} icon={DollarSign} color="green" loading={isLoading} />
        </StaggerItem>
        <StaggerItem>
          <KPICard title="Revenue This Month" value={`$${(financial?.revenueThisMonth ?? 0).toLocaleString()}`}
            numericValue={financial?.revenueThisMonth ?? 0} formatter={(v) => `$${v.toLocaleString()}`} icon={TrendingUp} color="purple" loading={isLoading} />
        </StaggerItem>
        <StaggerItem>
          <KPICard title="Occupancy Rate" value={`${bookings?.occupancyRate ?? 0}%`}
            numericValue={bookings?.occupancyRate ?? 0} formatter={(v) => `${v}%`} icon={Percent} color="blue" loading={isLoading} />
        </StaggerItem>
        <StaggerItem>
          <KPICard title="Staff Present" value={people?.presentStaff ?? 0}
            numericValue={people?.presentStaff ?? 0} icon={UserCheck} color="cyan" loading={isLoading} />
        </StaggerItem>
        <StaggerItem>
          <KPICard title="Compliance Score" value={`${compliance?.complianceScore ?? 100}%`}
            numericValue={compliance?.complianceScore ?? 100} formatter={(v) => `${v}%`} icon={ShieldCheck} color="green" loading={isLoading} />
        </StaggerItem>
        <StaggerItem>
          <KPICard title="Maintenance Pending" value={operations?.pendingMaintenance ?? 0}
            numericValue={operations?.pendingMaintenance ?? 0} icon={Wrench} color="red" loading={isLoading} />
        </StaggerItem>
      </StaggerGrid>

      {/* Financial */}
      <Card>
        <SectionHeader icon={DollarSign} title="Financial" section="financial" propertyId={propertyId} href="/accounting" hrefLabel="View Accounting" />
        <CardContent>
          <StatRow items={[
            { label: 'Net Profit (MTD)', value: `$${(financial?.profitAndLoss?.netProfit ?? 0).toLocaleString()}` },
            { label: 'Total Revenue (MTD)', value: `$${(financial?.profitAndLoss?.totalRevenue ?? 0).toLocaleString()}` },
            { label: 'Total Expenses (MTD)', value: `$${(financial?.profitAndLoss?.totalExpenses ?? 0).toLocaleString()}` },
            { label: 'Outstanding Invoices', value: `$${(financial?.outstandingInvoicesAmount ?? 0).toLocaleString()} (${financial?.outstandingInvoicesCount ?? 0})` },
          ]} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Revenue by Category</p>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={revenueCategoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="amount" nameKey="category">
                    {revenueCategoryData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']} />
                  <Legend iconSize={9} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Aged Receivables</p>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {[
                  { label: 'Current', value: buckets.current },
                  { label: '1-30 days', value: buckets.days30 },
                  { label: '31-60 days', value: buckets.days60 },
                  { label: '61-90 days', value: buckets.days90 },
                  { label: '90+ days', value: buckets.over90 },
                ].map((b) => (
                  <div key={b.label} className="rounded-lg border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">{b.label}</p>
                    <p className="text-sm font-semibold text-foreground">${Number(b.value).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings */}
      <Card>
        <SectionHeader icon={Percent} title="Bookings" section="bookings" propertyId={propertyId} href="/reports" hrefLabel="View Analytics" />
        <CardContent>
          <StatRow items={[
            { label: 'Room Occupancy', value: `${bookings?.occupancyRate ?? 0}% (${bookings?.occupiedRooms ?? 0}/${bookings?.totalRooms ?? 0})` },
            { label: 'Apartment Occupancy', value: `${bookings?.apartmentOccupancyRate ?? 0}% (${bookings?.occupiedApartments ?? 0}/${bookings?.totalApartments ?? 0})` },
            { label: 'Check-ins Today', value: bookings?.checkInsToday ?? 0 },
            { label: 'Check-outs Today', value: bookings?.checkOutsToday ?? 0 },
            { label: 'Active Short Stays', value: bookings?.activeShortStays ?? 0 },
          ]} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Revenue — Last 30 Days</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="ownerRevGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartColors.muted }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: chartColors.muted }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke={chartColors.primary} strokeWidth={2} fill="url(#ownerRevGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Booking Sources</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={bookingSourcesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} opacity={0.5} />
                  <XAxis dataKey="source" tick={{ fontSize: 10, fill: chartColors.muted }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: chartColors.muted }} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* People */}
      <Card>
        <SectionHeader icon={Users2} title="People" section="people" propertyId={propertyId} href="/hr/reports" hrefLabel="View HR Reports" />
        <CardContent>
          <StatRow items={[
            { label: 'Total Employees', value: people?.totalEmployees ?? 0 },
            { label: 'Active', value: people?.activeEmployees ?? 0 },
            { label: 'On Leave', value: people?.onLeave ?? 0 },
            { label: 'Pending Approvals', value: people?.pendingApprovals ?? 0 },
            { label: 'Contracts Expiring (60d)', value: people?.contractsExpiring ?? 0 },
            { label: 'Payroll Net Pay (MTD)', value: `$${(people?.payrollThisPeriod?.netPay ?? 0).toLocaleString()}` },
          ]} />
          <p className="text-xs font-medium text-muted-foreground mb-2">Headcount by Department</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={headcountData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} opacity={0.5} />
              <XAxis type="number" tick={{ fontSize: 10, fill: chartColors.muted }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="department" width={110} tick={{ fontSize: 10, fill: chartColors.muted }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="employees" fill={chartColors.chart2} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Compliance */}
      <Card>
        <SectionHeader icon={ShieldCheck} title="Compliance" section="compliance" propertyId={propertyId} href="/documents" hrefLabel="View Documents" />
        <CardContent>
          <StatRow items={[
            { label: 'Compliance Score', value: `${compliance?.complianceScore ?? 100}%` },
            { label: 'Tracked Documents', value: compliance?.total ?? 0 },
            { label: 'Valid', value: compliance?.validCount ?? 0 },
            { label: 'Expiring in 30 days', value: compliance?.expiring30Count ?? 0 },
            { label: 'Expiring in 90 days', value: compliance?.expiring90Count ?? 0 },
            { label: 'Expired', value: compliance?.expiredCount ?? 0 },
          ]} />
          <p className="text-xs font-medium text-muted-foreground mb-2">Expiring Within 30 Days</p>
          {(compliance?.expiring30 ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">Nothing expiring in the next 30 days.</p>
          ) : (
            <div className="space-y-1.5">
              {compliance.expiring30.slice(0, 6).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-sm border-b border-border last:border-0 py-1.5">
                  <span className="text-foreground">{d.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{d.category}</Badge>
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      {d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Operations */}
      <Card>
        <SectionHeader icon={Sparkles} title="Operations" section="operations" propertyId={propertyId} href="/reports" hrefLabel="View Reports" />
        <CardContent>
          <StatRow items={[
            { label: 'Housekeeping Completion', value: `${operations?.housekeeping?.completionRate ?? 0}%` },
            { label: 'HK Pending', value: operations?.housekeeping?.pending ?? 0 },
            { label: 'HK In Progress', value: operations?.housekeeping?.inProgress ?? 0 },
            { label: 'Work Orders (30d)', value: operations?.maintenance?.total ?? 0 },
            { label: 'Low Stock Alerts', value: operations?.lowStockAlerts ?? 0 },
            {
              label: 'Restaurant Revenue (MTD)',
              value: operations?.restaurantRevenue ? `$${Number(operations.restaurantRevenue.total).toLocaleString()}` : 'N/A',
            },
          ]} />
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" /> Maintenance by Status
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={maintenanceByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} opacity={0.5} />
              <XAxis dataKey="status" tick={{ fontSize: 10, fill: chartColors.muted }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: chartColors.muted }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill={chartColors.chart3} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {operations?.restaurantRevenue && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <UtensilsCrossed className="w-3.5 h-3.5" />
              {operations.restaurantRevenue.orderCount} orders served this month
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
        <CalendarClock className="w-3.5 h-3.5" />
        Generated {data?.generatedAt ? new Date(data.generatedAt).toLocaleString() : '—'}
      </div>
    </FadeIn>
  );
}
