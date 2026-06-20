'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Users2, UserCheck, CalendarCheck, FileClock,
  Clock, AlertTriangle, ShieldAlert, FileText, Activity, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { hrApi } from '@/lib/api';
import { format } from 'date-fns';
import { Pagination } from '@/components/ui/pagination';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { EmployeeFormDialog } from './components/employee-form-dialog';
import { AttendanceDialog } from './components/attendance-dialog';
import { LeaveRequestDialog } from './components/leave-request-dialog';
import { PayrollDialog } from './components/payroll-dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:     'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400',
  INACTIVE:   'bg-muted text-muted-foreground border-border',
  ON_LEAVE:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400',
  TERMINATED: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400',
  SUSPENDED:  'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400',
  RESIGNED:   'bg-gray-100 text-gray-700 border-gray-200',
  PROBATION:  'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400',
};

const CASE_STATUS_COLORS: Record<string, string> = {
  REPORTED:          'bg-blue-100 text-blue-700',
  UNDER_REVIEW:      'bg-amber-100 text-amber-700',
  INVESTIGATING:     'bg-orange-100 text-orange-700',
  EMPLOYEE_NOTIFIED: 'bg-purple-100 text-purple-700',
  HEARING_SCHEDULED: 'bg-indigo-100 text-indigo-700',
  DECISION_PENDING:  'bg-yellow-100 text-yellow-700',
  APPROVED:          'bg-green-100 text-green-700',
  REJECTED:          'bg-red-100 text-red-700',
  APPEALED:          'bg-pink-100 text-pink-700',
  CLOSED:            'bg-gray-100 text-gray-600',
};

// ─── HR DASHBOARD ─────────────────────────────────────────────────────────────

