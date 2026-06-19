'use client';

import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { Loader2, Plus, Shield, ClipboardList, Upload, X, ImageIcon, FileText, Building, CreditCard, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { settingsApi, documentsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';

const TIMEZONES = [
  { value: 'Africa/Monrovia',      label: 'Africa/Monrovia (GMT+0)' },
  { value: 'Africa/Abidjan',       label: 'Africa/Abidjan (GMT+0)' },
  { value: 'Africa/Accra',         label: 'Africa/Accra (GMT+0)' },
  { value: 'Africa/Lagos',         label: 'Africa/Lagos (GMT+1)' },
  { value: 'Africa/Nairobi',       label: 'Africa/Nairobi (GMT+3)' },
  { value: 'Africa/Johannesburg',  label: 'Africa/Johannesburg (GMT+2)' },
  { value: 'Africa/Cairo',         label: 'Africa/Cairo (GMT+2)' },
  { value: 'Africa/Casablanca',    label: 'Africa/Casablanca (GMT+1)' },
  { value: 'Europe/London',        label: 'Europe/London (GMT+0/+1)' },
  { value: 'Europe/Paris',         label: 'Europe/Paris (GMT+1/+2)' },
  { value: 'Europe/Berlin',        label: 'Europe/Berlin (GMT+1/+2)' },
  { value: 'Europe/Moscow',        label: 'Europe/Moscow (GMT+3)' },
  { value: 'America/New_York',     label: 'America/New_York (GMT-5/-4)' },
  { value: 'America/Chicago',      label: 'America/Chicago (GMT-6/-5)' },
  { value: 'America/Denver',       label: 'America/Denver (GMT-7/-6)' },
  { value: 'America/Los_Angeles',  label: 'America/Los_Angeles (GMT-8/-7)' },
  { value: 'America/Sao_Paulo',    label: 'America/Sao_Paulo (GMT-3)' },
  { value: 'Asia/Dubai',           label: 'Asia/Dubai (GMT+4)' },
  { value: 'Asia/Karachi',         label: 'Asia/Karachi (GMT+5)' },
  { value: 'Asia/Kolkata',         label: 'Asia/Kolkata (GMT+5:30)' },
  { value: 'Asia/Singapore',       label: 'Asia/Singapore (GMT+8)' },
  { value: 'Asia/Tokyo',           label: 'Asia/Tokyo (GMT+9)' },
  { value: 'Asia/Shanghai',        label: 'Asia/Shanghai (GMT+8)' },
  { value: 'Australia/Sydney',     label: 'Australia/Sydney (GMT+10/+11)' },
  { value: 'Pacific/Auckland',     label: 'Pacific/Auckland (GMT+12/+13)' },
  { value: 'UTC',                  label: 'UTC (GMT+0)' },
];

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'MAINTENANCE', 'ACCOUNTANT'];
const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400',
  ADMIN:       'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400',
  MANAGER:     'bg-primary/15 text-primary border-primary/40',
  FRONT_DESK:  'bg-blue-100 text-blue-700 border-blue-200 dark:bg-primary/20 dark:text-primary',
};

