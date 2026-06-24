'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek } from 'date-fns';
import { Plus, Calendar, ChevronLeft, ChevronRight, Settings2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { hrApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/ui/fade-in';

const FALLBACK_COLORS: Record<string, string> = {
  MORNING:   'bg-amber-100 text-amber-700 border-amber-200',
  AFTERNOON: 'bg-blue-100 text-blue-700 border-blue-200',
  EVENING:   'bg-indigo-100 text-indigo-700 border-indigo-200',
  NIGHT:     'bg-purple-100 text-purple-700 border-purple-200',
  SPLIT:     'bg-green-100 text-green-700 border-green-200',
  OFF:       'bg-gray-100 text-gray-500 border-gray-200',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EMPTY_TYPE_FORM = { name: '', label: '', startTime: '08:00', endTime: '17:00', breakMinutes: 0, color: '' };

export default function RosterPage() {
  usePageTitle('Shift Roster');
  const propertyId = useAuthStore((s) => s.propertyId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [manageTypesOpen, setManageTypesOpen] = useState(false);
  const [typeFormOpen, setTypeFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE_FORM);
  const [form, setForm] = useState({
    employeeId: '', shiftType: 'MORNING', startDate: '', endDate: '',
    startTime: '06:00', endTime: '14:00', notes: '',
  });

  const weekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;

  const { data: rosterData, isLoading } = useQuery({
    queryKey: ['roster', propertyId, weekStart.toISOString(), deptFilter],
    queryFn: () => hrApi.roster({
      propertyId,
      startDate: format(weekStart, 'yyyy-MM-dd'),
      endDate: format(weekEnd, 'yyyy-MM-dd'),
      departmentId: deptFilter !== 'ALL' ? deptFilter : undefined,
    }).then((r: any) => r.data),
  });

  const { data: empData } = useQuery({
    queryKey: ['hr-employees', propertyId, '', 'ACTIVE'],
    queryFn: () => hrApi.employees({ propertyId, status: 'ACTIVE', limit: 100 }).then(r => r.data),
  });
  const employees: any[] = empData?.data ?? [];

  const { data: deptData } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: () => hrApi.departments().then(r => r.data),
  });
  const departments: any[] = Array.isArray(deptData) ? deptData : [];

  const { data: shiftTypesData } = useQuery({
    queryKey: ['shift-types', propertyId],
    queryFn: () => hrApi.shiftTypes({ propertyId }).then(r => r.data),
  });
  const shiftTypes: any[] = Array.isArray(shiftTypesData) ? shiftTypesData : [];

  const shiftTimeDefaults = Object.fromEntries(shiftTypes.map(s => [s.name, { startTime: s.startTime, endTime: s.endTime }]));

  const getShiftColor = (name: string) => FALLBACK_COLORS[name] ?? 'bg-muted text-muted-foreground border-border';

  const rosters: any[] = Array.isArray(rosterData) ? rosterData : (rosterData?.data ?? []);

  const empDays = employees.map(emp => {
    const shifts = rosters.filter(r => r.employeeId === emp.id);
    const dayShifts: Record<string, string> = {};
    for (let d = 0; d <= 6; d++) {
      const day = format(addDays(weekStart, d), 'yyyy-MM-dd');
      const shift = shifts.find(s => {
        const date = s.shiftDate ?? s.startDate;
        return date && format(new Date(date), 'yyyy-MM-dd') === day;
      });
      dayShifts[day] = shift?.shiftType ?? 'OFF';
    }
    return { emp, dayShifts };
  });

  const addMutation = useMutation({
    mutationFn: () => hrApi.upsertShift({ ...form, propertyId, endDate: form.endDate || form.startDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster'] });
      toast({ title: 'Shift assigned' });
      setAddOpen(false);
      setForm({ employeeId: '', shiftType: shiftTypes[0]?.name ?? 'MORNING', startDate: '', endDate: '', startTime: '06:00', endTime: '14:00', notes: '' });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const createTypeMutation = useMutation({
    mutationFn: (data: any) => hrApi.createShiftType({ ...data, propertyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-types'] });
      toast({ title: 'Shift type created' });
      setTypeFormOpen(false);
      setTypeForm(EMPTY_TYPE_FORM);
      setEditingType(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Failed to create' }),
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => hrApi.updateShiftType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-types'] });
      toast({ title: 'Shift type updated' });
      setTypeFormOpen(false);
      setTypeForm(EMPTY_TYPE_FORM);
      setEditingType(null);
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Failed to update' }),
  });

  const deleteTypeMutation = useMutation({
    mutationFn: (id: string) => hrApi.deleteShiftType(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shift-types'] }); toast({ title: 'Shift type deleted' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Cannot delete — shift type is in use' }),
  });

  const openEditType = (type: any) => {
    setEditingType(type);
    setTypeForm({ name: type.name, label: type.label, startTime: type.startTime, endTime: type.endTime, breakMinutes: type.breakMinutes ?? 0, color: type.color ?? '' });
    setTypeFormOpen(true);
  };

  const openAddType = () => {
    setEditingType(null);
    setTypeForm(EMPTY_TYPE_FORM);
    setTypeFormOpen(true);
  };

  const closeTypeForm = () => { setTypeFormOpen(false); setEditingType(null); setTypeForm(EMPTY_TYPE_FORM); };

  const submitTypeForm = () => {
    const payload = { ...typeForm, breakMinutes: Number(typeForm.breakMinutes) };
    if (editingType) updateTypeMutation.mutate({ id: editingType.id, ...payload });
    else createTypeMutation.mutate(payload);
  };

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center gap-3">
        <Calendar className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Shift Roster</h1>
          <p className="text-muted-foreground text-sm">Weekly staff scheduling and shift management</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {shiftTypes.map(type => (
          <span key={type.name} className={cn('text-xs px-2 py-1 rounded-full border font-medium', getShiftColor(type.name))}>
            {type.name}{type.label ? ` · ${type.label}` : ''}
          </span>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-muted/40 rounded-lg px-2 py-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">{weekLabel}</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="text-xs" onClick={() => setWeekOffset(0)}>
          This Week
        </Button>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-44 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Departments</SelectItem>
            {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setManageTypesOpen(true)}>
          <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Shift Types
        </Button>
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Assign Shift
        </Button>
      </div>

      {/* Roster Grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading roster…</div>
          ) : employees.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No active employees found.</div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[200px]">Employee</th>
                  {DAYS.map((d, i) => (
                    <th key={d} className="text-center px-2 py-3 font-medium text-muted-foreground min-w-[100px]">
                      <div className={cn(
                        'font-medium',
                        format(addDays(weekStart, i), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                          ? 'text-primary font-bold' : '',
                      )}>
                        {d}
                      </div>
                      <div className="text-muted-foreground font-normal">
                        {format(addDays(weekStart, i), 'MMM d')}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {empDays.map(({ emp, dayShifts }) => (
                  <tr key={emp.id} className="border-b border-border hover:bg-muted/20">
                    <td className="px-4 py-2">
                      <div className="font-medium text-foreground">{emp.firstName} {emp.lastName}</div>
                      <div className="text-muted-foreground">{emp.position}</div>
                    </td>
                    {Array.from({ length: 7 }, (_, i) => {
                      const day = format(addDays(weekStart, i), 'yyyy-MM-dd');
                      const shift = dayShifts[day] ?? 'OFF';
                      return (
                        <td key={day} className="px-1 py-2 text-center">
                          <span className={cn(
                            'inline-block rounded px-1.5 py-0.5 text-[10px] font-medium border w-full text-center',
                            getShiftColor(shift),
                            shift === 'OFF' ? 'opacity-50' : '',
                          )}>
                            {shift}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Assign Shift Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Shift</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <Label>Employee *</Label>
              <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee…" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} — {e.position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Shift Type *</Label>
              <Select value={form.shiftType} onValueChange={v => {
                const def = shiftTimeDefaults[v] ?? { startTime: '08:00', endTime: '17:00' };
                setForm(f => ({ ...f, shiftType: v, ...def }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {shiftTypes.map(s => (
                    <SelectItem key={s.name} value={s.name}>{s.name} — {s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From Date *</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>To Date (optional)</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            {form.shiftType !== 'OFF' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Time</Label>
                  <Input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Time</Label>
                  <Input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional shift notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.employeeId || !form.startDate || addMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => addMutation.mutate()}>
              Assign Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Shift Types Sheet */}
      <Sheet open={manageTypesOpen} onOpenChange={setManageTypesOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Manage Shift Types</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={openAddType}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Shift Type
            </Button>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Label</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Hours</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {shiftTypes.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">No shift types configured.</td></tr>
                  ) : shiftTypes.map(type => (
                    <tr key={type.id} className="border-b border-border hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{type.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{type.label}</td>
                      <td className="px-3 py-2 text-muted-foreground">{type.startTime}–{type.endTime}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditType(type)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            disabled={deleteTypeMutation.isPending}
                            onClick={() => deleteTypeMutation.mutate(type.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Add / Edit Shift Type Dialog */}
      <Dialog open={typeFormOpen} onOpenChange={v => { if (!v) closeTypeForm(); else setTypeFormOpen(true); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingType ? 'Edit Shift Type' : 'Add Shift Type'}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-1.5">
              <Label>Name * <span className="text-muted-foreground text-xs">(e.g. MORNING, no spaces)</span></Label>
              <Input
                value={typeForm.name}
                onChange={e => setTypeForm(f => ({ ...f, name: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                placeholder="MORNING"
                disabled={!!editingType}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Display Label *</Label>
              <Input value={typeForm.label} onChange={e => setTypeForm(f => ({ ...f, label: e.target.value }))} placeholder="6AM–2PM" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Time *</Label>
                <Input type="time" value={typeForm.startTime} onChange={e => setTypeForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Time *</Label>
                <Input type="time" value={typeForm.endTime} onChange={e => setTypeForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Break (minutes)</Label>
              <Input type="number" min={0} value={typeForm.breakMinutes} onChange={e => setTypeForm(f => ({ ...f, breakMinutes: Number(e.target.value) }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeTypeForm}>Cancel</Button>
            <Button
              disabled={!typeForm.name || !typeForm.label || createTypeMutation.isPending || updateTypeMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={submitTypeForm}>
              {editingType ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