function HRDashboard({ propertyId }: { propertyId: string }) {
  const { data: stats } = useQuery({
    queryKey: ['hr-dashboard', propertyId],
    queryFn: () => hrApi.dashboard(propertyId).then(r => r.data),
  });

  const kpis = [
    { label: 'Total Staff', value: stats?.totalEmployees ?? 0, icon: Users2, color: 'text-primary' },
    { label: 'Active', value: stats?.activeEmployees ?? 0, icon: UserCheck, color: 'text-green-600' },
    { label: 'On Leave Today', value: stats?.onLeave ?? 0, icon: CalendarCheck, color: 'text-amber-600' },
    { label: 'Suspended', value: stats?.suspended ?? 0, icon: ShieldAlert, color: 'text-orange-600' },
    { label: 'Pending Leave', value: stats?.pendingLeaves ?? 0, icon: Clock, color: 'text-blue-600' },
    { label: 'Pending Approvals', value: stats?.pendingApprovals ?? 0, icon: FileClock, color: 'text-purple-600' },
    { label: 'Active Disc. Cases', value: stats?.openDisciplinaryCases ?? 0, icon: AlertTriangle, color: 'text-red-600' },
    { label: 'Probation Due', value: stats?.probationDue ?? 0, icon: Activity, color: 'text-indigo-600' },
    { label: 'Contracts Expiring', value: stats?.contractsExpiring ?? 0, icon: FileText, color: 'text-pink-600' },
    { label: 'Open Anomalies', value: stats?.openAnomalies ?? 0, icon: AlertTriangle, color: 'text-yellow-600' },
  ];

  return (
    <div className="space-y-4 mt-4">
      <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <StaggerItem key={label}>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <p className={cn('text-2xl font-bold mt-1', color)}>
                      <AnimatedCounter value={value} />
                    </p>
                  </div>
                  <Icon className={cn('w-5 h-5 mt-0.5', color)} />
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGrid>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Quick Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Add Employee', href: '#', tab: 'employees' },
              { label: 'Run Payroll', href: '#', tab: 'payroll' },
              { label: 'Review Leave Requests', href: '#', tab: 'leave' },
              { label: 'Open Disciplinary Cases', href: '#', tab: 'disciplinary' },
              { label: 'Attendance Anomalies', href: '#', tab: 'anomalies' },
            ].map(({ label }) => (
              <div key={label} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 cursor-pointer group">
                <span className="text-sm">{label}</span>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {stats?.contractsExpiring > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{stats.contractsExpiring} contract(s) expiring within 60 days</span>
              </div>
            )}
            {stats?.probationDue > 0 && (
              <div className="flex items-center gap-2 text-blue-600">
                <Activity className="w-3.5 h-3.5" />
                <span>{stats.probationDue} probation review(s) due soon</span>
              </div>
            )}
            {stats?.openAnomalies > 0 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{stats.openAnomalies} unreviewed attendance anomalies</span>
              </div>
            )}
            {stats?.openDisciplinaryCases > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{stats.openDisciplinaryCases} active disciplinary case(s)</span>
              </div>
            )}
            {!stats?.contractsExpiring && !stats?.probationDue && !stats?.openAnomalies && !stats?.openDisciplinaryCases && (
              <p className="text-muted-foreground text-xs">No compliance alerts at this time.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pending Approvals</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {stats?.pendingLeaves > 0 && (
              <div className="flex items-center justify-between py-1">
                <span>Leave Requests</span>
                <Badge variant="outline" className="text-xs">{stats.pendingLeaves}</Badge>
              </div>
            )}
            {stats?.pendingApprovals > 0 && (
              <div className="flex items-center justify-between py-1">
                <span>HR Approvals</span>
                <Badge variant="outline" className="text-xs">{stats.pendingApprovals}</Badge>
              </div>
            )}
            {!stats?.pendingLeaves && !stats?.pendingApprovals && (
              <p className="text-xs mt-2">All approvals up to date.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── EMPLOYEES TAB ────────────────────────────────────────────────────────────

function EmployeesTab({ propertyId }: { propertyId: string }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [empDialogOpen, setEmpDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: depts } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: () => hrApi.departments().then(r => r.data),
  });
  const departments: any[] = Array.isArray(depts) ? depts : [];

  const { data, isLoading } = useQuery({
    queryKey: ['hr-employees', propertyId, debouncedSearch, statusFilter, departmentFilter, page],
    queryFn: () => hrApi.employees({
      propertyId,
      search: debouncedSearch || undefined,
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      departmentId: departmentFilter !== 'ALL' ? departmentFilter : undefined,
      page,
      limit: 20,
    }).then(r => r.data),
  });

  const employees: any[] = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search name or employee #..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['ALL','ACTIVE','ON_LEAVE','SUSPENDED','PROBATION','TERMINATED','RESIGNED'].map(s => (
              <SelectItem key={s} value={s}>{s === 'ALL' ? 'All Status' : s.replace('_', ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={v => { setDepartmentFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setEmpDialogOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Employee
        </Button>
        <EmployeeFormDialog
          open={empDialogOpen}
          onOpenChange={setEmpDialogOpen}
          propertyId={propertyId}
          departments={departments}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading employees…</div>
          ) : employees.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Users2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No employees found.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Position</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Start Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr key={emp.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{emp.employeeNumber}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.department?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{emp.position}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{emp.employmentType?.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {emp.startDate ? format(new Date(emp.startDate), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs border', STATUS_COLORS[emp.status] ?? 'bg-muted text-muted-foreground')}>
                        {emp.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/hr/employees/${emp.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs h-7">View Profile</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {total > 20 && (
        <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={(p) => setPage(p)} />
      )}
    </div>
  );
}

// ─── DISCIPLINARY TAB ─────────────────────────────────────────────────────────

function DisciplinaryTab({ propertyId }: { propertyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ employeeId: '', category: '', description: '', incidentDate: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['disciplinary', propertyId, statusFilter],
    queryFn: () => hrApi.disciplinaryCases({ propertyId, status: statusFilter || undefined }).then(r => r.data),
  });
  const cases: any[] = data?.data ?? [];

  const { data: empData } = useQuery({
    queryKey: ['hr-employees', propertyId, '', 'ACTIVE'],
    queryFn: () => hrApi.employees({ propertyId, status: 'ACTIVE', limit: 100 }).then(r => r.data),
  });
  const employees: any[] = empData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => hrApi.createDisciplinaryCase({ ...form, propertyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disciplinary'] });
      toast({ title: 'Disciplinary case created' });
      setCreateOpen(false);
      setForm({ employeeId: '', category: '', description: '', incidentDate: '' });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: any) => hrApi.updateDisciplinaryCase(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['disciplinary'] }); toast({ title: 'Case updated' }); },
  });

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            {['REPORTED','UNDER_REVIEW','INVESTIGATING','HEARING_SCHEDULED','DECISION_PENDING','CLOSED'].map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setCreateOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New Case
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
          ) : cases.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No disciplinary cases found.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Case #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {cases.map((c: any) => (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.caseNumber}</td>
                    <td className="px-4 py-3 font-medium">{c.employee?.firstName} {c.employee?.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.category?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {c.incidentDate ? format(new Date(c.incidentDate), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">{c.actions?.length ?? 0}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', CASE_STATUS_COLORS[c.status] ?? 'bg-muted text-muted-foreground')}>
                        {c.status?.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.status !== 'CLOSED' && (
                        <Button variant="ghost" size="sm" className="text-xs h-7"
                          onClick={() => updateMutation.mutate({ id: c.id, status: 'CLOSED' })}>
                          Close
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Disciplinary Case</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee…" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Incident Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category…" /></SelectTrigger>
                <SelectContent>
                  {['ABSENTEEISM','CHRONIC_LATENESS','MISCONDUCT','THEFT_FRAUD','GUEST_COMPLAINT','DAMAGE_TO_PROPERTY',
                    'CASH_HANDLING','VIOLATION_OF_SOP','HARASSMENT','INSUBORDINATION','NEGLIGENCE','SAFETY_BREACH',
                    'UNIFORM_VIOLATION','UNAUTHORIZED_ABSENCE'].map(c => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Incident Date *</Label>
              <Input type="date" value={form.incidentDate} onChange={e => setForm(f => ({ ...f, incidentDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!form.employeeId || !form.category || !form.description || !form.incidentDate || createMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => createMutation.mutate()}>
              Create Case
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── PAYROLL DEDUCTIONS TAB ───────────────────────────────────────────────────

function PayrollDeductionsTab({ propertyId }: { propertyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({
    employeeId: '', category: 'OTHER', description: '', amount: '',
    deductionType: 'FIXED', effectivePeriod: '', isRecurring: false,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-deductions', propertyId, statusFilter],
    queryFn: () => hrApi.payrollDeductions({ propertyId, status: statusFilter || undefined }).then(r => r.data),
  });
  const deductions: any[] = Array.isArray(data) ? data : (data?.data ?? []);

  const { data: empData } = useQuery({
    queryKey: ['hr-employees', propertyId, '', 'ACTIVE'],
    queryFn: () => hrApi.employees({ propertyId, status: 'ACTIVE', limit: 100 }).then(r => r.data),
  });
  const employees: any[] = empData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => hrApi.createDeduction({ ...form, amount: Number(form.amount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-deductions'] });
      toast({ title: 'Deduction created — pending approval' });
      setCreateOpen(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => hrApi.approveDeduction(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-deductions'] }); toast({ title: 'Deduction approved' }); },
  });

  const reverseMutation = useMutation({
    mutationFn: (id: string) => hrApi.reverseDeduction(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-deductions'] }); toast({ title: 'Deduction reversed' }); },
  });

  const DEDUCTION_STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-green-100 text-green-700',
    APPLIED: 'bg-blue-100 text-blue-700',
    REVERSED: 'bg-gray-100 text-gray-600',
    WAIVED: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            {['PENDING','APPROVED','APPLIED','REVERSED','WAIVED'].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setCreateOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New Deduction
        </Button>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
        All payroll deductions require approval before they are applied. No deduction hits payroll without an approved record and a linked reason.
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : deductions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No deductions found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {deductions.map((d: any) => (
                  <tr key={d.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{d.employee?.firstName} {d.employee?.lastName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.category?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{d.description}</td>
                    <td className="px-4 py-3 text-right font-mono">${Number(d.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{d.effectivePeriod}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', DEDUCTION_STATUS_COLORS[d.status] ?? 'bg-muted')}>
                        {d.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.status === 'PENDING' && (
                        <Button variant="outline" size="sm" className="text-xs h-7 mr-1"
                          onClick={() => approveMutation.mutate(d.id)}>Approve</Button>
                      )}
                      {d.status === 'APPROVED' && (
                        <Button variant="ghost" size="sm" className="text-xs h-7 text-red-600"
                          onClick={() => reverseMutation.mutate(d.id)}>Reverse</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Controlled Payroll Deduction</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee…" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['DAMAGE_RECOVERY','UNAUTHORIZED_ABSENCE','CASH_SHORTAGE','TILL_VARIANCE',
                      'SALARY_ADVANCE','LOAN_RECOVERY','ASSET_LOSS','UNIFORM_RECOVERY','DEVICE_RECOVERY','OTHER'].map(c => (
                      <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount ($) *</Label>
                <Input type="number" min="0" step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Effective Period *</Label>
                <Input type="month" value={form.effectivePeriod}
                  onChange={e => setForm(f => ({ ...f, effectivePeriod: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.deductionType} onValueChange={v => setForm(f => ({ ...f, deductionType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reason / Description *</Label>
              <Textarea rows={2} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.employeeId || !form.amount || !form.description || !form.effectivePeriod || createMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => createMutation.mutate()}>
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ATTENDANCE ANOMALIES TAB ─────────────────────────────────────────────────

function AnomaliesTab({ propertyId }: { propertyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('OPEN');

  const { data, isLoading } = useQuery({
    queryKey: ['anomalies', propertyId, statusFilter],
    queryFn: () => hrApi.anomalies({ propertyId, status: statusFilter || undefined }).then(r => r.data),
  });
  const anomalies: any[] = data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, status, reviewNotes }: any) => hrApi.updateAnomaly(id, { status, reviewNotes }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['anomalies'] }); toast({ title: 'Anomaly updated' }); },
  });

  const ANOMALY_COLORS: Record<string, string> = {
    LOW: 'bg-blue-100 text-blue-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    HIGH: 'bg-red-100 text-red-700',
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {['OPEN','REVIEWED','ESCALATED','DISMISSED','LINKED_TO_CASE'].map(s => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : anomalies.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No anomalies found for this filter.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Severity</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {anomalies.map((a: any) => (
                  <tr key={a.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{a.employee?.firstName} {a.employee?.lastName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{a.anomalyType?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {a.date ? format(new Date(a.date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', ANOMALY_COLORS[a.severity] ?? 'bg-muted')}>
                        {a.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{a.status?.replace(/_/g, ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.status === 'OPEN' && (
                        <div className="flex gap-1 justify-end">
                          <Button variant="outline" size="sm" className="text-xs h-7"
                            onClick={() => updateMutation.mutate({ id: a.id, status: 'REVIEWED' })}>Review</Button>
                          <Button variant="ghost" size="sm" className="text-xs h-7"
                            onClick={() => updateMutation.mutate({ id: a.id, status: 'DISMISSED' })}>Dismiss</Button>
                        </div>
                      )}
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

// ─── STAFF LOANS TAB ──────────────────────────────────────────────────────────

function LoansTab({ propertyId }: { propertyId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({ employeeId: '', loanType: 'SALARY_ADVANCE', amount: '', installments: '1', reason: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['staff-loans', propertyId, statusFilter],
    queryFn: () => hrApi.loans({ propertyId, status: statusFilter || undefined }).then(r => r.data),
  });
  const loans: any[] = Array.isArray(data) ? data : (data?.data ?? []);

  const { data: empData } = useQuery({
    queryKey: ['hr-employees', propertyId, '', 'ACTIVE'],
    queryFn: () => hrApi.employees({ propertyId, status: 'ACTIVE', limit: 100 }).then(r => r.data),
  });
  const employees: any[] = empData?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => hrApi.createLoan({ ...form, amount: Number(form.amount), installments: Number(form.installments), installmentAmount: Number(form.amount) / Number(form.installments) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-loans'] }); toast({ title: 'Loan request submitted' }); setCreateOpen(false); },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => hrApi.approveLoan(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff-loans'] }); toast({ title: 'Loan approved' }); },
  });

  const LOAN_STATUS_COLORS: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-green-100 text-green-700',
    ACTIVE: 'bg-blue-100 text-blue-700',
    SETTLED: 'bg-gray-100 text-gray-600',
    REJECTED: 'bg-red-100 text-red-700',
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            {['PENDING','APPROVED','ACTIVE','SETTLED','REJECTED'].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setCreateOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New Loan / Advance
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : loans.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No loans found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Loan #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Balance</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loans.map((l: any) => (
                  <tr key={l.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.loanNumber}</td>
                    <td className="px-4 py-3 font-medium">{l.employee?.firstName} {l.employee?.lastName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{l.loanType?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 text-right font-mono">${Number(l.amount).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono">${Number(l.balance).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', LOAN_STATUS_COLORS[l.status] ?? 'bg-muted')}>
                        {l.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {l.status === 'PENDING' && (
                        <Button variant="outline" size="sm" className="text-xs h-7"
                          onClick={() => approveMutation.mutate(l.id)}>Approve</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Staff Loan / Advance</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee…" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeNumber})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Loan Type *</Label>
                <Select value={form.loanType} onValueChange={v => setForm(f => ({ ...f, loanType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['SALARY_ADVANCE','STAFF_LOAN','EMERGENCY','UNIFORM','DEVICE'].map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Amount ($) *</Label>
                <Input type="number" min="0" step="0.01" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Installments</Label>
              <Input type="number" min="1" value={form.installments}
                onChange={e => setForm(f => ({ ...f, installments: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!form.employeeId || !form.amount || createMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => createMutation.mutate()}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function HrPage() {
  usePageTitle('Human Resources');
  const propertyId = useAuthStore((s) => s.propertyId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState('dashboard');

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center gap-3">
        <Users2 className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Human Resources</h1>
          <p className="text-muted-foreground text-sm">Workforce management, payroll, discipline, and compliance</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
          <TabsTrigger value="disciplinary">Disciplinary</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <HRDashboard propertyId={propertyId} />
        </TabsContent>

        <TabsContent value="employees">
          <EmployeesTab propertyId={propertyId} />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTabContent propertyId={propertyId} queryClient={queryClient} toast={toast} />
        </TabsContent>

        <TabsContent value="leave">
          <LeaveTabContent propertyId={propertyId} queryClient={queryClient} toast={toast} />
        </TabsContent>

        <TabsContent value="payroll">
          <PayrollTabContent propertyId={propertyId} queryClient={queryClient} toast={toast} />
        </TabsContent>

        <TabsContent value="deductions">
          <PayrollDeductionsTab propertyId={propertyId} />
        </TabsContent>

        <TabsContent value="disciplinary">
          <DisciplinaryTab propertyId={propertyId} />
        </TabsContent>

        <TabsContent value="loans">
          <LoansTab propertyId={propertyId} />
        </TabsContent>

        <TabsContent value="anomalies">
          <AnomaliesTab propertyId={propertyId} />
        </TabsContent>
      </Tabs>
    </FadeIn>
  );
}

// ─── LEGACY TAB CONTENT (preserved from existing page) ───────────────────────

function AttendanceTabContent({ propertyId, queryClient }: any) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceOpen, setAttendanceOpen] = useState(false);

  const { data: empData } = useQuery({
    queryKey: ['hr-employees', propertyId, '', 'ACTIVE', 'all'],
    queryFn: () => hrApi.employees({ propertyId, status: 'ACTIVE', limit: 200 }).then(r => r.data),
  });
  const employees: any[] = empData?.data ?? [];

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance-report', propertyId, startDate, endDate],
    queryFn: () => hrApi.attendanceReport({ propertyId, startDate, endDate }).then(r => r.data),
    enabled: !!startDate && !!endDate,
  });
  const records: any[] = Array.isArray(attendanceData) ? attendanceData : [];

  const ATTENDANCE_STATUS_COLORS: Record<string, string> = {
    PRESENT: 'bg-green-100 text-green-700',
    ABSENT: 'bg-red-100 text-red-700',
    LATE: 'bg-amber-100 text-amber-700',
    HALF_DAY: 'bg-orange-100 text-orange-700',
    ON_LEAVE: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-xs">From</Label>
          <Input type="date" className="h-8 w-36 text-xs" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">To</Label>
          <Input type="date" className="h-8 w-36 text-xs" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="flex-1" />
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setAttendanceOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Log Attendance
        </Button>
        <AttendanceDialog
          open={attendanceOpen}
          onOpenChange={(open) => { setAttendanceOpen(open); if (!open) queryClient.invalidateQueries({ queryKey: ['attendance-report'] }); }}
          employees={employees}
        />
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No attendance records for this range.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clock In</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clock Out</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hours</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.employee?.firstName} {r.employee?.lastName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.date ? format(new Date(r.date), 'MMM d, yyyy') : '—'}</td>
                    <td className="px-4 py-3 text-xs">{r.clockIn ? format(new Date(r.clockIn), 'HH:mm') : '—'}</td>
                    <td className="px-4 py-3 text-xs">{r.clockOut ? format(new Date(r.clockOut), 'HH:mm') : '—'}</td>
                    <td className="px-4 py-3 text-xs">{r.hoursWorked ? `${r.hoursWorked}h` : '—'}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', ATTENDANCE_STATUS_COLORS[r.status] ?? 'bg-muted')}>
                        {r.status}
                      </Badge>
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

function LeaveTabContent({ propertyId, queryClient, toast }: any) {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [leaveOpen, setLeaveOpen] = useState(false);

  const { data: empData } = useQuery({
    queryKey: ['hr-employees', propertyId, '', 'ACTIVE', 'leave-tab'],
    queryFn: () => hrApi.employees({ propertyId, status: 'ACTIVE', limit: 200 }).then(r => r.data),
  });
  const employees: any[] = empData?.data ?? [];

  const { data } = useQuery({
    queryKey: ['leave-requests', propertyId, statusFilter],
    queryFn: () => hrApi.listLeaveRequests({ propertyId, status: statusFilter !== 'ALL' ? statusFilter : undefined }).then(r => r.data),
  });
  const requests: any[] = data?.data ?? [];

  const approveMutation = useMutation({
    mutationFn: (id: string) => hrApi.approveLeave(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leave-requests'] }); toast({ title: 'Leave approved' }); },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => hrApi.rejectLeave(id, 'Rejected by manager'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['leave-requests'] }); toast({ title: 'Leave rejected' }); },
  });

  const LEAVE_STATUS: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['ALL','PENDING','APPROVED','REJECTED'].map(s => (
              <SelectItem key={s} value={s}>{s === 'ALL' ? 'All Status' : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setLeaveOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> New Request
        </Button>
        <LeaveRequestDialog
          open={leaveOpen}
          onOpenChange={(open) => { setLeaveOpen(open); if (!open) queryClient.invalidateQueries({ queryKey: ['leave-requests'] }); }}
          employees={employees}
        />
      </div>
      <Card>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No leave requests found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Days</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {requests.map((r: any) => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.employee?.firstName} {r.employee?.lastName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.leaveType}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.startDate ? format(new Date(r.startDate), 'MMM d') : '—'} – {r.endDate ? format(new Date(r.endDate), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">{r.totalDays}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', LEAVE_STATUS[r.status] ?? 'bg-muted')}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'PENDING' && (
                        <div className="flex gap-1 justify-end">
                          <Button variant="outline" size="sm" className="text-xs h-7 text-green-600 border-green-200"
                            onClick={() => approveMutation.mutate(r.id)}>Approve</Button>
                          <Button variant="ghost" size="sm" className="text-xs h-7 text-red-600"
                            onClick={() => rejectMutation.mutate(r.id)}>Reject</Button>
                        </div>
                      )}
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

function PayrollTabContent({ propertyId, queryClient, toast }: any) {
  const [page, setPage] = useState(1);
  const [payrollOpen, setPayrollOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-history', propertyId, page],
    queryFn: () => hrApi.payrollHistory({ propertyId, page, limit: 20 }).then(r => r.data),
  });
  const records: any[] = data?.data ?? [];
  const total = data?.total ?? 0;

  const approveMutation = useMutation({
    mutationFn: (id: string) => hrApi.approvePayroll(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-history'] }); toast({ title: 'Payroll record approved' }); },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => hrApi.markPayrollPaid(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['payroll-history'] }); toast({ title: 'Marked as paid' }); },
  });

  const PAYROLL_STATUS: Record<string, string> = {
    DRAFT: 'bg-muted text-muted-foreground',
    APPROVED: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setPayrollOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Run Payroll
        </Button>
        <PayrollDialog
          open={payrollOpen}
          onOpenChange={(open) => { setPayrollOpen(open); if (!open) queryClient.invalidateQueries({ queryKey: ['payroll-history'] }); }}
          propertyId={propertyId}
        />
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No payroll records. Run payroll to generate.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Allowances</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deductions</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Pay</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map((r: any) => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.employee?.firstName} {r.employee?.lastName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.periodStart ? format(new Date(r.periodStart), 'MMM d') : '—'} – {r.periodEnd ? format(new Date(r.periodEnd), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">${Number(r.baseSalary).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-green-600">+${Number(r.allowances).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-red-600">-${(Number(r.deductions) + Number(r.tax)).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">${Number(r.netPay).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', PAYROLL_STATUS[r.status] ?? 'bg-muted')}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'DRAFT' && (
                        <Button variant="outline" size="sm" className="text-xs h-7"
                          onClick={() => approveMutation.mutate(r.id)}>Approve</Button>
                      )}
                      {r.status === 'APPROVED' && (
                        <Button variant="outline" size="sm" className="text-xs h-7 text-green-600 border-green-200"
                          onClick={() => markPaidMutation.mutate(r.id)}>Mark Paid</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      {total > 20 && <Pagination page={page} totalPages={Math.ceil(total / 20)} onPageChange={(p) => setPage(p)} />}
    </div>
  );
}
