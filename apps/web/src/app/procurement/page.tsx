'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ShoppingCart, Package, Building2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { procurementApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PurchaseRequestDialog } from './components/purchase-request-dialog';
import { SupplierDialog } from './components/supplier-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';

const PR_STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400',
  APPROVED: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400',
  REJECTED: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400',
};

const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT:    'bg-gray-100 text-gray-600 border-gray-200 dark:bg-muted dark:text-muted-foreground',
  SENT:     'bg-blue-100 text-blue-700 border-blue-200 dark:bg-primary/20 dark:text-primary',
  PARTIAL:  'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400',
  RECEIVED: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400',
  COMPLETED:'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400',
  CANCELLED:'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400',
};

export default function ProcurementPage() {
  usePageTitle('Procurement');
  const propertyId = useAuthStore((s) => s.propertyId);
  const [prDialogOpen, setPrDialogOpen] = useState(false);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: prData } = useQuery({
    queryKey: ['purchase-requests', propertyId],
    queryFn: () => procurementApi.purchaseRequests({ propertyId: propertyId }).then(r => r.data),
  });

  const { data: poData } = useQuery({
    queryKey: ['purchase-orders', propertyId],
    queryFn: () => procurementApi.purchaseOrders({ propertyId: propertyId }).then(r => r.data),
  });

  const { data: suppliersRaw } = useQuery({
    queryKey: ['suppliers', propertyId],
    queryFn: () => procurementApi.suppliers({ propertyId: propertyId }).then(r => r.data),
  });

  const prs: any[] = prData?.data ?? [];
  const pos: any[] = poData?.data ?? [];
  const suppliers: any[] = Array.isArray(suppliersRaw) ? suppliersRaw : (suppliersRaw?.data ?? []);

  const stats = {
    pendingPRs: prs.filter(r => r.status === 'PENDING').length,
    activePOs: pos.filter(p => ['SENT', 'PARTIAL', 'RECEIVED'].includes(p.status)).length,
    spend: pos.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + Number(p.totalAmount ?? 0), 0),
    suppliers: suppliers.length,
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) =>
      procurementApi.approvePR(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      toast({ title: 'Request updated' });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Procurement</h1>
          <p className="text-muted-foreground text-sm">Purchase requests, orders, and supplier management</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setSupplierDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Supplier
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setPrDialogOpen(true)}>
            <ShoppingCart className="w-4 h-4 mr-2" /> New Request
          </Button>
        </div>
      </div>

      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending Requests', value: stats.pendingPRs, icon: ShoppingCart, color: 'text-amber-500' },
          { label: 'Active POs', value: stats.activePOs, icon: Package, color: 'text-primary' },
          { label: 'Total Spend', value: stats.spend, icon: CheckCircle, color: 'text-green-500', formatter: (v: number) => `$${v.toFixed(0)}` },
          { label: 'Suppliers', value: stats.suppliers, icon: Building2, color: 'text-muted-foreground' },
        ].map(stat => (
          <StaggerItem key={stat.label}>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <stat.icon className={cn('w-8 h-8', stat.color)} />
                  <div>
                    <AnimatedCounter value={stat.value} formatter={stat.formatter} className="text-2xl font-bold block" />
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGrid>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">Purchase Requests</TabsTrigger>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card className="mt-4">
            <CardContent className="p-0">
              {prs.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingCart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-base font-medium text-foreground">No purchase requests yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create a purchase request to initiate the procurement workflow.</p>
                  <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setPrDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" /> New Request
                  </Button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">PR #</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Department</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Items</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Est. Value</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {prs.map(pr => (
                      <tr key={pr.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs text-primary">{pr.requestNumber}</td>
                        <td className="px-4 py-3 text-sm">{pr.department ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{pr.items?.length ?? 0} items</td>
                        <td className="px-4 py-3 font-medium">
                          ${pr.items?.reduce((s: number, i: any) => s + Number(i.estimatedCost ?? 0) * Number(i.quantity ?? 1), 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn('text-xs border', PR_STATUS_COLORS[pr.status] ?? '')}>{pr.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {format(new Date(pr.createdAt), 'MMM d')}
                        </td>
                        <td className="px-4 py-3">
                          {pr.status === 'PENDING' && (
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => approveMutation.mutate({ id: pr.id, action: 'APPROVE' })}>
                                Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => setRejectTargetId(pr.id)}>
                                Reject
                              </Button>
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
        </TabsContent>

        <TabsContent value="orders">
          <Card className="mt-4">
            <CardContent className="p-0">
              {pos.length === 0 ? (
                <div className="py-16 text-center">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-base font-medium text-foreground">No purchase orders yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Purchase orders are generated when purchase requests are approved.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">PO #</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Supplier</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Items</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pos.map(po => (
                      <tr key={po.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs text-primary">{po.poNumber}</td>
                        <td className="px-4 py-3 text-sm">{po.supplier?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{po.lineItems?.length ?? 0} items</td>
                        <td className="px-4 py-3 font-medium">${Number(po.totalAmount ?? 0).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Badge className={cn('text-xs border', PO_STATUS_COLORS[po.status] ?? '')}>{po.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {po.expectedDeliveryDate ? format(new Date(po.expectedDeliveryDate), 'MMM d') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {suppliers.length === 0 ? (
              <div className="col-span-full py-16 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-base font-medium text-foreground">No suppliers added yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add suppliers to link them to purchase orders and track vendor relationships.</p>
                <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setSupplierDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Supplier
                </Button>
              </div>
            ) : (
              suppliers.map(s => (
                <Card key={s.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm">{s.name}</CardTitle>
                      {s.category && <Badge variant="outline" className="text-xs">{s.category}</Badge>}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">{s.supplierCode}</p>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    {s.contactName && <p>Contact: <span className="text-foreground">{s.contactName}</span></p>}
                    {s.email && <p>Email: <span className="text-foreground">{s.email}</span></p>}
                    {s.phone && <p>Phone: <span className="text-foreground">{s.phone}</span></p>}
                    {s.paymentTerms && <p>Terms: <span className="text-foreground">{s.paymentTerms}</span></p>}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <PurchaseRequestDialog open={prDialogOpen} onOpenChange={setPrDialogOpen} propertyId={propertyId} />
      <SupplierDialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen} propertyId={propertyId} />

      <ConfirmDialog
        open={!!rejectTargetId}
        onOpenChange={(v) => { if (!v) setRejectTargetId(null); }}
        title="Reject purchase request?"
        description="This will mark the purchase request as rejected. This action cannot be undone."
        confirmLabel="Reject"
        loading={approveMutation.isPending}
        onConfirm={() => {
          if (rejectTargetId) {
            approveMutation.mutate({ id: rejectTargetId, action: 'REJECT' }, { onSettled: () => setRejectTargetId(null) });
          }
        }}
      />
    </FadeIn>
  );
}
