'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wrench, Package, Calendar, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { maintenanceApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { WorkOrderDialog } from './components/work-order-dialog';
import { AssetDialog } from './components/asset-dialog';

import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-primary/20 dark:text-primary',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400',
  CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-muted dark:text-muted-foreground',
  ON_HOLD: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-200',
  MEDIUM: 'bg-amber-100 text-amber-700 border-amber-200',
  LOW: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-muted dark:text-muted-foreground',
};

export default function MaintenancePage() {
  usePageTitle('Maintenance');
  const propertyId = useAuthStore((s) => s.propertyId);
  const [woDialogOpen, setWoDialogOpen] = useState(false);
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('work-orders');

  const { data: woData } = useQuery({
    queryKey: ['work-orders', propertyId, statusFilter],
    queryFn: () => maintenanceApi.workOrders({
      propertyId: propertyId,
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    }).then(r => r.data),
  });

  const { data: assetsData } = useQuery({
    queryKey: ['assets', propertyId],
    queryFn: () => maintenanceApi.assets({ propertyId: propertyId }).then(r => r.data),
  });

  const { data: scheduleData } = useQuery({
    queryKey: ['maintenance-schedule', propertyId],
    queryFn: () => maintenanceApi.schedule(propertyId).then(r => r.data),
    enabled: activeTab === 'schedule',
  });

  const workOrders: any[] = woData?.data ?? [];
  const assets: any[] = assetsData?.data ?? [];
  const schedules: any[] = Array.isArray(scheduleData) ? scheduleData : [];
  const today = new Date();

  const stats = {
    open: workOrders.filter(w => w.status === 'PENDING').length,
    inProgress: workOrders.filter(w => w.status === 'IN_PROGRESS').length,
    completed: workOrders.filter(w => w.status === 'COMPLETED').length,
    assets: assets.length,
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      maintenanceApi.updateWorkOrder(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({ title: 'Work order updated' });
    },
  });

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Maintenance</h1>
          <p className="text-muted-foreground text-sm">Work orders, assets, and preventive maintenance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAssetDialogOpen(true)}>
            <Package className="w-4 h-4 mr-2" /> Add Asset
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setWoDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Work Order
          </Button>
        </div>
      </div>

      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Open Orders', value: stats.open, icon: AlertTriangle, color: 'text-amber-500' },
          { label: 'In Progress', value: stats.inProgress, icon: Wrench, color: 'text-primary' },
          { label: 'Completed', value: stats.completed, icon: Calendar, color: 'text-green-500' },
          { label: 'Total Assets', value: stats.assets, icon: Package, color: 'text-muted-foreground' },
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="schedule">PM Schedule</TabsTrigger>
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
              <SelectItem value="ON_HOLD">On Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="work-orders">
          <Card className="mt-4">
            <CardContent className="p-0">
              {workOrders.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  No work orders found. Create one to get started.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">WO #</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {workOrders.map(wo => (
                      <tr key={wo.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs text-primary">{wo.workOrderNumber}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{wo.title}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{wo.description}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {wo.room ? `Room ${wo.room.roomNumber}` : wo.asset?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn('text-xs border', PRIORITY_COLORS[wo.priority] ?? '')}>{wo.priority}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn('text-xs border', STATUS_COLORS[wo.status] ?? '')}>{wo.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {wo.assignedTo ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {format(new Date(wo.createdAt), 'MMM d')}
                        </td>
                        <td className="px-4 py-3">
                          {wo.status === 'PENDING' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => updateMutation.mutate({ id: wo.id, status: 'IN_PROGRESS' })}>
                              Start
                            </Button>
                          )}
                          {wo.status === 'IN_PROGRESS' && (
                            <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => updateMutation.mutate({ id: wo.id, status: 'COMPLETED' })}>
                              Complete
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
        </TabsContent>

        <TabsContent value="assets">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {assets.length === 0 ? (
              <div className="col-span-full py-16 text-center text-muted-foreground text-sm">
                No assets recorded yet.
              </div>
            ) : (
              assets.map(asset => (
                <Card key={asset.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-semibold">{asset.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">{asset.category}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{asset.assetNumber}</p>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    {asset.brand && <p>Brand: <span className="text-foreground">{asset.brand}</span></p>}
                    {asset.location && <p>Location: <span className="text-foreground">{asset.location}</span></p>}
                    {asset.purchaseDate && (
                      <p>Purchased: <span className="text-foreground">{format(new Date(asset.purchaseDate), 'MMM d, yyyy')}</span></p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedule">
          <Card className="mt-4">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Preventive Maintenance Schedule</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {schedules.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  No preventive maintenance schedules configured.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-background">
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Task</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Frequency</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Next Due</th>
                        <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                        <th className="px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.map((s: any) => {
                        const nextDue = s.nextDueDate ? new Date(s.nextDueDate) : null;
                        const isOverdue = nextDue && nextDue < today;
                        return (
                          <tr key={s.id} className={cn('border-b border-border', isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-muted/30')}>
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">{s.title ?? s.taskType}</p>
                              {s.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{s.description}</p>}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{s.frequency?.toLowerCase() ?? '—'}</td>
                            <td className={cn('px-4 py-3 text-sm font-medium', isOverdue ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                              {nextDue ? format(nextDue, 'MMM d, yyyy') : '—'}
                              {isOverdue && <span className="ml-2 text-xs font-medium text-red-500">OVERDUE</span>}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={cn('text-xs', s.isActive ? 'text-green-600 border-green-500/40' : 'text-muted-foreground')}>
                                {s.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setWoDialogOpen(true)}
                              >
                                Create WO
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <WorkOrderDialog open={woDialogOpen} onOpenChange={setWoDialogOpen} propertyId={propertyId} />
      <AssetDialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen} propertyId={propertyId} />
    </FadeIn>
  );
}
