'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft, User, Briefcase, CalendarCheck, Wallet, ShieldAlert, TrendingUp,
  BookOpen, Package, FileText, Edit2, Plus, AlertTriangle, Check, X, Clock,
  Phone, Mail, MapPin, Building2, CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { hrApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/ui/fade-in';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:     'bg-green-100 text-green-700 border-green-200',
  INACTIVE:   'bg-muted text-muted-foreground border-border',
  ON_LEAVE:   'bg-amber-100 text-amber-700 border-amber-200',
  TERMINATED: 'bg-red-100 text-red-700 border-red-200',
  SUSPENDED:  'bg-orange-100 text-orange-700 border-orange-200',
  RESIGNED:   'bg-gray-100 text-gray-700 border-gray-200',
  PROBATION:  'bg-blue-100 text-blue-700 border-blue-200',
};

function EditEmployeeDialog({ employee, onSuccess }: { employee: any; onSuccess: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const { data: depts } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: () => hrApi.departments().then(r => r.data),
  });
  const departments: any[] = Array.isArray(depts) ? depts : [];

  const [form, setForm] = useState({
    firstName: employee.firstName ?? '',
    lastName: employee.lastName ?? '',
    preferredName: employee.preferredName ?? '',
    email: employee.email ?? '',
    phone: employee.phone ?? '',
    position: employee.position ?? '',
    employmentType: employee.employmentType ?? 'FULL_TIME',
    departmentId: employee.departmentId ?? '',
    status: employee.status ?? 'ACTIVE',
    baseSalary: String(employee.baseSalary ?? ''),
    nationality: employee.nationality ?? '',
    nationalId: employee.nationalId ?? '',
    taxId: employee.taxId ?? '',
    address: employee.address ?? '',
    emergencyContact: employee.emergencyContact ?? '',
    emergencyPhone: employee.emergencyPhone ?? '',
    nextOfKin: employee.nextOfKin ?? '',
    nextOfKinPhone: employee.nextOfKinPhone ?? '',
    bankName: employee.bankName ?? '',
    bankAccount: employee.bankAccount ?? '',
    mobileMoney: employee.mobileMoney ?? '',
    notes: employee.notes ?? '',
  });

  const mutation = useMutation({
    mutationFn: () => hrApi.updateEmployee(employee.id, { ...form, baseSalary: Number(form.baseSalary) }),
    onSuccess: () => { toast({ title: 'Employee updated' }); setOpen(false); onSuccess(); },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const f = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Edit2 className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Employee Profile</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input value={form.firstName} onChange={e => f('firstName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input value={form.lastName} onChange={e => f('lastName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Preferred Name</Label>
                <Input value={form.preferredName} onChange={e => f('preferredName', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => f('email', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => f('phone', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Position *</Label>
                <Input value={form.position} onChange={e => f('position', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.departmentId} onValueChange={v => f('departmentId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Employment Type</Label>
                <Select value={form.employmentType} onValueChange={v => f('employmentType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['FULL_TIME','PART_TIME','CONTRACT','CASUAL','TEMPORARY','INTERN','CONSULTANT'].map(t => (
                      <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => f('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['ACTIVE','INACTIVE','ON_LEAVE','SUSPENDED','PROBATION','RESIGNED','TERMINATED'].map(s => (
                      <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Base Salary ($)</Label>
                <Input type="number" value={form.baseSalary} onChange={e => f('baseSalary', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Nationality</Label>
                <Input value={form.nationality} onChange={e => f('nationality', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>National ID</Label>
                <Input value={form.nationalId} onChange={e => f('nationalId', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tax ID</Label>
                <Input value={form.taxId} onChange={e => f('taxId', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => f('address', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Emergency Contact</Label>
                <Input value={form.emergencyContact} onChange={e => f('emergencyContact', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Emergency Phone</Label>
                <Input value={form.emergencyPhone} onChange={e => f('emergencyPhone', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Next of Kin</Label>
                <Input value={form.nextOfKin} onChange={e => f('nextOfKin', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Next of Kin Phone</Label>
                <Input value={form.nextOfKinPhone} onChange={e => f('nextOfKinPhone', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Bank Name</Label>
                <Input value={form.bankName} onChange={e => f('bankName', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Bank Account</Label>
                <Input value={form.bankAccount} onChange={e => f('bankAccount', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Mobile Money</Label>
                <Input value={form.mobileMoney} onChange={e => f('mobileMoney', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes} onChange={e => f('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => mutation.mutate()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function EmployeeProfilePage() {
  usePageTitle('Employee Profile');
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const propertyId = useAuthStore((s) => s.propertyId);
  const [activeTab, setActiveTab] = useState('overview');

  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => hrApi.getEmployee(id).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="py-20 text-center text-muted-foreground text-sm">Loading employee profile…</div>;
  }

  if (!employee) {
    return <div className="py-20 text-center text-muted-foreground text-sm">Employee not found.</div>;
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['employee', id] });

  return (
    <FadeIn className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
              {employee.firstName?.[0]}{employee.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {employee.firstName} {employee.lastName}
                {employee.preferredName && <span className="text-muted-foreground font-normal text-base ml-2">"{employee.preferredName}"</span>}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm text-muted-foreground">{employee.position}</span>
                {employee.department && <span className="text-muted-foreground text-sm">· {employee.department.name}</span>}
                <span className="font-mono text-xs text-muted-foreground">{employee.employeeNumber}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={cn('text-xs border', STATUS_COLORS[employee.status] ?? 'bg-muted')}>
            {employee.status?.replace('_', ' ')}
          </Badge>
          <EditEmployeeDialog employee={employee} onSuccess={refresh} />
        </div>
      </div>

      {/* Quick info strip */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t border-b border-border py-3">
        {employee.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{employee.email}</span>}
        {employee.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{employee.phone}</span>}
        {employee.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{employee.address}</span>}
        <span className="flex items-center gap-1"><CalendarCheck className="w-3 h-3" />Joined {employee.startDate ? format(new Date(employee.startDate), 'MMM d, yyyy') : '—'}</span>
        <span className="flex items-center gap-1"><Wallet className="w-3 h-3" />Base: ${Number(employee.baseSalary).toLocaleString()}/mo</span>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview"><User className="w-3.5 h-3.5 mr-1.5" />Overview</TabsTrigger>
          <TabsTrigger value="attendance"><CalendarCheck className="w-3.5 h-3.5 mr-1.5" />Attendance</TabsTrigger>
          <TabsTrigger value="leave"><Clock className="w-3.5 h-3.5 mr-1.5" />Leave</TabsTrigger>
          <TabsTrigger value="payroll"><Wallet className="w-3.5 h-3.5 mr-1.5" />Payroll</TabsTrigger>
          <TabsTrigger value="discipline"><ShieldAlert className="w-3.5 h-3.5 mr-1.5" />Discipline</TabsTrigger>
          <TabsTrigger value="performance"><TrendingUp className="w-3.5 h-3.5 mr-1.5" />Performance</TabsTrigger>
          <TabsTrigger value="assets"><Package className="w-3.5 h-3.5 mr-1.5" />Assets</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="w-3.5 h-3.5 mr-1.5" />Documents</TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW ─────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Briefcase className="w-4 h-4" />Employment Details</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                {[
                  ['Type', employee.employmentType?.replace('_', ' ')],
                  ['Nationality', employee.nationality],
                  ['National ID', employee.nationalId],
                  ['Tax ID', employee.taxId],
                  ['Contract End', employee.contractEndDate ? format(new Date(employee.contractEndDate), 'MMM d, yyyy') : '—'],
                  ['Probation End', employee.probationEndDate ? format(new Date(employee.probationEndDate), 'MMM d, yyyy') : '—'],
                  ['Supervisor', employee.supervisor ? `${employee.supervisor.firstName} ${employee.supervisor.lastName}` : '—'],
                ].map(([k, v]) => v ? (
                  <div key={k as string} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ) : null)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" />Payment & Emergency</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                {[
                  ['Bank', employee.bankName],
                  ['Account', employee.bankAccount],
                  ['Mobile Money', employee.mobileMoney],
                  ['Emergency Contact', employee.emergencyContact],
                  ['Emergency Phone', employee.emergencyPhone],
                  ['Next of Kin', employee.nextOfKin],
                  ['NOK Phone', employee.nextOfKinPhone],
                ].map(([k, v]) => v ? (
                  <div key={k as string} className="flex justify-between">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-medium">{v}</span>
                  </div>
                ) : null)}
              </CardContent>
            </Card>
          </div>

          {/* Onboarding Checklist */}
          {employee.onboardingChecklist && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Onboarding Checklist</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {[
                    ['contractUploaded', 'Contract Uploaded'],
                    ['idCaptured', 'ID Captured'],
                    ['roleAssigned', 'Role Assigned'],
                    ['payrollCreated', 'Payroll Created'],
                    ['deptAssigned', 'Department Assigned'],
                    ['uniformIssued', 'Uniform Issued'],
                    ['systemAccess', 'System Access'],
                    ['orientationDone', 'Orientation Done'],
                    ['policyAcknowledged', 'Policy Acknowledged'],
                  ].map(([key, label]) => (
                    <div key={key} className={cn(
                      'flex items-center gap-2 p-2 rounded-lg',
                      (employee.onboardingChecklist as any)[key] ? 'bg-green-50 dark:bg-green-900/10' : 'bg-muted/30',
                    )}>
                      {(employee.onboardingChecklist as any)[key]
                        ? <Check className="w-3.5 h-3.5 text-green-600" />
                        : <X className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className={cn('text-xs', (employee.onboardingChecklist as any)[key] ? 'text-green-700' : 'text-muted-foreground')}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                <OnboardingUpdateButton employeeId={employee.id} checklist={employee.onboardingChecklist} onSuccess={refresh} />
              </CardContent>
            </Card>
          )}

          {employee.notes && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{employee.notes}</CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── ATTENDANCE ─────────────────────────────────────────── */}
        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {employee.attendances?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No attendance records.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clock In</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clock Out</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Hours</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(employee.attendances ?? []).map((a: any) => (
                      <tr key={a.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs">{a.date ? format(new Date(a.date), 'MMM d, yyyy') : '—'}</td>
                        <td className="px-4 py-3 text-xs">{a.clockIn ? format(new Date(a.clockIn), 'HH:mm') : '—'}</td>
                        <td className="px-4 py-3 text-xs">{a.clockOut ? format(new Date(a.clockOut), 'HH:mm') : '—'}</td>
                        <td className="px-4 py-3 text-xs">{a.hoursWorked ? `${a.hoursWorked}h` : '—'}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{a.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── LEAVE ─────────────────────────────────────────────── */}
        <TabsContent value="leave" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {employee.leaveRequests?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No leave requests.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Days</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(employee.leaveRequests ?? []).map((l: any) => (
                      <tr key={l.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs">{l.leaveType}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {l.startDate ? format(new Date(l.startDate), 'MMM d') : '—'} – {l.endDate ? format(new Date(l.endDate), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs">{l.totalDays}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{l.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── PAYROLL ────────────────────────────────────────────── */}
        <TabsContent value="payroll" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {employee.payrolls?.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">No payroll records.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Allow.</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Deduct.</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tax</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Pay</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(employee.payrolls ?? []).map((p: any) => (
                      <tr key={p.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {p.periodStart ? format(new Date(p.periodStart), 'MMM yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">${Number(p.baseSalary).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-green-600">+${Number(p.allowances).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-red-600">-${Number(p.deductions).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-red-600">-${Number(p.tax).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">${Number(p.netPay).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{p.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── DISCIPLINE ──────────────────────────────────────────── */}
        <TabsContent value="discipline" className="mt-4 space-y-4">
          {/* Disciplinary Cases */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4" />Disciplinary Cases</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {employee.disciplinaryCases?.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm px-4">No disciplinary cases on record.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Case #</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(employee.disciplinaryCases ?? []).map((c: any) => (
                      <tr key={c.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.caseNumber}</td>
                        <td className="px-4 py-3 text-xs">{c.category?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {c.incidentDate ? format(new Date(c.incidentDate), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs">{c.actions?.length ?? 0} action(s)</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">{c.status?.replace(/_/g, ' ')}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {/* Suspensions */}
          {(employee.suspensions ?? []).length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Suspension History</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Paid</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(employee.suspensions ?? []).map((s: any) => (
                      <tr key={s.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs">{s.suspensionType?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {s.startDate ? format(new Date(s.startDate), 'MMM d') : '—'}
                          {s.endDate ? ` – ${format(new Date(s.endDate), 'MMM d, yyyy')}` : ''}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn('text-xs', s.isPaid ? 'text-green-600' : 'text-red-600')}>
                            {s.isPaid ? 'With Pay' : 'Without Pay'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── PERFORMANCE ─────────────────────────────────────────── */}
        <TabsContent value="performance" className="mt-4">
          <AddPerformanceReviewDialog employeeId={employee.id} onSuccess={refresh} />
          <div className="mt-3 space-y-3">
            {(employee.performanceReviews ?? []).length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">No performance reviews.</CardContent></Card>
            ) : (
              (employee.performanceReviews ?? []).map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{r.reviewPeriod} — {r.reviewType}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {[1,2,3,4,5].map(n => (
                            <div key={n} className={cn('w-4 h-4 rounded-sm', n <= r.overallRating ? 'bg-primary' : 'bg-muted')} />
                          ))}
                          <span className="text-xs text-muted-foreground ml-2">
                            {['','Unsatisfactory','Needs Improvement','Satisfactory','Good','Excellent'][r.overallRating]}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">{r.status}</Badge>
                    </div>
                    {r.feedback && <p className="text-xs text-muted-foreground mt-2">{r.feedback}</p>}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ─── ASSETS ──────────────────────────────────────────────── */}
        <TabsContent value="assets" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Issued Assets & Uniforms</CardTitle>
              <IssueAssetDialog employeeId={employee.id} propertyId={propertyId} onSuccess={refresh} />
            </CardHeader>
            <CardContent className="p-0">
              {(employee.assetIssues ?? []).length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm">No assets currently issued.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Asset Type</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Issued</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(employee.assetIssues ?? []).map((a: any) => (
                      <tr key={a.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 text-xs font-medium">{a.assetType?.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{a.description}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {a.issuedDate ? format(new Date(a.issuedDate), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn(
                            'text-xs',
                            a.status === 'ISSUED' ? 'text-blue-600 border-blue-200' :
                            a.status === 'RETURNED' ? 'text-green-600' :
                            'text-red-600',
                          )}>{a.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── DOCUMENTS ───────────────────────────────────────────── */}
        <TabsContent value="documents" className="mt-4">
          <EmployeeDocumentsTab employeeId={employee.id} onSuccess={refresh} />
        </TabsContent>
      </Tabs>
    </FadeIn>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function OnboardingUpdateButton({ employeeId, checklist, onSuccess }: any) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...checklist });

  const mutation = useMutation({
    mutationFn: () => hrApi.updateOnboarding(employeeId, form),
    onSuccess: () => { toast({ title: 'Onboarding updated' }); setOpen(false); onSuccess(); },
  });

  const fields: [string, string][] = [
    ['contractUploaded', 'Contract Uploaded'],
    ['idCaptured', 'ID / Documentation Captured'],
    ['roleAssigned', 'Role Assigned'],
    ['payrollCreated', 'Payroll Profile Created'],
    ['deptAssigned', 'Department Assignment Completed'],
    ['uniformIssued', 'Uniform / Access Issued'],
    ['systemAccess', 'System Access Created'],
    ['orientationDone', 'Orientation Completed'],
    ['policyAcknowledged', 'Policy Acknowledgement Signed'],
  ];

  return (
    <>
      <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => setOpen(true)}>
        Update Checklist
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Onboarding Checklist</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            {fields.map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 py-1 cursor-pointer">
                <input type="checkbox" checked={!!form[key]}
                  onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.checked }))}
                  className="h-4 w-4 accent-primary" />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => mutation.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddPerformanceReviewDialog({ employeeId, onSuccess }: any) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ reviewPeriod: '', reviewType: 'ANNUAL', overallRating: 3, feedback: '', improvements: '' });

  const mutation = useMutation({
    mutationFn: () => hrApi.createPerformanceReview({ ...form, employeeId }),
    onSuccess: () => { toast({ title: 'Review added' }); setOpen(false); onSuccess(); },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <>
      <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Review
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Performance Review</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Review Period *</Label>
                <Input placeholder="e.g. Q1 2026" value={form.reviewPeriod} onChange={e => setForm(f => ({ ...f, reviewPeriod: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Review Type</Label>
                <Select value={form.reviewType} onValueChange={v => setForm(f => ({ ...f, reviewType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['PROBATION','MONTHLY','QUARTERLY','ANNUAL'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Overall Rating</Label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button"
                    className={cn('w-10 h-10 rounded-lg border text-sm font-bold transition-colors',
                      form.overallRating >= n ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted')}
                    onClick={() => setForm(f => ({ ...f, overallRating: n }))}>
                    {n}
                  </button>
                ))}
                <span className="text-xs text-muted-foreground self-center ml-2">
                  {['','Unsatisfactory','Needs Improvement','Satisfactory','Good','Excellent'][form.overallRating]}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Feedback</Label>
              <Textarea rows={2} value={form.feedback} onChange={e => setForm(f => ({ ...f, feedback: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Areas for Improvement</Label>
              <Textarea rows={2} value={form.improvements} onChange={e => setForm(f => ({ ...f, improvements: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.reviewPeriod || mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => mutation.mutate()}>Submit Review</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function IssueAssetDialog({ employeeId, propertyId, onSuccess }: any) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ assetType: 'UNIFORM', description: '', issuedDate: new Date().toISOString().split('T')[0], conditionOnIssue: 'GOOD' });

  const mutation = useMutation({
    mutationFn: () => hrApi.issueAsset({ ...form, employeeId }),
    onSuccess: () => { toast({ title: 'Asset issued' }); setOpen(false); onSuccess(); },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="w-3.5 h-3.5 mr-1.5" /> Issue Asset
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Issue Asset / Uniform</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Asset Type *</Label>
                <Select value={form.assetType} onValueChange={v => setForm(f => ({ ...f, assetType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['UNIFORM','KEY','ACCESS_CARD','RADIO','POS_DEVICE','LAPTOP','PHONE','ID_CARD','TOOL','OTHER'].map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Condition</Label>
                <Select value={form.conditionOnIssue} onValueChange={v => setForm(f => ({ ...f, conditionOnIssue: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOOD">Good</SelectItem>
                    <SelectItem value="FAIR">Fair</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Input placeholder="e.g. Front Desk uniform set, size M" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Issue Date *</Label>
              <Input type="date" value={form.issuedDate} onChange={e => setForm(f => ({ ...f, issuedDate: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={!form.description || mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => mutation.mutate()}>Issue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmployeeDocumentsTab({ employeeId, onSuccess }: any) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState({ category: 'CONTRACT', title: '', fileUrl: '' });

  const { data: docs, isLoading } = useQuery({
    queryKey: ['employee-docs', employeeId],
    queryFn: () => hrApi.employeeDocuments(employeeId).then(r => r.data),
  });
  const documents: any[] = Array.isArray(docs) ? docs : [];

  const uploadMutation = useMutation({
    mutationFn: () => hrApi.uploadDocument(employeeId, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-docs', employeeId] });
      toast({ title: 'Document saved' });
      setUploadOpen(false);
      setForm({ category: 'CONTRACT', title: '', fileUrl: '' });
      onSuccess();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => hrApi.deleteDocument(employeeId, docId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employee-docs', employeeId] }); toast({ title: 'Document removed' }); },
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setUploadOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Document
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : documents.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No documents on file.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {documents.map((d: any) => (
                  <tr key={d.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">{d.category}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-sm">
                      <a href={d.fileUrl} target="_blank" rel="noreferrer" className="hover:underline text-primary">{d.title}</a>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {d.createdAt ? format(new Date(d.createdAt), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="text-xs h-7 text-red-600"
                        onClick={() => deleteMutation.mutate(d.id)}>Remove</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Employee Document</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['CONTRACT','WARNING','SUSPENSION','APPRAISAL','ID','CERT','PAYROLL','LEAVE','GRIEVANCE','MEDICAL','OTHER'].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. Employment Contract 2026" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>File URL *</Label>
              <Input placeholder="https://…" value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Upload to Documents module first, then paste the URL here.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button disabled={!form.title || !form.fileUrl || uploadMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => uploadMutation.mutate()}>
              Save Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
