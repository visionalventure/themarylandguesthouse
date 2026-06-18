'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Search, Users2, UserCheck, UserMinus, Building2, CalendarCheck, FileClock, Wallet,
  CheckCircle, XCircle, Clock, ArrowUpDown, ChevronUp, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { hrApi } from '@/lib/api';
import { format } from 'date-fns';
import { Pagination } from '@/components/ui/pagination';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { EmployeeFormDialog } from './components/employee-form-dialog';
import { AttendanceDialog } from './components/attendance-dialog';
import { LeaveRequestDialog } from './components/leave-request-dialog';
import { PayrollDialog } from './components/payroll-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';

import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';

const statusConfig: Record<string, string> = {
  ACTIVE:     'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
  INACTIVE:   'bg-muted text-muted-foreground border-border',
  ON_LEAVE:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  TERMINATED: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  SUSPENDED:  'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
};

const demoEmployees = [
  { id: '1', employeeNumber: 'EMP-0001', firstName: 'Samuel', lastName: 'Koroma', position: 'Manager', status: 'ACTIVE', employmentType: 'FULL_TIME', startDate: '2024-01-10', department: { name: 'Management' } },
  { id: '2', employeeNumber: 'EMP-0002', firstName: 'Mary', lastName: 'Johnson', position: 'Front Desk', status: 'ACTIVE', employmentType: 'FULL_TIME', startDate: '2024-03-01', department: { name: 'Front Office' } },
];