function PropertyTab() {
  const propertyId = useAuthStore((s) => s.propertyId);
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDragOver, setLogoDragOver] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings-property', propertyId],
    queryFn: () => settingsApi.getProperty(propertyId).then(r => r.data),
  });

  const { register, handleSubmit, reset, watch, setValue, control } = useForm({ defaultValues: data ?? {} });
  useEffect(() => { if (data) reset(data); }, [data, reset]);

  const logoValue = watch('logoUrl');

  const handleLogoFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Please select an image file (PNG, JPG, SVG)' });
      return;
    }
    setLogoUploading(true);
    try {
      const res = await documentsApi.upload(file);
      const fileUrl: string = res.data?.fileUrl ?? res.data?.url ?? '';
      if (fileUrl) {
        setValue('logoUrl', fileUrl, { shouldDirty: true });
        await settingsApi.updateProperty(propertyId, { logoUrl: fileUrl });
        toast({ title: 'Logo saved' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Logo upload failed' });
    } finally {
      setLogoUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateProperty(propertyId, values),
    onSuccess: () => toast({ title: 'Property settings saved' }),
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground text-sm">Loading...</div>;

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-sm">Property Information</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4 max-w-lg">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Property Name</Label>
              <Input {...register('name')} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register('phone')} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...register('email')} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input {...register('address')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input {...register('currency')} placeholder="USD" />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone…" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Logo upload */}
          <div className="space-y-2">
            <Label>Property Logo</Label>
            <div className="flex items-start gap-3">
              {/* Preview */}
              <div className="flex-shrink-0 w-16 h-16 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden">
                {logoValue ? (
                  <img src={logoValue} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                )}
              </div>
              {/* Upload zone */}
              <div className="flex-1 space-y-2">
                <div
                  className={cn(
                    'relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors',
                    logoDragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50',
                  )}
                  onClick={() => logoInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setLogoDragOver(true); }}
                  onDragLeave={() => setLogoDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setLogoDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleLogoFile(file);
                  }}
                >
                  {logoUploading ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Upload className="w-4 h-4" />
                      <span>Click or drag to upload logo</span>
                    </div>
                  )}
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoFile(f); }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or paste URL</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="flex gap-2">
                  <Input {...register('logoUrl')} placeholder="https://example.com/logo.png" className="text-xs" />
                  {logoValue && (
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0"
                      onClick={() => setValue('logoUrl', '', { shouldDirty: true })}>
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, SVG — recommended 200×200px or larger</p>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function UsersTab() {
  const propertyId = useAuthStore((s) => s.propertyId);
  const [inviteOpen, setInviteOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: usersData } = useQuery({
    queryKey: ['settings-users', propertyId],
    queryFn: () => settingsApi.getUsers(propertyId).then(r => r.data),
  });
  const users: any[] = Array.isArray(usersData) ? usersData : (usersData?.data ?? []);

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { email: '', firstName: '', lastName: '', role: 'FRONT_DESK' },
  });

  const inviteMutation = useMutation({
    mutationFn: (values: any) => settingsApi.inviteUser({ propertyId: propertyId, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
      toast({ title: 'User invited successfully' });
      setInviteOpen(false);
      reset();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-end">
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setInviteOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Invite User
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No users found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs border', ROLE_COLORS[u.role] ?? 'bg-muted text-muted-foreground border-border')}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn('text-xs', u.isActive ? 'text-green-600' : 'text-muted-foreground')}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => inviteMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input {...register('firstName', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input {...register('lastName', { required: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" {...register('email', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={watch('role')} onValueChange={v => setValue('role', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviteMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {inviteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Send Invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaxRatesTab() {
  const propertyId = useAuthStore((s) => s.propertyId);
  const [addOpen, setAddOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: taxData } = useQuery({
    queryKey: ['tax-rates', propertyId],
    queryFn: () => settingsApi.getTaxRates(propertyId).then(r => r.data),
  });
  const rates: any[] = Array.isArray(taxData) ? taxData : (taxData?.data ?? []);

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { name: '', rate: '', type: 'PERCENTAGE', appliesTo: 'ALL' },
  });

  const mutation = useMutation({
    mutationFn: (values: any) => settingsApi.createTaxRate({ propertyId: propertyId, ...values, rate: Number(values.rate) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-rates'] });
      toast({ title: 'Tax rate created' });
      setAddOpen(false);
      reset();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <div className="mt-4 space-y-3">
      <div className="flex justify-end">
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Tax Rate
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {rates.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No tax rates configured.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rate</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Applies To</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Active</th>
                </tr>
              </thead>
              <tbody>
                {rates.map(r => (
                  <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                    <td className="px-4 py-3">{r.rate}%</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.appliesTo ?? 'ALL'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn('text-xs', r.isActive !== false ? 'text-green-600' : 'text-muted-foreground')}>
                        {r.isActive !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Tax Rate</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input placeholder="VAT, Service Charge..." {...register('name', { required: true })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Rate (%)</Label>
                <Input type="number" min="0" max="100" step="0.01" {...register('rate', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Applies To</Label>
                <Input placeholder="ALL, ROOMS, F&B..." {...register('appliesTo')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const AUDIT_ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-primary/20 dark:text-primary',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  LOGIN: 'bg-violet-100 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  LOGOUT: 'bg-gray-100 text-gray-600 dark:bg-muted dark:text-muted-foreground',
};

function AuditLogTab() {
  const propertyId = useAuthStore((s) => s.propertyId);
  const [entityFilter, setEntityFilter] = useState('');
  const { data } = useQuery({
    queryKey: ['audit-log', entityFilter],
    queryFn: () => settingsApi.auditLog({ tenantId: propertyId, entityType: entityFilter || undefined, limit: 50 }).then(r => r.data),
  });

  const logs: any[] = data?.data ?? [];

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder="All entity types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="RESERVATION">Reservation</SelectItem>
            <SelectItem value="GUEST">Guest</SelectItem>
            <SelectItem value="ROOM">Room</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="INVOICE">Invoice</SelectItem>
            <SelectItem value="PAYMENT">Payment</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Card>
        <CardContent className="p-0">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No audit log entries found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Time</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Action</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Entity</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: any) => (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/30">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {log.createdAt ? format(new Date(log.createdAt), 'MMM d, HH:mm') : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', AUDIT_ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground')}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-medium text-foreground">{log.entityType}</span>
                        {log.entityId && <p className="text-[10px] text-muted-foreground font-mono">{log.entityId.slice(0, 8)}…</p>}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[220px] truncate">
                        {log.description ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const DEFAULT_TEMPLATE = {
  companyHeader: '',
  tagline: '',
  primaryColor: '#D4AF37',
  logoAlign: 'left' as 'left' | 'center' | 'right',
  defaultTerms: 'Payment is due within 30 days of the invoice date.',
  footerNote: 'Thank you for choosing Maryland Guesthouse!',
  bankName: '',
  bankAccount: '',
  swiftCode: '',
};

function InvoiceTemplateTab() {
  const propertyId = useAuthStore((s) => s.propertyId);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const { data: propData } = useQuery({
    queryKey: ['settings-property', propertyId],
    queryFn: () => settingsApi.getProperty(propertyId).then(r => r.data),
  });

  const [tmpl, setTmpl] = useState(DEFAULT_TEMPLATE);
  useEffect(() => {
    if (propData?.invoiceTemplate) {
      setTmpl({ ...DEFAULT_TEMPLATE, ...(propData.invoiceTemplate as any) });
    } else if (propData) {
      setTmpl(t => ({ ...t, companyHeader: propData.name || '' }));
    }
  }, [propData]);

  const set = (k: keyof typeof DEFAULT_TEMPLATE, v: string) =>
    setTmpl(prev => ({ ...prev, [k]: v as any }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.updateProperty(propertyId, { invoiceTemplate: tmpl });
      toast({ title: 'Invoice template saved' });
    } catch {
      toast({ variant: 'destructive', title: 'Failed to save template' });
    } finally {
      setSaving(false);
    }
  };

  const accent = tmpl.primaryColor || '#D4AF37';

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* ── Form ───────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Building className="w-4 h-4" />Company</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Company Header</Label>
              <Input value={tmpl.companyHeader} onChange={e => set('companyHeader', e.target.value)}
                placeholder={propData?.name || 'Maryland Guesthouse'} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tagline / Subtitle</Label>
              <Input value={tmpl.tagline} onChange={e => set('tagline', e.target.value)}
                placeholder="Premier Guesthouse in Monrovia, Liberia" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Brand Colour</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={accent} onChange={e => set('primaryColor', e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-border p-0.5 bg-background" />
                <Input value={accent} onChange={e => set('primaryColor', e.target.value)}
                  placeholder="#D4AF37" className="flex-1 font-mono text-xs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Logo on Invoice</Label>
              {(propData?.logo || propData?.logoUrl) ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                    <img
                      src={propData.logo || propData.logoUrl}
                      alt="Property logo"
                      className="h-10 w-auto max-w-[80px] object-contain rounded"
                    />
                    <span className="text-xs text-muted-foreground">From Property settings</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-1">Alignment:</span>
                    {(['left', 'center', 'right'] as const).map((align) => {
                      const Icon = align === 'left' ? AlignLeft : align === 'center' ? AlignCenter : AlignRight;
                      return (
                        <button
                          key={align}
                          type="button"
                          onClick={() => set('logoAlign', align)}
                          className={cn(
                            'flex items-center justify-center w-8 h-8 rounded border text-xs transition-colors',
                            tmpl.logoAlign === align
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border hover:bg-muted'
                          )}
                          title={align.charAt(0).toUpperCase() + align.slice(1)}
                        >
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No logo uploaded yet. Go to the <strong>Property</strong> tab to upload one.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CreditCard className="w-4 h-4" />Payment Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Bank Name</Label>
              <Input value={tmpl.bankName} onChange={e => set('bankName', e.target.value)} placeholder="Ecobank Liberia" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Account Number</Label>
              <Input value={tmpl.bankAccount} onChange={e => set('bankAccount', e.target.value)} placeholder="1234567890" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">SWIFT / Routing Code</Label>
              <Input value={tmpl.swiftCode} onChange={e => set('swiftCode', e.target.value)} placeholder="ECOCLRLM" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Text</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Default Payment Terms</Label>
              <Textarea rows={2} value={tmpl.defaultTerms} onChange={e => set('defaultTerms', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Footer Note</Label>
              <Textarea rows={2} value={tmpl.footerNote} onChange={e => set('footerNote', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save Template
        </Button>
      </div>

      {/* ── Live Preview ────────────────────────────── */}
      <div className="lg:col-span-3">
        <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Preview</p>
        <div className="border border-border rounded-xl overflow-hidden bg-white text-[#111] shadow-md text-[11px]">
          {/* Header bar */}
          <div className="px-6 py-4" style={{ backgroundColor: accent }}>
            {/* Logo row — full width, respects alignment */}
            {(propData?.logo || propData?.logoUrl) && (
              <div className={cn(
                'mb-2 flex',
                tmpl.logoAlign === 'center' ? 'justify-center' : tmpl.logoAlign === 'right' ? 'justify-end' : 'justify-start'
              )}>
                <img
                  src={propData.logo || propData.logoUrl}
                  alt="Logo"
                  className="h-10 max-w-[120px] object-contain"
                />
              </div>
            )}
            {/* Company name + invoice number row */}
            <div className="flex items-end justify-between">
              <div>
                <p className="font-bold text-white text-sm leading-tight">
                  {tmpl.companyHeader || propData?.name || 'Maryland Guesthouse'}
                </p>
                {tmpl.tagline && <p className="text-white/80 text-[10px]">{tmpl.tagline}</p>}
              </div>
              <div className="text-right text-white">
                <p className="text-lg font-black tracking-widest">INVOICE</p>
                <p className="text-white/80 text-[10px]">INV-2026-0001</p>
                <p className="text-white/70 text-[10px]">Due: 30 Jul 2026</p>
              </div>
            </div>
          </div>

          {/* Bill to + details */}
          <div className="px-6 py-3 grid grid-cols-2 gap-4 border-b border-gray-100">
            <div>
              <p className="text-[9px] uppercase font-semibold text-gray-400 mb-1">Bill To</p>
              <p className="font-semibold">James Wilson</p>
              <p className="text-gray-500">james.wilson@example.com</p>
              <p className="text-gray-500">+231 880 123 456</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase font-semibold text-gray-400 mb-1">Property</p>
              <p className="font-semibold">{propData?.name || 'Maryland Guesthouse'}</p>
              <p className="text-gray-500">{propData?.address || '14 Broad Street, Sinkor'}</p>
              <p className="text-gray-500">{propData?.phone || '+231 777 123 456'}</p>
            </div>
          </div>

          {/* Line items */}
          <div className="px-6 py-3">
            <table className="w-full text-[10px]">
              <thead>
                <tr style={{ backgroundColor: accent + '18' }}>
                  <th className="text-left py-1 px-2 font-semibold">Description</th>
                  <th className="text-right py-1 px-2 font-semibold">Qty</th>
                  <th className="text-right py-1 px-2 font-semibold">Price</th>
                  <th className="text-right py-1 px-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 px-2">Room Charge — Deluxe Double (3 nights)</td>
                  <td className="text-right py-1.5 px-2">3</td>
                  <td className="text-right py-1.5 px-2">$120.00</td>
                  <td className="text-right py-1.5 px-2 font-medium">$360.00</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2 text-gray-500">Breakfast (×3)</td>
                  <td className="text-right py-1.5 px-2 text-gray-500">3</td>
                  <td className="text-right py-1.5 px-2 text-gray-500">$12.00</td>
                  <td className="text-right py-1.5 px-2 text-gray-500">$36.00</td>
                </tr>
              </tbody>
            </table>
            <div className="flex justify-end mt-2 gap-8 pr-2">
              <div className="text-right space-y-0.5">
                <p className="text-gray-500">Subtotal</p>
                <p className="text-gray-500">Tax (10%)</p>
                <p className="font-bold" style={{ color: accent }}>Total Due</p>
              </div>
              <div className="text-right space-y-0.5">
                <p>$396.00</p>
                <p>$39.60</p>
                <p className="font-bold">$435.60</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 space-y-1.5">
            {(tmpl.bankName || tmpl.bankAccount) && (
              <div>
                <p className="text-[9px] uppercase font-semibold text-gray-400">Payment Details</p>
                <p className="text-gray-600">{tmpl.bankName}{tmpl.bankAccount ? ` · Acct: ${tmpl.bankAccount}` : ''}{tmpl.swiftCode ? ` · SWIFT: ${tmpl.swiftCode}` : ''}</p>
              </div>
            )}
            {tmpl.defaultTerms && <p className="text-gray-500 text-[9px]">{tmpl.defaultTerms}</p>}
            {tmpl.footerNote && (
              <p className="text-center text-[9px] font-medium" style={{ color: accent }}>{tmpl.footerNote}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  usePageTitle('Settings');
  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm">Property configuration, users, and tax rates</p>
        </div>
      </div>

      <Tabs defaultValue="property">
        <TabsList>
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="tax">Tax Rates</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Template</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="property"><PropertyTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="tax"><TaxRatesTab /></TabsContent>
        <TabsContent value="invoice"><InvoiceTemplateTab /></TabsContent>
        <TabsContent value="audit"><AuditLogTab /></TabsContent>
      </Tabs>
    </FadeIn>
  );
}
