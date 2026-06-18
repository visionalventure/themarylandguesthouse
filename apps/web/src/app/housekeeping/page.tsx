'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Clock, AlertCircle, BedDouble } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { housekeepingApi, roomsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { HousekeepingTaskDialog } from './components/housekeeping-task-dialog';

import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';

const TASK_TYPES: Record<string, string> = {
  CHECKOUT_CLEAN: 'Checkout Clean',
  STAYOVER_CLEAN: 'Stayover Clean',
  DEEP_CLEAN: 'Deep Clean',
  TURNDOWN: 'Turndown',
  INSPECTION: 'Inspection',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400',
  NORMAL: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-primary/20 dark:text-primary',
  LOW: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-muted dark:text-muted-foreground',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Pending', color: 'border-l-amber-500', icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: 'border-l-primary', icon: AlertCircle },
  COMPLETED: { label: 'Completed', color: 'border-l-green-500', icon: CheckCircle2 },
};

const ROOM_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-500/15 border-green-500/30 text-green-600 dark:text-green-400',
  OCCUPIED: 'bg-primary/15 border-primary/30 text-primary',
  CLEANING: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
  MAINTENANCE: 'bg-red-500/15 border-red-500/30 text-red-600 dark:text-red-400',
  RESERVED: 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400',
};

function TaskCard({ task, onUpdate }: { task: any; onUpdate: (id: string, status: string) => void }) {
  const statusCfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = statusCfg.icon;
  return (
    <div className={cn('bg-card border-l-4 border border-border rounded-lg p-3 space-y-2', statusCfg.color)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm text-foreground">Room {task.room?.roomNumber}</p>
          <p className="text-xs text-muted-foreground">{TASK_TYPES[task.taskType] ?? task.taskType}</p>
        </div>
        <Badge className={cn('text-[10px] border', PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.NORMAL)}>
          {task.priority}
        </Badge>
      </div>
      {task.assignedTo && (
        <p className="text-xs text-muted-foreground">
          👤 {task.assignedTo.firstName} {task.assignedTo.lastName}
        </p>
      )}
      {task.scheduledAt && (
        <p className="text-xs text-muted-foreground">
          🕐 {format(new Date(task.scheduledAt), 'HH:mm')}
        </p>
      )}
      {task.notes && <p className="text-xs text-muted-foreground italic truncate">{task.notes}</p>}
      <div className="flex gap-1 pt-1">
        {task.status === 'PENDING' && (
          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => onUpdate(task.id, 'IN_PROGRESS')}>
            Start
          </Button>
        )}
        {task.status === 'IN_PROGRESS' && (
          <Button size="sm" className="h-6 text-xs bg-green-600 hover:bg-green-700 text-white" onClick={() => onUpdate(task.id, 'COMPLETED')}>
            Complete
          </Button>
        )}
      </div>
    </div>
  );
}

export default function HousekeepingPage() {
  usePageTitle('Housekeeping');
  const propertyId = useAuthStore((s) => s.propertyId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tasksData } = useQuery({
    queryKey: ['housekeeping-tasks', propertyId, statusFilter],
    queryFn: () => housekeepingApi.tasks({
      propertyId: propertyId,
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    }).then(r => r.data),
  });

  const { data: roomsData } = useQuery({
    queryKey: ['housekeeping-rooms', propertyId],
    queryFn: () => housekeepingApi.roomsStatus(propertyId).then(r => r.data),
  });

  const tasks: any[] = tasksData?.data ?? [];
  const rooms: any[] = Array.isArray(roomsData) ? roomsData : [];

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      housekeepingApi.updateTask(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-rooms'] });
      toast({ title: 'Task updated' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Failed to update task' }),
  });

  const handleUpdate = (id: string, status: string) => updateMutation.mutate({ id, status });

  const pending   = tasks.filter(t => t.status === 'PENDING');
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS');
  const completed  = tasks.filter(t => t.status === 'COMPLETED');

  return (
    <FadeIn className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Housekeeping</h1>
          <p className="text-muted-foreground text-sm">Manage cleaning tasks and room status</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Task
        </Button>
      </div>

      {/* Stats */}
      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks', value: stats.total, icon: BedDouble, color: 'text-primary' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-500' },
          { label: 'In Progress', value: stats.inProgress, icon: AlertCircle, color: 'text-blue-500' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-green-500' },
        ].map(stat => (
          <StaggerItem key={stat.label}>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <stat.icon className={cn('w-8 h-8', stat.color)} />
                  <div>
                    <AnimatedCounter value={stat.value} className="text-2xl font-bold block" />
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGrid>

      <Tabs defaultValue="board">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="board">Task Board</TabsTrigger>
            <TabsTrigger value="rooms">Room Status</TabsTrigger>
          </TabsList>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Kanban Board */}
        <TabsContent value="board">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {[
              { title: 'Pending', tasks: pending, color: 'text-amber-500', count: pending.length },
              { title: 'In Progress', tasks: inProgress, color: 'text-primary', count: inProgress.length },
              { title: 'Completed', tasks: completed, color: 'text-green-500', count: completed.length },
            ].map(col => (
              <div key={col.title} className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className={cn('text-sm font-semibold', col.color)}>{col.title}</h3>
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{col.count}</span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {col.tasks.length === 0 ? (
                    <div className="border-2 border-dashed border-border rounded-lg h-24 flex items-center justify-center">
                      <p className="text-xs text-muted-foreground">No tasks</p>
                    </div>
                  ) : (
                    col.tasks.map(task => (
                      <TaskCard key={task.id} task={task} onUpdate={handleUpdate} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Room Status Grid */}
        <TabsContent value="rooms">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
            {rooms.length === 0 ? (
              <div className="col-span-full text-center py-12 text-muted-foreground text-sm">
                No rooms found. Add rooms in the Rooms module.
              </div>
            ) : (
              rooms.map((room: any) => (
                <div
                  key={room.id}
                  className={cn(
                    'border rounded-lg p-3 text-center space-y-1',
                    ROOM_STATUS_COLORS[room.status] ?? 'bg-muted border-border text-foreground',
                  )}
                >
                  <p className="text-lg font-bold">{room.roomNumber}</p>
                  <p className="text-[10px] font-medium capitalize">
                    {(room.status ?? 'available').toLowerCase().replace('_', ' ')}
                  </p>
                  {room.pendingTask && (
                    <p className="text-[9px] opacity-70 truncate">
                      {TASK_TYPES[room.pendingTask.taskType] ?? room.pendingTask.taskType}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <HousekeepingTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        propertyId={propertyId}
      />
    </FadeIn>
  );
}
