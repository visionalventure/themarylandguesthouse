'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, ClipboardCheck, LogIn, LogOut, Pencil } from 'lucide-react';
import { AppShell } from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { hrApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-green-100 text-green-700',
  ABSENT: 'bg-red-100 text-red-700',
  LATE: 'bg-amber-100 text-amber-700',
  HALF_DAY: 'bg-orange-100 text-orange-700',
  ON_LEAVE: 'bg-blue-100 text-blue-700',
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="text-4xl font-mono font-bold tracking-tight text-foreground">
      {format(time, 'HH:mm:ss')}
    </div>
  );
}

export default function MyAttendancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: () => hrApi.myAttendance({ limit: 30 }).then(r => r.data),
  });

  const records: any[] = data?.data ?? [];
  const employee = data?.employee;

  const today = new Date().toISOString().split('T')[0];
  const todayRecord = records.find(r => r.date?.startsWith(today));

  const clockInMutation = useMutation({
    mutationFn: () => hrApi.clockIn(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      toast({ title: 'Clocked in!', description: `Timestamp recorded at ${format(new Date(), 'HH:mm')}` });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Failed to clock in' }),
  });

  const clockOutMutation = useMutation({
    mutationFn: () => hrApi.clockOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      toast({ title: 'Clocked out!', description: `See you tomorrow!` });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Failed to clock out' }),
  });

  const noProfile = !isLoading && (error as any)?.response?.status === 404;

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">My Attendance</h1>
            {employee && (
              <p className="text-sm text-muted-foreground">{employee.firstName} {employee.lastName} · {employee.employeeNumber}</p>
            )}
          </div>
        </div>

        {noProfile ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ClipboardCheck className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">No employee profile linked</p>
              <p className="text-sm text-muted-foreground mt-1">Ask your HR manager to link your account to your employee profile.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Clock widget */}
            <Card className="border border-border">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
                    <LiveClock />
                  </div>
                  <div className="flex-1" />
                  <div className="space-y-3 w-full sm:w-auto">
                    {!todayRecord || !todayRecord.clockIn ? (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Not clocked in yet</p>
                        <Button
                          className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => clockInMutation.mutate()}
                          disabled={clockInMutation.isPending}
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          {clockInMutation.isPending ? 'Clocking in…' : 'Clock In Now'}
                        </Button>
                      </div>
                    ) : !todayRecord.clockOut ? (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Clocked in at <span className="text-foreground font-medium">{format(new Date(todayRecord.clockIn), 'HH:mm')}</span>
                        </p>
                        <Button
                          className="w-full sm:w-auto"
                          onClick={() => clockOutMutation.mutate()}
                          disabled={clockOutMutation.isPending}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          {clockOutMutation.isPending ? 'Clocking out…' : 'Clock Out Now'}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(todayRecord.clockIn), 'HH:mm')} → {format(new Date(todayRecord.clockOut), 'HH:mm')}
                          {' · '}<span className="text-foreground font-medium">{todayRecord.hoursWorked}h worked</span>
                        </p>
                        <Button variant="outline" disabled className="w-full sm:w-auto text-muted-foreground">
                          Done for today
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* History table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Attendance History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>
                ) : records.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">No attendance records yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Your clock-in history will appear here.</p>
                  </div>
                ) : (
                  <TooltipProvider>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Date</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Clock In</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Clock Out</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Hours</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Status</th>
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">Source</th>
                          <th className="w-8 px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((r: any) => {
                          const edits: any[] = Array.isArray(r.editHistory) ? r.editHistory : [];
                          return (
                            <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {r.date ? format(new Date(r.date), 'MMM d, yyyy') : '—'}
                              </td>
                              <td className="px-4 py-3 text-xs">{r.clockIn ? format(new Date(r.clockIn), 'HH:mm') : '—'}</td>
                              <td className="px-4 py-3 text-xs">{r.clockOut ? format(new Date(r.clockOut), 'HH:mm') : '—'}</td>
                              <td className="px-4 py-3 text-xs">{r.hoursWorked ? `${r.hoursWorked}h` : '—'}</td>
                              <td className="px-4 py-3">
                                <Badge className={cn('text-xs', STATUS_COLORS[r.status] ?? 'bg-muted')}>
                                  {r.status}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                {r.source === 'SELF_CLOCK' ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                                    Self
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 inline-block" />
                                    Manual
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {edits.length > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Pencil className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help inline-block" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs text-xs space-y-1" side="left">
                                      {edits.map((edit: any, i: number) => (
                                        <div key={i}>
                                          <span className="font-medium">{format(new Date(edit.editedAt), 'MMM d HH:mm')}</span>
                                          {' — '}{edit.reason}
                                        </div>
                                      ))}
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </TooltipProvider>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
