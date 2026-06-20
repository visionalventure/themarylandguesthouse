'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfWeek } from 'date-fns';
import { Plus, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { hrApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/ui/fade-in';

const SHIFT_COLORS: Record<string, string> = {
  MORNING:   'bg-amber-100 text-amber-700 border-amber-200',
  AFTERNOON: 'bg-blue-100 text-blue-700 border-blue-200',
  EVENING:   'bg-indigo-100 text-indigo-700 border-indigo-200',
  NIGHT:     'bg-purple-100 text-purple-700 border-purple-200',
  SPLIT:     'bg-green-100 text-green-700 border-green-200',
  OFF:       'bg-gray-100 text-gray-500 border-gray-200',
  FLEXI:     'bg-pink-100 text-pink-700 border-pink-200',
};

const SHIFT_LABELS: Record<string, string> = {
  MORNING:   '6AM–2PM',
  AFTERNOON: '2PM–10PM',
  EVENING:   '4PM–12AM',
  NIGHT:     '10PM–6AM',
  SPLIT:     'Split',
  OFF:       'OFF',
  FLEXI:     'Flexi',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function RosterPage() {
  usePageTitle('Shift Roster');
  const propertyId = useAuthStore((s) => s.propertyId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState('ALL');
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

  const rosters: any[] = Array.isArray(rosterData) ? rosterData : (rosterData?.data ?? []);

  const empDays = employees.map(emp => {
    const shifts = rosters.filter(r => r.employeeId === emp.id);
    const dayShifts: Record<string, string> = {};
    for (let d = 0; d <= 6; d++) {
      const day = format(addDays(weekStart, d), 'yyyy-MM-dd');
      const shift = shifts.find(s => format(new Date(s.startDate), 'yyyy-MM-dd') === day);
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
      setForm({ employeeId: '', shiftType: 'MORNING', startDate: '', endDate: '', startTime: '06:00', endTime: '14:00', notes: '' });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const SHIFT_TIME_DEFAULTS: Record<string, { startTime: string; endTime: string }> = {
    MORNING:   { startTime: '06:00', endTime: '14:00' },
    AFTERNOON: { startTime: '14:00', endTime: '22:00' },
    EVENING:   { startTime: '16:00', endTime: '00:00' },
    NIGHT:     { startTime: '22:00', endTime: '06:00' },
    SPLIT:     { startTime: '08:00', endTime: '20:00' },
    OFF:       { startTime: '00:00', endTime: '00:00' },
    FLEXI:     { startTime: '08:00', endTime: '17:00' },
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
        {Object.entries(SHIFT_COLORS).map(([type, cls]) => (
          <span key={type} className={cn('text-xs px-2 py-1 rounded-full border font-medium', cls)}>
            {type} {SHIFT_LABELS[type] ? `· ${SHIFT_LABELS[type]}` : ''}
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
                            SHIFT_COLORS[shift] ?? 'bg-muted text-muted-foreground',
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
                const def = SHIFT_TIME_DEFAULTS[v] ?? { startTime: '08:00', endTime: '17:00' };
                setForm(f => ({ ...f, shiftType: v, ...def }));
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SHIFT_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{v} — {l}</SelectItem>
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
    </FadeIn>
  );
}
