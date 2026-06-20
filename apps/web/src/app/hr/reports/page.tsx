'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { TrendingUp, Wallet, Users2, AlertTriangle, Download, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { hrApi } from '@/lib/api';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/ui/fade-in';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';

export default function HRReportsPage() {
  usePageTitle('HR Reports');
  const propertyId = useAuthStore((s) => s.propertyId);
  const [period, setPeriod] = useState(() => format(new Date(), 'yyyy-MM'));
  const [reportType, setReportType] = useState('workforce');

  const periodStart = format(startOfMonth(new Date(period + '-01')), 'yyyy-MM-dd');
  const periodEnd   = format(endOfMonth(new Date(period + '-01')), 'yyyy-MM-dd');

  const { data: hrReports, isLoading } = useQuery({
    queryKey: ['hr-reports', propertyId, period, reportType],
    queryFn: () => hrApi.reports({ propertyId, periodStart, periodEnd, type: reportType }).then(r => r.data),
  });

  const { data: costData } = useQuery({
    queryKey: ['hr-cost-dashboard', propertyId, period],
    queryFn: () => hrApi.workforceCostDashboard({ propertyId, periodStart, periodEnd }).then(r => r.data),
  });

  const reports = hrReports ?? {};
  const cost = costData ?? {};

  const REPORT_TYPES = [
    { value: 'workforce', label: 'Workforce Summary' },
    { value: 'attendance', label: 'Attendance Report' },
    { value: 'leave', label: 'Leave Utilization' },
    { value: 'payroll', label: 'Payroll Summary' },
    { value: 'disciplinary', label: 'Disciplinary Summary' },
    { value: 'turnover', label: 'Staff Turnover' },
  ];

  const last12Months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
  });

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">HR Reports & Workforce Cost</h1>
          <p className="text-muted-foreground text-sm">Analytics, compliance summaries, and workforce cost dashboard</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {last12Months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-52 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {REPORT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="text-xs gap-1.5">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      {/* Workforce Cost Dashboard — always shown */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Workforce Cost Dashboard</h3>
        <StaggerGrid cols={4}>
          {[
            { label: 'Total Payroll', value: cost.totalPayroll ?? 0, prefix: '$', color: 'text-primary' },
            { label: 'Total Allowances', value: cost.totalAllowances ?? 0, prefix: '$', color: 'text-green-600' },
            { label: 'Total Deductions', value: cost.totalDeductions ?? 0, prefix: '$', color: 'text-red-600' },
            { label: 'Net Payout', value: cost.netPayout ?? 0, prefix: '$', color: 'text-foreground' },
            { label: 'Total Loan Balance', value: cost.totalLoanBalance ?? 0, prefix: '$', color: 'text-amber-600' },
            { label: 'Disciplinary Recovery', value: cost.disciplinaryRecovery ?? 0, prefix: '$', color: 'text-orange-600' },
            { label: 'Staff on Payroll', value: cost.staffOnPayroll ?? 0, prefix: '', color: 'text-foreground' },
            { label: 'Headcount', value: cost.headcount ?? 0, prefix: '', color: 'text-foreground' },
          ].map(({ label, value, prefix, color }) => (
            <StaggerItem key={label}>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={cn('text-xl font-bold mt-1', color)}>
                    {prefix}<AnimatedCounter value={value} decimals={prefix === '$' ? 2 : 0} />
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerGrid>
      </div>

      {/* Report Content */}
      {isLoading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Loading report…</div>
      ) : (
        <div className="space-y-4">
          {reportType === 'workforce' && <WorkforceSummary data={reports} />}
          {reportType === 'attendance' && <AttendanceSummary data={reports} />}
          {reportType === 'leave' && <LeaveSummary data={reports} />}
          {reportType === 'payroll' && <PayrollSummary data={reports} />}
          {reportType === 'disciplinary' && <DisciplinarySummary data={reports} />}
          {reportType === 'turnover' && <TurnoverSummary data={reports} />}
        </div>
      )}
    </FadeIn>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function WorkforceSummary({ data }: { data: any }) {
  const statuses = data.byStatus ?? {};
  const depts = data.byDepartment ?? [];
  const types = data.byType ?? {};

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <SectionCard title="By Status" icon={Users2}>
        <div className="space-y-2 text-sm">
          {Object.entries(statuses).map(([status, count]: [string, any]) => (
            <div key={status} className="flex items-center justify-between">
              <span className="text-muted-foreground">{status.replace('_', ' ')}</span>
              <Badge variant="outline" className="text-xs">{count}</Badge>
            </div>
          ))}
          {Object.keys(statuses).length === 0 && <p className="text-muted-foreground text-xs">No data available.</p>}
        </div>
      </SectionCard>
      <SectionCard title="By Employment Type" icon={Users2}>
        <div className="space-y-2 text-sm">
          {Object.entries(types).map(([type, count]: [string, any]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-muted-foreground">{type.replace('_', ' ')}</span>
              <Badge variant="outline" className="text-xs">{count}</Badge>
            </div>
          ))}
          {Object.keys(types).length === 0 && <p className="text-muted-foreground text-xs">No data available.</p>}
        </div>
      </SectionCard>
      {depts.length > 0 && (
        <div className="md:col-span-2">
          <SectionCard title="Headcount by Department" icon={Users2}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              {depts.map((d: any) => (
                <div key={d.departmentId} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                  <span className="text-muted-foreground text-xs">{d.departmentName}</span>
                  <span className="font-bold">{d.count}</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}

function AttendanceSummary({ data }: { data: any }) {
  const rows: any[] = data.rows ?? [];
  return (
    <Card>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No attendance data for this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Days Present</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Days Absent</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Late</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Avg Hours</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.employeeId} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                  <td className="px-4 py-3 text-right">{r.daysPresent}</td>
                  <td className="px-4 py-3 text-right text-red-600">{r.daysAbsent}</td>
                  <td className="px-4 py-3 text-right text-amber-600">{r.lateCount}</td>
                  <td className="px-4 py-3 text-right">{r.avgHours?.toFixed(1)}h</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn('font-medium', r.attendanceRate >= 90 ? 'text-green-600' : r.attendanceRate >= 75 ? 'text-amber-600' : 'text-red-600')}>
                      {r.attendanceRate?.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function LeaveSummary({ data }: { data: any }) {
  const rows: any[] = data.rows ?? [];
  return (
    <Card>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No leave data for this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Leave Type</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Days Taken</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, i: number) => (
                <tr key={i} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.leaveType}</td>
                  <td className="px-4 py-3 text-right">{r.daysTaken}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function PayrollSummary({ data }: { data: any }) {
  const rows: any[] = data.rows ?? [];
  return (
    <Card>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No payroll data for this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Allowances</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deductions</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tax</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Pay</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.employeeId} className="border-b border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">${Number(r.base).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-green-600">+${Number(r.allowances).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-red-600">-${Number(r.deductions).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-red-600">-${Number(r.tax).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">${Number(r.netPay).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function DisciplinarySummary({ data }: { data: any }) {
  const rows: any[] = data.rows ?? [];
  const byCategory = data.byCategory ?? {};
  return (
    <div className="space-y-4">
      <SectionCard title="Cases by Category" icon={AlertTriangle}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {Object.entries(byCategory).map(([cat, count]: [string, any]) => (
            <div key={cat} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2 text-sm">
              <span className="text-muted-foreground text-xs">{cat.replace(/_/g, ' ')}</span>
              <span className="font-bold text-orange-600">{count}</span>
            </div>
          ))}
          {Object.keys(byCategory).length === 0 && <p className="text-muted-foreground text-xs col-span-3">No disciplinary cases this period.</p>}
        </div>
      </SectionCard>
      {rows.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Case #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.caseNumber}</td>
                    <td className="px-4 py-3 font-medium">{r.employeeName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.category?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{r.status?.replace(/_/g, ' ')}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TurnoverSummary({ data }: { data: any }) {
  const exits: any[] = data.exits ?? [];
  const newHires: any[] = data.newHires ?? [];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Exits This Period ({exits.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {exits.length === 0 ? (
            <div className="px-4 pb-4 text-muted-foreground text-xs">No exits recorded.</div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {exits.map((e: any) => (
                  <tr key={e.id} className="border-b border-border px-4">
                    <td className="px-4 py-2 font-medium">{e.employeeName}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{e.separationType?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {e.exitDate ? format(new Date(e.exitDate), 'MMM d') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">New Hires This Period ({newHires.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {newHires.length === 0 ? (
            <div className="px-4 pb-4 text-muted-foreground text-xs">No new hires recorded.</div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {newHires.map((h: any) => (
                  <tr key={h.id} className="border-b border-border">
                    <td className="px-4 py-2 font-medium">{h.firstName} {h.lastName}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{h.position}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {h.startDate ? format(new Date(h.startDate), 'MMM d') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