export default function HrPage() {
  usePageTitle('Human Resources');
  const propertyId = useAuthStore((s) => s.propertyId);
  const [tab, setTab] = useState('employees');
  const [search, setSearch] = useState('');
  const [empPage, setEmpPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('lastName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: string) => {
    if (sortBy === col) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortOrder('asc'); }
  };

  const EmpSortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-40" />;
    return sortOrder === 'asc'
      ? <ChevronUp className="inline w-3 h-3 ml-1 text-primary" />
      : <ChevronDown className="inline w-3 h-3 ml-1 text-primary" />;
  };
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [payrollDialogOpen, setPayrollDialogOpen] = useState(false);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: departments } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: () => hrApi.departments().then((r) => r.data),
    placeholderData: [],
  });

  const employeeParams: any = { propertyId: propertyId, limit: 20, page: empPage, sortBy, sortOrder };
  if (debouncedSearch) employeeParams.search = debouncedSearch;
  if (statusFilter !== 'ALL') employeeParams.status = statusFilter;
  if (departmentFilter !== 'ALL') employeeParams.departmentId = departmentFilter;

  const { data: employeesData } = useQuery({
    queryKey: ['hr-employees', employeeParams],
    queryFn: () => hrApi.employees(employeeParams).then((r) => r.data),
    placeholderData: { data: demoEmployees, total: demoEmployees.length },
  });

  const employees = employeesData?.data || demoEmployees;
  const empTotalPages = Math.ceil((employeesData?.total ?? 0) / 20);

  const queryClient = useQueryClient();
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('ALL');

  const { data: leaveData, refetch: refetchLeave } = useQuery({
    queryKey: ['hr-leave-requests', { propertyId: propertyId, status: leaveStatusFilter }],
    queryFn: () => hrApi.listLeaveRequests({
      propertyId: propertyId,
      ...(leaveStatusFilter !== 'ALL' ? { status: leaveStatusFilter } : {}),
    }).then((r) => r.data),
    placeholderData: { data: [], total: 0 },
    enabled: tab === 'leave',
  });

  const { data: payrollData } = useQuery({
    queryKey: ['hr-payroll', { propertyId: propertyId }],
    queryFn: () => hrApi.payrollHistory({ propertyId: propertyId }).then((r) => r.data),
    placeholderData: { data: [], total: 0 },
    enabled: tab === 'payroll',
  });

  const handleApproveLeave = async (id: string) => {
    await hrApi.approveLeave(id);
    refetchLeave();
  };

  const handleRejectLeave = async (id: string) => {
    await hrApi.rejectLeave(id, 'Rejected by manager');
    refetchLeave();
  };

  const { data: attendanceReport } = useQuery({
    queryKey: ['hr-attendance-report', { propertyId: propertyId, startDate, endDate }],
    queryFn: () => hrApi.attendanceReport({ propertyId: propertyId, startDate, endDate }).then((r) => r.data),
    placeholderData: [],
    enabled: tab === 'attendance',
  });

  const stats = {
    total: employeesData?.total ?? employees.length,
    active: employees.filter((e: any) => e.status === 'ACTIVE').length,
    onLeave: employees.filter((e: any) => e.status === 'ON_LEAVE').length,
    departments: departments?.length ?? 0,
  };

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Human Resources</h1>
          <p className="text-muted-foreground text-sm">Manage staff, attendance, leave and payroll</p>
        </div>
      </div>

      {/* Stats */}
      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: stats.total, icon: Users2, color: 'text-primary' },
          { label: 'Active', value: stats.active, icon: UserCheck, color: 'text-green-600' },
          { label: 'On Leave', value: stats.onLeave, icon: UserMinus, color: 'text-amber-600' },
          { label: 'Departments', value: stats.departments, icon: Building2, color: 'text-primary' },
        ].map((s) => (
          <StaggerItem key={s.label}>
            <Card>
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color}`} />
                <div>
                  <AnimatedCounter value={s.value} className="text-2xl font-bold block" />
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGrid>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave Requests</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        {/* Employees tab */}
        <TabsContent value="employees" className="mt-4 space-y-4">
          <div className="flex items-center justify-end">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setEmployeeDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or employee #..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Departments</SelectItem>
                    {(departments || []).map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Status</SelectItem>
                    {Object.keys(statusConfig).map((s) => (
                      <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employees ({employees.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee #</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('lastName')}>Name <EmpSortIcon col="lastName" /></th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('department')}>Department <EmpSortIcon col="department" /></th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Position</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('startDate')}>Start Date <EmpSortIcon col="startDate" /></th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp: any) => (
                      <tr key={emp.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{emp.employeeNumber}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{emp.firstName} {emp.lastName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{emp.department?.name || '—'}</td>
                        <td className="px-4 py-3">{emp.position}</td>
                        <td className="px-4 py-3 text-muted-foreground">{emp.employmentType?.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {emp.startDate ? format(new Date(emp.startDate), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${statusConfig[emp.status]}`}>
                            {emp.status?.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          {empTotalPages > 1 && (
            <Pagination page={empPage} totalPages={empTotalPages} onPageChange={setEmpPage} />
          )}
        </TabsContent>

        {/* Attendance tab */}
        <TabsContent value="attendance" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
              <span className="text-muted-foreground text-sm">to</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setAttendanceDialogOpen(true)}>
              <CalendarCheck className="w-4 h-4 mr-2" />
              Record Attendance
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance Report</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clock In</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clock Out</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(attendanceReport || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          No attendance records for this date range.
                        </td>
                      </tr>
                    ) : (
                      (attendanceReport || []).map((rec: any) => (
                        <tr key={rec.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            {rec.employee?.firstName} {rec.employee?.lastName}
                          </td>
                          <td className="px-4 py-3">{format(new Date(rec.date), 'MMM d, yyyy')}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {rec.clockIn ? format(new Date(rec.clockIn), 'HH:mm') : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {rec.clockOut ? format(new Date(rec.clockOut), 'HH:mm') : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{rec.status}</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leave tab */}
        <TabsContent value="leave" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Select value={leaveStatusFilter} onValueChange={setLeaveStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setLeaveDialogOpen(true)}>
              <FileClock className="w-4 h-4 mr-2" />
              New Leave Request
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave Requests ({leaveData?.total ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(leaveData?.data ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                          <FileClock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No leave requests found.
                        </td>
                      </tr>
                    ) : (
                      (leaveData?.data ?? []).map((lr: any) => (
                        <tr key={lr.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            {lr.employee?.firstName} {lr.employee?.lastName}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{lr.leaveType?.replace('_', ' ')}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {lr.startDate ? format(new Date(lr.startDate), 'MMM d') : '—'} — {lr.endDate ? format(new Date(lr.endDate), 'MMM d, yyyy') : '—'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">{lr.reason || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                              lr.status === 'APPROVED' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' :
                              lr.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' :
                              'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                            }`}>
                              {lr.status === 'APPROVED' ? <CheckCircle className="w-3 h-3" /> :
                               lr.status === 'REJECTED' ? <XCircle className="w-3 h-3" /> :
                               <Clock className="w-3 h-3" />}
                              {lr.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {lr.status === 'PENDING' && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-200" onClick={() => handleApproveLeave(lr.id)}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30" onClick={() => handleRejectLeave(lr.id)}>
                                  Reject
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payroll tab */}
        <TabsContent value="payroll" className="mt-4 space-y-4">
          <div className="flex items-center justify-end">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setPayrollDialogOpen(true)}>
              <Wallet className="w-4 h-4 mr-2" />
              Run Payroll
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payroll History ({payrollData?.total ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Base Salary</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Deductions</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Net Pay</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payrollData?.data ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                          <Wallet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No payroll records yet. Run payroll to generate records.
                        </td>
                      </tr>
                    ) : (
                      (payrollData?.data ?? []).map((pr: any) => (
                        <tr key={pr.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            {pr.employee?.firstName} {pr.employee?.lastName}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {pr.periodStart ? format(new Date(pr.periodStart), 'MMM d') : '—'} — {pr.periodEnd ? format(new Date(pr.periodEnd), 'MMM d, yyyy') : '—'}
                          </td>
                          <td className="px-4 py-3">{Number(pr.baseSalary ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-muted-foreground">{Number(pr.deductions ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3 font-semibold">{Number(pr.netPay ?? 0).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <Badge variant={pr.status === 'PAID' ? 'default' : 'secondary'}>{pr.status}</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EmployeeFormDialog
        open={employeeDialogOpen}
        onOpenChange={setEmployeeDialogOpen}
        propertyId={propertyId}
        departments={departments || []}
      />
      <AttendanceDialog
        open={attendanceDialogOpen}
        onOpenChange={setAttendanceDialogOpen}
        employees={employees}
      />
      <LeaveRequestDialog
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        employees={employees}
      />
      <PayrollDialog
        open={payrollDialogOpen}
        onOpenChange={setPayrollDialogOpen}
        propertyId={propertyId}
      />
    </FadeIn>
  );
}
