'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BedDouble,
  TrendingUp,
  Users,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Wrench,
  Receipt,
  UserCheck,
  Percent,
  Plus,
  CalendarCheck,
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { dashboardApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { useChartColors } from '@/hooks/use-chart-colors';

import { usePageTitle } from '@/hooks/use-page-title';

function KPICard({
  title,
  value,
  numericValue,
  formatter,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'blue',
  loading,
}: {
  title: string;
  value: string | number;
  numericValue?: number;
  formatter?: (v: number) => string;
  subtitle?: string;
  icon: any;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
  loading?: boolean;
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
              <AnimatedCounter
                value={numericValue}
                formatter={formatter}
                className="text-2xl font-bold mt-1 text-foreground block"
              />
            ) : (
              <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
            )}
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
            {trendValue && (
              <div
                className={cn(
                  'flex items-center gap-1 mt-2 text-xs font-medium',
                  trend === 'up' && 'text-green-600',
                  trend === 'down' && 'text-red-600',
                  trend === 'neutral' && 'text-muted-foreground',
                )}
              >
                <TrendingUp className="w-3 h-3" />
                {trendValue}
              </div>
            )}
          </div>
          <div className={cn('p-3 rounded-xl', colorMap[color] || colorMap.blue)}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { user, propertyId } = useAuthStore();
  const chartColors = useChartColors();
  const CHART_COLORS = [
    chartColors.chart1,
    chartColors.chart2,
    chartColors.chart3,
    chartColors.chart4,
    chartColors.chart5,
    chartColors.primary,
  ];

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard-kpis', propertyId],
    queryFn: () => dashboardApi.getKPIs(propertyId).then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: revenueChart } = useQuery({
    queryKey: ['revenue-chart', propertyId],
    queryFn: () => dashboardApi.getRevenueChart(propertyId, 30).then((r) => r.data),
  });

  const { data: revenueByCategory } = useQuery({
    queryKey: ['revenue-category', propertyId],
    queryFn: () => dashboardApi.getRevenueByCategory(propertyId).then((r) => r.data),
  });

  const { data: activity } = useQuery({
    queryKey: ['recent-activity', propertyId],
    queryFn: () => dashboardApi.getRecentActivity(propertyId).then((r) => r.data),
    refetchInterval: 60000,
  });

  // Demo data for charts when API data isn't available
  const demoRevenueData = [
    { date: 'Jan 1', revenue: 2400 }, { date: 'Jan 2', revenue: 1398 },
    { date: 'Jan 3', revenue: 9800 }, { date: 'Jan 4', revenue: 3908 },
    { date: 'Jan 5', revenue: 4800 }, { date: 'Jan 6', revenue: 3800 },
    { date: 'Jan 7', revenue: 4300 }, { date: 'Jan 8', revenue: 5200 },
    { date: 'Jan 9', revenue: 7800 }, { date: 'Jan 10', revenue: 6200 },
  ];

  const demoCategoryData = [
    { category: 'Room Revenue', amount: 45000 },
    { category: 'Food & Beverage', amount: 18000 },
    { category: 'Events', amount: 8000 },
    { category: 'Other', amount: 3500 },
  ];

  const chartData = revenueChart || demoRevenueData;
  const categoryData = revenueByCategory || demoCategoryData;

  return (
    <FadeIn className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Good {getGreeting()},{' '}
          <span className="text-primary">{user?.firstName || 'Manager'}</span>!
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s what&apos;s happening at Maryland Guesthouse today.
        </p>
      </div>

      {/* KPI Grid */}
      <StaggerGrid className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StaggerItem>
          <KPICard
            title="Occupancy Rate"
            value={`${kpis?.occupancyRate ?? 0}%`}
            numericValue={kpis?.occupancyRate ?? 0}
            formatter={(v) => `${v}%`}
            subtitle={`${kpis?.occupiedRooms ?? 0} of ${kpis?.totalRooms ?? 0} rooms`}
            icon={Percent}
            color="blue"
            trendValue="+5% vs last week"
            trend="up"
            loading={kpisLoading}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            title="Revenue Today"
            value={`$${(kpis?.revenueToday ?? 0).toLocaleString()}`}
            numericValue={kpis?.revenueToday ?? 0}
            formatter={(v) => `$${v.toLocaleString()}`}
            icon={TrendingUp}
            color="green"
            trendValue="+12% vs yesterday"
            trend="up"
            loading={kpisLoading}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            title="Monthly Revenue"
            value={`$${(kpis?.revenueThisMonth ?? 0).toLocaleString()}`}
            numericValue={kpis?.revenueThisMonth ?? 0}
            formatter={(v) => `$${v.toLocaleString()}`}
            subtitle="This month"
            icon={TrendingUp}
            color="purple"
            loading={kpisLoading}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            title="Check-ins Today"
            value={kpis?.checkInsToday ?? 0}
            numericValue={kpis?.checkInsToday ?? 0}
            icon={ArrowDownToLine}
            color="cyan"
            loading={kpisLoading}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            title="Check-outs Today"
            value={kpis?.checkOutsToday ?? 0}
            numericValue={kpis?.checkOutsToday ?? 0}
            icon={ArrowUpFromLine}
            color="amber"
            loading={kpisLoading}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            title="Available Rooms"
            value={kpis?.availableRooms ?? 0}
            numericValue={kpis?.availableRooms ?? 0}
            subtitle="Ready for booking"
            icon={BedDouble}
            color="green"
            loading={kpisLoading}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            title="Outstanding Invoices"
            value={`$${(kpis?.outstandingInvoicesAmount ?? 0).toLocaleString()}`}
            numericValue={kpis?.outstandingInvoicesAmount ?? 0}
            formatter={(v) => `$${v.toLocaleString()}`}
            subtitle={`${kpis?.outstandingInvoicesCount ?? 0} invoices`}
            icon={Receipt}
            color="red"
            loading={kpisLoading}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            title="Low Stock Alerts"
            value={kpis?.lowStockAlerts ?? 0}
            numericValue={kpis?.lowStockAlerts ?? 0}
            icon={AlertTriangle}
            color="amber"
            loading={kpisLoading}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            title="Maintenance Pending"
            value={kpis?.pendingMaintenance ?? 0}
            numericValue={kpis?.pendingMaintenance ?? 0}
            icon={Wrench}
            color="red"
            loading={kpisLoading}
          />
        </StaggerItem>
        <StaggerItem>
          <KPICard
            title="Staff Present"
            value={kpis?.presentStaff ?? 0}
            numericValue={kpis?.presentStaff ?? 0}
            icon={UserCheck}
            color="green"
            loading={kpisLoading}
          />
        </StaggerItem>
      </StaggerGrid>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="py-3 px-5">
          <CardTitle className="text-sm">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'New Reservation', icon: Plus, href: '/reservations', color: 'text-primary bg-primary/10 hover:bg-primary/20' },
              { label: 'Check In Guest', icon: ArrowDownToLine, href: '/reservations', color: 'text-green-600 bg-green-500/10 hover:bg-green-500/20' },
              { label: 'New HK Task', icon: ClipboardList, href: '/housekeeping', color: 'text-amber-600 bg-amber-500/10 hover:bg-amber-500/20' },
              { label: 'New Work Order', icon: Wrench, href: '/maintenance', color: 'text-red-600 bg-red-500/10 hover:bg-red-500/20' },
            ].map(action => (
              <Link key={action.label} href={action.href}>
                <div className={cn('flex flex-col items-center gap-2 p-4 rounded-xl cursor-pointer transition-colors', action.color)}>
                  <action.icon className="w-6 h-6" />
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue Trend — Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} opacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: chartColors.muted }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: chartColors.muted }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()}`, 'Revenue']} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={chartColors.primary}
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="amount"
                  nameKey="category"
                >
                  {categoryData.map((_: any, index: number) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']} />
                <Legend iconSize={10} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Booking Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { source: 'Direct', count: 45 },
                  { source: 'OTA', count: 28 },
                  { source: 'Walk-in', count: 18 },
                  { source: 'Corporate', count: 12 },
                  { source: 'Online', count: 8 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.border} opacity={0.5} />
                <XAxis dataKey="source" tick={{ fontSize: 11, fill: chartColors.muted }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: chartColors.muted }} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill={chartColors.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(activity?.recentReservations || demoActivity).slice(0, 6).map((res: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {(res.guest?.firstName?.[0] || 'G')}{(res.guest?.lastName?.[0] || '')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {res.guest ? `${res.guest.firstName} ${res.guest.lastName}` : res.guestName}
                      </p>
                      <p className="text-xs text-muted-foreground">{res.reservationNo || `#RES-000${i + 1}`}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={res.status} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {res.checkIn ? new Date(res.checkIn).toLocaleDateString() : 'Today'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </FadeIn>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    CONFIRMED: { label: 'Confirmed', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    CHECKED_IN: { label: 'Checked In', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    CHECKED_OUT: { label: 'Checked Out', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    NO_SHOW: { label: 'No Show', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  };

  const v = variants[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', v.className)}>
      {v.label}
    </span>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

const demoActivity = [
  { guest: { firstName: 'James', lastName: 'Wilson' }, reservationNo: 'RES-0001', status: 'CHECKED_IN', checkIn: new Date() },
  { guest: { firstName: 'Sarah', lastName: 'Johnson' }, reservationNo: 'RES-0002', status: 'CONFIRMED', checkIn: new Date() },
  { guest: { firstName: 'Michael', lastName: 'Brown' }, reservationNo: 'RES-0003', status: 'PENDING', checkIn: new Date() },
  { guest: { firstName: 'Emily', lastName: 'Davis' }, reservationNo: 'RES-0004', status: 'CHECKED_OUT', checkIn: new Date() },
  { guest: { firstName: 'Robert', lastName: 'Miller' }, reservationNo: 'RES-0005', status: 'CONFIRMED', checkIn: new Date() },
  { guest: { firstName: 'Lisa', lastName: 'Garcia' }, reservationNo: 'RES-0006', status: 'CHECKED_IN', checkIn: new Date() },
];
