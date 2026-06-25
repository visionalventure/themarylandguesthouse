'use client';

import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { format } from 'date-fns';
import { Loader2, Plus, Shield, ClipboardList, Upload, X, ImageIcon, FileText, Building, CreditCard, AlignLeft, AlignCenter, AlignRight, Users, Star, Clock, BookOpen, ShoppingCart, Gift, Bell, CalendarDays, UserCheck, Moon, Search, Copy, Check, AlertTriangle, Mail, Send, Eye } from 'lucide-react';
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

const PROPERTY_TYPES = ['GUESTHOUSE', 'HOTEL', 'LODGE', 'RESORT', 'APARTMENT'];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const POLICY_DEFAULTS = {
  booking: {
    holdDurationMinutes: 60, defaultDepositPercent: 0, depositRequiredDaysOut: 0,
    freeCancellationHours: 24, cancellationRefundPercent: 100, allowOverbooking: false, overbookingPercent: 5,
  },
  nightAudit: { autoChargeEnabled: true, noShowGraceMinutes: 120, scheduledTime: '03:00' },
  attendance: {
    graceMinutes: 15, halfDayThresholdHours: 4, earlyDepartureTolerance: 15,
    highSeverityThresholdMinutes: 60, probationAlertDays: 30, contractAlertDays: 60,
  },
  accounting: { fiscalYearStartMonth: 1, defaultInvoiceDueDays: 30, invoicePrefix: 'INV', journalPrefix: 'JE' },
  procurement: { approvalThreshold: 0, defaultPaymentTermsDays: 30 },
  loyalty: {
    tierThresholds: { BRONZE: 0, SILVER: 500, GOLD: 2000, PLATINUM: 5000, VIP: 10000 },
    defaultEarningRate: 1,
  },
  notifications: {
    emailOnNewReservation: true, emailOnCheckOut: true, emailOnInvoiceCreated: true, emailOnPaymentReceived: true,
    inAppOnNewReservation: true, inAppOnPaymentReceived: true, inAppOnMaintenanceAlert: true, inAppOnLowInventory: true,
  },
};

function usePolicyConfig() {
  const propertyId = useAuthStore((s) => s.propertyId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ['policy-config', propertyId],
    queryFn: () => settingsApi.getPolicyConfig(propertyId).then(r => r.data),
    enabled: !!propertyId,
  });
  const save = useMutation({
    mutationFn: (patch: any) => settingsApi.updatePolicyConfig(propertyId, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy-config', propertyId] });
      toast({ title: 'Settings saved' });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to save' }),
  });
  return { data, isLoading, save, propertyId };
}

function PropertyTab() {
  const propertyId = useAuthStore((s) => s.propertyId);
  const setPropertyId = useAuthStore((s) => s.setPropertyId);
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDragOver, setLogoDragOver] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['settings-property', propertyId || tenantId],
    queryFn: () => settingsApi.getProperty(propertyId).then(r => r.data),
    enabled: !!(propertyId || tenantId),
  });

  // Auto-fix empty propertyId — saves the resolved property ID for the rest of the app
  useEffect(() => {
    if (data?.id && !propertyId) setPropertyId(data.id);
  }, [data?.id, propertyId, setPropertyId]);

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
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Upload failed';
      toast({ variant: 'destructive', title: 'Logo upload failed', description: msg });
    } finally {
      setLogoUploading(false);
    }
  };

  // If user pastes a base64 data URL into the text field, auto-upload it instead of
  // storing the raw base64 (which exceeds the API body limit and bloats the DB).
  const handleLogoPaste = async (raw: string) => {
    if (!raw.startsWith('data:')) return;
    try {
      const [header, b64] = raw.split(',');
      const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
      const bytes = atob(b64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      const file = new File([arr], 'logo.png', { type: mime });
      setValue('logoUrl', '', { shouldDirty: false });
      await handleLogoFile(file);
    } catch {
      toast({ variant: 'destructive', title: 'Could not process pasted image. Please use the upload button.' });
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
              <Label>City</Label>
              <Input {...register('city')} />
            </div>
            <div className="space-y-2">
              <Label>Country</Label>
              <Input {...register('country')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Property Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ''} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map(t => (
                        <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Star Rating</Label>
              <Controller
                name="starRating"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-1 h-9" role="group" aria-label="Star rating">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        aria-pressed={(field.value ?? 0) >= n}
                        onClick={() => field.onChange(n)}
                      >
                        <Star className={cn('w-5 h-5 transition-colors', (field.value ?? 0) >= n ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
                      </button>
                    ))}
                    {field.value && (
                      <button type="button" aria-label="Clear star rating" onClick={() => field.onChange(null)} className="ml-1 text-xs text-muted-foreground hover:text-foreground">Clear</button>
                    )}
                  </div>
                )}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Check-In Time</Label>
              <Input type="time" {...register('checkInTime')} />
            </div>
            <div className="space-y-2">
              <Label>Check-Out Time</Label>
              <Input type="time" {...register('checkOutTime')} />
            </div>
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
                  <Input
                    {...register('logoUrl')}
                    placeholder="https://example.com/logo.png"
                    className="text-xs"
                    onBlur={async (e) => {
                      const v = e.target.value.trim();
                      if (v.startsWith('data:')) await handleLogoPaste(v);
                    }}
                  />
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

function ManageUserDialog({ user, open, onClose, currentUser, queryClient, toast }: any) {
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [newEmail, setNewEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState(user.role);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isSelf = currentUser?.id === user.id;
  const canManageSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const targetIsSuperAdmin = user.role === 'SUPER_ADMIN';
  const restricted = targetIsSuperAdmin && !canManageSuperAdmin;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['settings-users'] });

  const nameMutation = useMutation({
    mutationFn: () => settingsApi.updateUser(user.id, { firstName, lastName }),
    onSuccess: () => { invalidate(); toast({ title: 'Name updated' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message || 'Failed to update name' }),
  });

  const emailMutation = useMutation({
    mutationFn: () => settingsApi.updateUserEmail(user.id, newEmail),
    onSuccess: () => { invalidate(); setNewEmail(''); toast({ title: 'Email updated' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message || 'Failed to update email' }),
  });

  const roleMutation = useMutation({
    mutationFn: () => settingsApi.updateUserRole(user.id, selectedRole),
    onSuccess: () => { invalidate(); toast({ title: 'Role updated' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message || 'Failed to update role' }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: () => settingsApi.resetUserPassword(user.id),
    onSuccess: (res: any) => { setTempPassword(res.data?.temporaryPassword ?? res.data?.data?.temporaryPassword); },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message || 'Failed to reset password' }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () => settingsApi.toggleUserActive(user.id),
    onSuccess: () => { invalidate(); onClose(); toast({ title: user.isActive ? 'User deactivated' : 'User reactivated' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message || 'Failed to update status' }),
  });

  const handleCopy = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage — {user.firstName} {user.lastName}</DialogTitle>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </DialogHeader>

        {restricted && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Only SUPER_ADMIN can manage other SUPER_ADMIN users. Actions are disabled.
          </div>
        )}

        {tempPassword && (
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
            <p className="text-sm font-medium">Temporary Password</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-background border px-3 py-2 text-sm font-mono tracking-wider">{tempPassword}</code>
              <Button size="icon" variant="outline" onClick={handleCopy} className="flex-shrink-0">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-amber-700 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
              Show this to the user now — it will not be displayed again. All existing sessions have been revoked.
            </p>
          </div>
        )}

        <div className="space-y-5 pt-1">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Edit Name</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">First Name</Label>
                <Input value={firstName} onChange={e => setFirstName(e.target.value)} disabled={restricted} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last Name</Label>
                <Input value={lastName} onChange={e => setLastName(e.target.value)} disabled={restricted} />
              </div>
            </div>
            <Button size="sm" variant="outline" disabled={restricted || nameMutation.isPending} onClick={() => nameMutation.mutate()}>
              {nameMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Save Name
            </Button>
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Update Email</p>
            <p className="text-xs text-amber-700">Changing email will affect login credentials.</p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="new@email.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                disabled={restricted}
              />
              <Button size="sm" variant="outline" disabled={restricted || !newEmail || emailMutation.isPending} onClick={() => emailMutation.mutate()}>
                {emailMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Update
              </Button>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reset Password</p>
            <p className="text-xs text-muted-foreground">Generates a temporary password. All active sessions for this user will be revoked.</p>
            <Button
              size="sm"
              variant="outline"
              disabled={restricted || resetPasswordMutation.isPending}
              onClick={() => { if (confirm(`Reset password for ${user.firstName} ${user.lastName}?`)) resetPasswordMutation.mutate(); }}
            >
              {resetPasswordMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
              Reset Password
            </Button>
          </div>

          {canManageSuperAdmin && (
            <>
              <div className="h-px bg-border" />
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</p>
                <div className="flex gap-2">
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" disabled={selectedRole === user.role || roleMutation.isPending} onClick={() => roleMutation.mutate()}>
                    {roleMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>
            </>
          )}

          {!isSelf && (
            <>
              <div className="h-px bg-border" />
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Status</p>
                {user.isActive ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={restricted || toggleActiveMutation.isPending}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => { if (confirm(`Deactivate ${user.firstName} ${user.lastName}? They will be logged out immediately.`)) toggleActiveMutation.mutate(); }}
                  >
                    {toggleActiveMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    Deactivate Account
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={restricted || toggleActiveMutation.isPending}
                    className="border-green-300 text-green-600 hover:bg-green-50"
                    onClick={() => toggleActiveMutation.mutate()}
                  >
                    {toggleActiveMutation.isPending && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    Reactivate Account
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UsersTab() {
  const propertyId = useAuthStore((s) => s.propertyId);
  const currentUser = useAuthStore((s) => s.user);
  const tenantId = currentUser?.tenantId;
  const [inviteOpen, setInviteOpen] = useState(false);
  const [managingUser, setManagingUser] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: usersData } = useQuery({
    queryKey: ['settings-users', tenantId],
    queryFn: () => settingsApi.getUsers(tenantId!).then(r => r.data),
    enabled: !!tenantId,
  });
  const allUsers: any[] = Array.isArray(usersData) ? usersData : (usersData?.data ?? []);

  const filteredUsers = allUsers.filter(u => {
    const matchSearch = !search || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? u.isActive : !u.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  const { register: inviteRegister, handleSubmit: handleInviteSubmit, watch: inviteWatch, setValue: setInviteValue, reset: resetInvite } = useForm({
    defaultValues: { email: '', firstName: '', lastName: '', role: 'FRONT_DESK' },
  });

  const inviteMutation = useMutation({
    mutationFn: (values: any) => settingsApi.inviteUser({ propertyId, tenantId, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users', tenantId] });
      toast({ title: 'User invited successfully' });
      setInviteOpen(false);
      resetInvite();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const formatLastLogin = (dt: string | null) => {
    if (!dt) return 'Never';
    try { return format(new Date(dt), 'MMM d, HH:mm'); } catch { return 'Never'; }
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground ml-auto" onClick={() => setInviteOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Invite User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Login</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">2FA</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={cn('border-b border-border hover:bg-muted/30 transition-opacity', !u.isActive && 'opacity-50')}>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                        {u.firstName} {u.lastName}
                        {u.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <Badge className={cn('text-xs border', ROLE_COLORS[u.role] ?? 'bg-muted text-muted-foreground border-border')}>
                          {u.role.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={cn('text-xs', u.isActive ? 'text-green-600 border-green-300' : 'text-muted-foreground')}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                        {formatLastLogin(u.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3">
                        {u.twoFactorEnabled
                          ? <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Enabled</Badge>
                          : <span className="text-muted-foreground text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() => setManagingUser(u)}
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {managingUser && (
        <ManageUserDialog
          user={managingUser}
          open={!!managingUser}
          onClose={() => setManagingUser(null)}
          currentUser={currentUser}
          queryClient={queryClient}
          toast={toast}
        />
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
          <form onSubmit={handleInviteSubmit(d => inviteMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input {...inviteRegister('firstName', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input {...inviteRegister('lastName', { required: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" {...inviteRegister('email', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteWatch('role')} onValueChange={v => setInviteValue('role', v)}>
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

function PrivacyTab() {
  const propertyId = useAuthStore((s) => s.propertyId);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: prop } = useQuery({
    queryKey: ['settings-property', propertyId],
    queryFn: () => settingsApi.getProperty(propertyId).then(r => r.data),
  });

  const [policy, setPolicy] = useState({
    requireIdentification: true,
    requireAddress: false,
    requirePhone: false,
    allowAnonymousWalkIn: false,
  });

  useEffect(() => {
    if (prop) {
      setPolicy({
        requireIdentification: prop.requireIdentification ?? true,
        requireAddress: prop.requireAddress ?? false,
        requirePhone: prop.requirePhone ?? false,
        allowAnonymousWalkIn: prop.allowAnonymousWalkIn ?? false,
      });
    }
  }, [prop]);

  const saveMutation = useMutation({
    mutationFn: () => settingsApi.updateProperty(propertyId, policy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-property', propertyId] });
      toast({ title: 'Privacy settings saved' });
    },
    onError: () => toast({ variant: 'destructive', title: 'Failed to save privacy settings' }),
  });

  const toggle = (key: keyof typeof policy) =>
    setPolicy(p => ({ ...p, [key]: !p[key] }));

  const rows: { key: keyof typeof policy; label: string; description: string }[] = [
    { key: 'requireIdentification', label: 'Require Identification', description: 'Guest must present a valid passport or national ID at check-in' },
    { key: 'requireAddress',        label: 'Require Address',        description: 'Collect guest home address during reservation or check-in' },
    { key: 'requirePhone',          label: 'Require Phone Number',   description: 'Phone number is mandatory for all guest profiles' },
    { key: 'allowAnonymousWalkIn',  label: 'Allow Anonymous Walk-In', description: 'Allow reservations without collecting guest personal information' },
  ];

  return (
    <div className="pt-6 space-y-6 max-w-2xl">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" /> Identification Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.map(({ key, label, description }) => (
            <div key={key} className="flex items-start gap-3">
              <input
                type="checkbox"
                id={key}
                checked={policy[key]}
                onChange={() => toggle(key)}
                className="mt-0.5 h-4 w-4 rounded border accent-primary cursor-pointer"
              />
              <label htmlFor={key} className="cursor-pointer">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </label>
            </div>
          ))}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="mt-2">
            {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Privacy Settings
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4" /> Guest Privacy Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {[
            { type: 'Standard', color: 'bg-slate-100 text-slate-700', desc: 'Default — full name and contact details visible to all authorized staff' },
            { type: 'Private',  color: 'bg-blue-100 text-blue-800',   desc: 'Name hidden from housekeeping and maintenance; alias shown instead' },
            { type: 'VIP',      color: 'bg-amber-100 text-amber-800', desc: 'Elevated service tier; full name visible to Front Desk and above' },
            { type: 'Confidential', color: 'bg-red-100 text-red-800', desc: 'Alias only — identity visible to Manager and above with audit trail' },
          ].map(({ type, color, desc }) => (
            <div key={type} className="flex items-start gap-3 py-1">
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0', color)}>{type}</span>
              <p className="text-muted-foreground text-xs">{desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DepartmentsTab() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = (user as any)?.role === 'SUPER_ADMIN';
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['settings-departments'],
    queryFn: () => settingsApi.getDepartments().then(r => r.data),
  });
  const departments: any[] = Array.isArray(data) ? data : (data?.data ?? []);

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: { name: '', code: '', description: '' },
  });

  const openCreate = () => {
    reset({ name: '', code: '', description: '' });
    setEditTarget(null);
    setCreateOpen(true);
  };

  const openEdit = (dept: any) => {
    reset({ name: dept.name, code: dept.code, description: dept.description ?? '' });
    setEditTarget(dept);
    setCreateOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      editTarget
        ? settingsApi.updateDepartment(editTarget.id, values)
        : settingsApi.createDepartment(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-departments'] });
      toast({ title: editTarget ? 'Department updated' : 'Department created' });
      setCreateOpen(false);
      reset();
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <div className="mt-4 space-y-3">
      {isSuperAdmin && (
        <div className="flex justify-end">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> New Department
          </Button>
        </div>
      )}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
          ) : departments.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No departments found.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Staff</th>
                  {isSuperAdmin && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody>
                {departments.map((dept: any) => (
                  <tr key={dept.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{dept.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs font-mono">{dept.code}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{dept.description ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{dept._count?.employees ?? 0}</td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => openEdit(dept)}>
                          Edit
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Department' : 'New Department'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
            <div className="space-y-2">
              <Label>Department Name *</Label>
              <Input placeholder="e.g. Front Desk & Reservations" {...register('name', { required: true })} />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                placeholder="e.g. FD"
                className="uppercase"
                {...register('code', { required: true })}
                onChange={e => setValue('code', e.target.value.toUpperCase())}
              />
              <p className="text-xs text-muted-foreground">Short unique identifier (3-6 characters). Cannot be changed after creation.</p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Optional description" {...register('description')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editTarget ? 'Save Changes' : 'Create Department'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PolicyRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function NumInput({ value, onChange, min, max, step, unit }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        className="w-24 text-sm"
        value={value}
        min={min}
        max={max}
        step={step ?? 1}
        onChange={e => {
          const raw = Number(e.target.value);
          if (isNaN(raw)) return;
          let v = raw;
          if (min !== undefined) v = Math.max(min, v);
          if (max !== undefined) v = Math.min(max, v);
          onChange(v);
        }}
      />
      {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
      )}
    >
      <span className={cn('inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
    </button>
  );
}

function BookingPolicyTab() {
  const { data, save } = usePolicyConfig();
  const [cfg, setCfg] = useState({ ...POLICY_DEFAULTS.booking });
  useEffect(() => { if (data?.booking) setCfg({ ...POLICY_DEFAULTS.booking, ...data.booking }); }, [data]);
  const up = (k: keyof typeof cfg, v: any) => setCfg(p => ({ ...p, [k]: v }));

  return (
    <div className="pt-6 max-w-2xl space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" />Hold & Deposit</CardTitle></CardHeader>
        <CardContent>
          <PolicyRow label="Hold Duration" description="How long a room hold lasts before auto-release">
            <NumInput value={cfg.holdDurationMinutes} onChange={v => up('holdDurationMinutes', v)} min={5} unit="min" />
          </PolicyRow>
          <PolicyRow label="Default Deposit %" description="Percent of total required as deposit at booking">
            <NumInput value={cfg.defaultDepositPercent} onChange={v => up('defaultDepositPercent', v)} min={0} max={100} unit="%" />
          </PolicyRow>
          <PolicyRow label="Deposit Required When" description="Require deposit only if arrival is ≥N days away (0 = always)">
            <NumInput value={cfg.depositRequiredDaysOut} onChange={v => up('depositRequiredDaysOut', v)} min={0} unit="days out" />
          </PolicyRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4" />Cancellation Policy</CardTitle></CardHeader>
        <CardContent>
          <PolicyRow label="Free Cancellation Window" description="Guests can cancel free within this many hours of check-in">
            <NumInput value={cfg.freeCancellationHours} onChange={v => up('freeCancellationHours', v)} min={0} unit="hrs" />
          </PolicyRow>
          <PolicyRow label="Refund After Window %" description="Refund percentage once the free cancellation window has passed">
            <NumInput value={cfg.cancellationRefundPercent} onChange={v => up('cancellationRefundPercent', v)} min={0} max={100} unit="%" />
          </PolicyRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Building className="w-4 h-4" />Capacity</CardTitle></CardHeader>
        <CardContent>
          <PolicyRow label="Allow Overbooking" description="Accept reservations beyond 100% room capacity">
            <Toggle checked={cfg.allowOverbooking} onChange={v => up('allowOverbooking', v)} label="Allow Overbooking" />
          </PolicyRow>
          {cfg.allowOverbooking && (
            <PolicyRow label="Overbooking Buffer %" description="How far over capacity to accept (e.g. 5%)">
              <NumInput value={cfg.overbookingPercent} onChange={v => up('overbookingPercent', v)} min={1} max={50} unit="%" />
            </PolicyRow>
          )}
        </CardContent>
      </Card>

      <Button onClick={() => save.mutate({ booking: cfg })} disabled={save.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
        {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Booking Policy
      </Button>
    </div>
  );
}

function NightAuditSettingsTab() {
  const { data, save } = usePolicyConfig();
  const [cfg, setCfg] = useState({ ...POLICY_DEFAULTS.nightAudit });
  useEffect(() => { if (data?.nightAudit) setCfg({ ...POLICY_DEFAULTS.nightAudit, ...data.nightAudit }); }, [data]);
  const up = (k: keyof typeof cfg, v: any) => setCfg(p => ({ ...p, [k]: v }));

  return (
    <div className="pt-6 max-w-2xl space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Moon className="w-4 h-4" />Night Audit Configuration</CardTitle></CardHeader>
        <CardContent>
          <PolicyRow label="Auto-Charge Room Rates" description="Automatically post nightly room charges when audit runs">
            <Toggle checked={cfg.autoChargeEnabled} onChange={v => up('autoChargeEnabled', v)} label="Auto-Charge Room Rates" />
          </PolicyRow>
          <PolicyRow label="No-Show Grace Period" description="Minutes after scheduled check-in before marking reservation as no-show">
            <NumInput value={cfg.noShowGraceMinutes} onChange={v => up('noShowGraceMinutes', v)} min={0} unit="min" />
          </PolicyRow>
          <PolicyRow label="Scheduled Audit Time" description="Reference time for nightly audit (audit is manually triggered)">
            <Input type="time" value={cfg.scheduledTime} onChange={e => up('scheduledTime', e.target.value)} className="w-32 text-sm" />
          </PolicyRow>
        </CardContent>
      </Card>
      <Button onClick={() => save.mutate({ nightAudit: cfg })} disabled={save.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
        {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Night Audit Settings
      </Button>
    </div>
  );
}

function AttendancePolicyTab() {
  const { data, save } = usePolicyConfig();
  const [cfg, setCfg] = useState({ ...POLICY_DEFAULTS.attendance });
  useEffect(() => { if (data?.attendance) setCfg({ ...POLICY_DEFAULTS.attendance, ...data.attendance }); }, [data]);
  const up = (k: keyof typeof cfg, v: any) => setCfg(p => ({ ...p, [k]: v }));

  return (
    <div className="pt-6 max-w-2xl space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><UserCheck className="w-4 h-4" />Clock-In / Clock-Out Tolerances</CardTitle></CardHeader>
        <CardContent>
          <PolicyRow label="Late Clock-In Grace" description="Not marked late if clocking in within this many minutes of shift start">
            <NumInput value={cfg.graceMinutes} onChange={v => up('graceMinutes', v)} min={0} unit="min" />
          </PolicyRow>
          <PolicyRow label="Early Departure Tolerance" description="Not flagged as early departure within this many minutes of shift end">
            <NumInput value={cfg.earlyDepartureTolerance} onChange={v => up('earlyDepartureTolerance', v)} min={0} unit="min" />
          </PolicyRow>
          <PolicyRow label="Half-Day Threshold" description="Shifts shorter than this count as a half-day attendance record">
            <NumInput value={cfg.halfDayThresholdHours} onChange={v => up('halfDayThresholdHours', v)} min={1} max={12} unit="hrs" />
          </PolicyRow>
          <PolicyRow label="High-Severity Late Threshold" description="Lateness beyond this is classified as HIGH severity anomaly">
            <NumInput value={cfg.highSeverityThresholdMinutes} onChange={v => up('highSeverityThresholdMinutes', v)} min={15} unit="min" />
          </PolicyRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="w-4 h-4" />Contract Alerts</CardTitle></CardHeader>
        <CardContent>
          <PolicyRow label="Probation Expiry Alert" description="Alert HR managers this many days before an employee's probation period ends">
            <NumInput value={cfg.probationAlertDays} onChange={v => up('probationAlertDays', v)} min={1} unit="days" />
          </PolicyRow>
          <PolicyRow label="Contract Expiry Alert" description="Alert HR managers this many days before an employee's contract ends">
            <NumInput value={cfg.contractAlertDays} onChange={v => up('contractAlertDays', v)} min={1} unit="days" />
          </PolicyRow>
        </CardContent>
      </Card>

      <Button onClick={() => save.mutate({ attendance: cfg })} disabled={save.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
        {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Attendance Policy
      </Button>
    </div>
  );
}

function AccountingDefaultsTab() {
  const { data, save } = usePolicyConfig();
  const [cfg, setCfg] = useState({ ...POLICY_DEFAULTS.accounting });
  useEffect(() => { if (data?.accounting) setCfg({ ...POLICY_DEFAULTS.accounting, ...data.accounting }); }, [data]);
  const up = (k: keyof typeof cfg, v: any) => setCfg(p => ({ ...p, [k]: v }));

  const year = new Date().getFullYear();
  const invoicePreview = `${cfg.invoicePrefix || 'INV'}-${year}-0001`;
  const journalPreview = `${cfg.journalPrefix || 'JE'}-${year}-00001`;

  return (
    <div className="pt-6 max-w-2xl space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" />Fiscal Year & Payment Terms</CardTitle></CardHeader>
        <CardContent>
          <PolicyRow label="Fiscal Year Start" description="Month when the accounting year begins">
            <Select value={String(cfg.fiscalYearStartMonth)} onValueChange={v => up('fiscalYearStartMonth', Number(v))}>
              <SelectTrigger className="w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </PolicyRow>
          <PolicyRow label="Default Invoice Due Days" description="Days from invoice date until payment is due">
            <NumInput value={cfg.defaultInvoiceDueDays} onChange={v => up('defaultInvoiceDueDays', v)} min={1} unit="days" />
          </PolicyRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Document Numbering</CardTitle></CardHeader>
        <CardContent>
          <PolicyRow label="Invoice Prefix" description={`Preview: ${invoicePreview}`}>
            <Input value={cfg.invoicePrefix} onChange={e => up('invoicePrefix', e.target.value.toUpperCase().slice(0, 6))} className="w-24 text-sm font-mono uppercase" maxLength={6} />
          </PolicyRow>
          <PolicyRow label="Journal Entry Prefix" description={`Preview: ${journalPreview}`}>
            <Input value={cfg.journalPrefix} onChange={e => up('journalPrefix', e.target.value.toUpperCase().slice(0, 6))} className="w-24 text-sm font-mono uppercase" maxLength={6} />
          </PolicyRow>
        </CardContent>
      </Card>

      <Button onClick={() => save.mutate({ accounting: cfg })} disabled={save.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
        {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Accounting Defaults
      </Button>
    </div>
  );
}

function ProcurementPolicyTab() {
  const { data, save } = usePolicyConfig();
  const [cfg, setCfg] = useState({ ...POLICY_DEFAULTS.procurement });
  useEffect(() => { if (data?.procurement) setCfg({ ...POLICY_DEFAULTS.procurement, ...data.procurement }); }, [data]);
  const up = (k: keyof typeof cfg, v: any) => setCfg(p => ({ ...p, [k]: v }));

  return (
    <div className="pt-6 max-w-2xl space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShoppingCart className="w-4 h-4" />Approval & Payment Rules</CardTitle></CardHeader>
        <CardContent>
          <PolicyRow label="PO Approval Threshold" description="Purchase orders above this amount require explicit manager approval (0 = approval always optional)">
            <NumInput value={cfg.approvalThreshold} onChange={v => up('approvalThreshold', v)} min={0} unit="USD" />
          </PolicyRow>
          <PolicyRow label="Default Supplier Payment Terms" description="Default number of days from bill date until supplier payment is due">
            <NumInput value={cfg.defaultPaymentTermsDays} onChange={v => up('defaultPaymentTermsDays', v)} min={1} unit="days" />
          </PolicyRow>
        </CardContent>
      </Card>
      <Button onClick={() => save.mutate({ procurement: cfg })} disabled={save.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
        {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Procurement Policy
      </Button>
    </div>
  );
}

const TIER_COLORS: Record<string, string> = {
  BRONZE: 'bg-amber-800/20 text-amber-700 border-amber-700/30',
  SILVER: 'bg-slate-100 text-slate-600 border-slate-300',
  GOLD:   'bg-amber-100 text-amber-700 border-amber-400',
  PLATINUM: 'bg-sky-100 text-sky-700 border-sky-400',
  VIP:    'bg-violet-100 text-violet-700 border-violet-400',
};

function LoyaltyConfigTab() {
  const { data, save } = usePolicyConfig();
  const [cfg, setCfg] = useState({ ...POLICY_DEFAULTS.loyalty });
  useEffect(() => {
    if (data?.loyalty) {
      setCfg({
        ...POLICY_DEFAULTS.loyalty,
        ...data.loyalty,
        tierThresholds: { ...POLICY_DEFAULTS.loyalty.tierThresholds, ...(data.loyalty.tierThresholds ?? {}) },
      });
    }
  }, [data]);

  const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'VIP'] as const;

  return (
    <div className="pt-6 max-w-2xl space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gift className="w-4 h-4" />Tier Point Thresholds</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">Minimum cumulative points required to reach each tier.</p>
          <div className="grid grid-cols-5 gap-2 mb-2">
            {tiers.map(t => (
              <div key={t} className={cn('text-center text-[10px] font-semibold px-1 py-0.5 rounded border', TIER_COLORS[t])}>{t.charAt(0) + t.slice(1).toLowerCase()}</div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2">
            {tiers.map(t => (
              <Input
                key={t}
                type="number"
                min={0}
                className="text-center text-sm"
                value={cfg.tierThresholds[t]}
                onChange={e => setCfg(p => ({ ...p, tierThresholds: { ...p.tierThresholds, [t]: Number(e.target.value) } }))}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Earning Rate</CardTitle></CardHeader>
        <CardContent>
          <PolicyRow label="Points per $1 spent" description="Base number of loyalty points earned per dollar of guest spending">
            <NumInput value={cfg.defaultEarningRate} onChange={v => setCfg(p => ({ ...p, defaultEarningRate: v }))} min={0} step={0.1} unit="pts/$1" />
          </PolicyRow>
        </CardContent>
      </Card>

      <Button onClick={() => save.mutate({ loyalty: cfg })} disabled={save.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
        {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Loyalty Config
      </Button>
    </div>
  );
}

function NotificationsTab() {
  const { data, save } = usePolicyConfig();
  const [cfg, setCfg] = useState({ ...POLICY_DEFAULTS.notifications });
  useEffect(() => { if (data?.notifications) setCfg({ ...POLICY_DEFAULTS.notifications, ...data.notifications }); }, [data]);
  const up = (k: keyof typeof cfg) => setCfg(p => ({ ...p, [k]: !p[k] }));

  const emailRows: { key: keyof typeof POLICY_DEFAULTS.notifications; label: string }[] = [
    { key: 'emailOnNewReservation', label: 'New Reservation Received' },
    { key: 'emailOnCheckOut',       label: 'Check-Out / Stay Summary' },
    { key: 'emailOnInvoiceCreated', label: 'Invoice Created' },
    { key: 'emailOnPaymentReceived', label: 'Payment Received' },
  ];
  const inAppRows: { key: keyof typeof POLICY_DEFAULTS.notifications; label: string }[] = [
    { key: 'inAppOnNewReservation',    label: 'New Reservation Received' },
    { key: 'inAppOnPaymentReceived',   label: 'Payment Received' },
    { key: 'inAppOnMaintenanceAlert',  label: 'Maintenance Alert' },
    { key: 'inAppOnLowInventory',      label: 'Low Inventory Alert' },
  ];

  return (
    <div className="pt-6 max-w-2xl space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bell className="w-4 h-4" />Email Notifications</CardTitle></CardHeader>
        <CardContent>
          {emailRows.map(({ key, label }) => (
            <PolicyRow key={key} label={label}>
              <Toggle checked={cfg[key]} onChange={() => up(key)} label={label} />
            </PolicyRow>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">In-App Notifications</CardTitle></CardHeader>
        <CardContent>
          {inAppRows.map(({ key, label }) => (
            <PolicyRow key={key} label={label}>
              <Toggle checked={cfg[key]} onChange={() => up(key)} label={label} />
            </PolicyRow>
          ))}
        </CardContent>
      </Card>

      <Button onClick={() => save.mutate({ notifications: cfg })} disabled={save.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
        {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Notification Settings
      </Button>
    </div>
  );
}

const EMAIL_TEMPLATE_PREVIEWS = [
  {
    key: 'booking',
    label: 'Booking Confirmation',
    description: 'Sent to guests when a reservation is confirmed',
    html: (prop: string) => `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
      <div style="background:#D4AF37;padding:20px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:#fff;margin:0;font-size:24px">${prop}</h1></div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 8px 8px">
        <h2 style="color:#1f2937">Booking Confirmed!</h2><p>Dear John Doe,</p><p>Your reservation has been confirmed.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr style="background:#f9fafb"><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Reservation No.</td><td style="padding:12px;border:1px solid #e5e7eb">RES-2024-001</td></tr>
          <tr><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Check-In</td><td style="padding:12px;border:1px solid #e5e7eb">Jun 25, 2026</td></tr>
          <tr style="background:#f9fafb"><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Check-Out</td><td style="padding:12px;border:1px solid #e5e7eb">Jun 28, 2026</td></tr>
          <tr><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Room(s)</td><td style="padding:12px;border:1px solid #e5e7eb">101, 102</td></tr>
        </table>
        <p>Warm regards,<br><strong>${prop}</strong></p>
      </div></body></html>`,
  },
  {
    key: 'invoice',
    label: 'Invoice',
    description: 'Sent when an invoice is issued to a guest',
    html: (prop: string) => `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
      <div style="background:#D4AF37;padding:20px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:#fff;margin:0;font-size:24px">${prop}</h1></div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 8px 8px">
        <h2 style="color:#1f2937">Invoice INV-2024-001</h2><p>Dear John Doe,</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr style="background:#f9fafb"><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Invoice No.</td><td style="padding:12px;border:1px solid #e5e7eb">INV-2024-001</td></tr>
          <tr><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Amount Due</td><td style="padding:12px;border:1px solid #e5e7eb;font-size:18px;color:#D4AF37"><strong>$435.60</strong></td></tr>
          <tr style="background:#f9fafb"><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Due Date</td><td style="padding:12px;border:1px solid #e5e7eb">Jul 1, 2026</td></tr>
        </table>
        <p>Thank you,<br><strong>${prop}</strong></p>
      </div></body></html>`,
  },
  {
    key: 'payment',
    label: 'Payment Receipt',
    description: 'Sent when a payment is received',
    html: (prop: string) => `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
      <div style="background:#16a34a;padding:20px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:#fff;margin:0;font-size:24px">Payment Received</h1></div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 8px 8px">
        <p>Dear John Doe,</p><p>We have received your payment.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr style="background:#f9fafb"><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Amount Paid</td><td style="padding:12px;border:1px solid #e5e7eb;color:#16a34a;font-size:18px"><strong>$435.60</strong></td></tr>
          <tr><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Payment Method</td><td style="padding:12px;border:1px solid #e5e7eb">Credit Card</td></tr>
          <tr style="background:#f9fafb"><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Balance Remaining</td><td style="padding:12px;border:1px solid #e5e7eb">$0.00</td></tr>
        </table>
        <p>Thank you,<br><strong>${prop}</strong></p>
      </div></body></html>`,
  },
  {
    key: 'password',
    label: 'Password Reset',
    description: 'Sent when a user requests a password reset',
    html: (prop: string) => `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
      <div style="background:#1f2937;padding:20px;text-align:center;border-radius:8px 8px 0 0"><h1 style="color:#fff;margin:0;font-size:24px">${prop}</h1></div>
      <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 8px 8px">
        <h2 style="color:#1f2937">Password Reset Request</h2><p>Hi John,</p>
        <p>We received a request to reset your password. Click the button below:</p>
        <div style="text-align:center;margin:30px 0">
          <a href="#" style="background:#D4AF37;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block">Reset Password</a>
        </div>
        <p style="color:#6b7280;font-size:14px">This link expires in 1 hour.</p>
      </div></body></html>`,
  },
];

function EmailTab() {
  const propertyId = useAuthStore((s) => s.propertyId);
  const tenantId = useAuthStore((s) => s.user?.tenantId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [testEmail, setTestEmail] = useState('');
  const [previewTemplate, setPreviewTemplate] = useState<(typeof EMAIL_TEMPLATE_PREVIEWS)[0] | null>(null);

  const { data: emailCfgRaw, isLoading } = useQuery({
    queryKey: ['settings-email', propertyId],
    queryFn: () => settingsApi.getEmailConfig(propertyId).then(r => r.data),
    enabled: !!propertyId,
  });
  const emailCfg = emailCfgRaw?.data ?? emailCfgRaw ?? {};

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { fromName: '', fromEmail: '', replyTo: '' },
  });
  useEffect(() => {
    if (emailCfg.fromName !== undefined) reset({ fromName: emailCfg.fromName, fromEmail: emailCfg.fromEmail, replyTo: emailCfg.replyTo ?? '' });
  }, [emailCfg.fromName, emailCfg.fromEmail, emailCfg.replyTo, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateEmailConfig(propertyId, values),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings-email', propertyId] }); toast({ title: 'Email settings saved' }); },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message || 'Failed to save' }),
  });

  const testMutation = useMutation({
    mutationFn: () => settingsApi.sendTestEmail(propertyId, testEmail),
    onSuccess: () => toast({ title: `Test email sent to ${testEmail}` }),
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message || 'Failed to send test email' }),
  });

  if (isLoading) return <div className="py-12 text-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>;

  return (
    <div className="mt-4 space-y-4 max-w-2xl">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mail className="w-4 h-4" /> System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {emailCfg.active ? (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">✓ Email Active — Resend</Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">⚠ Email Disabled — RESEND_API_KEY not configured</Badge>
            )}
            <span className="text-xs text-muted-foreground">Transport: Resend</span>
          </div>
          {!emailCfg.active && (
            <p className="mt-2 text-xs text-muted-foreground">Set the <code className="bg-muted px-1 rounded">RESEND_API_KEY</code> environment variable on the API server to enable email delivery.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Mail className="w-4 h-4" />Sender Identity</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(d => saveMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">From Name</Label>
                <Input {...register('fromName')} placeholder="Maryland Guesthouse" />
                <p className="text-xs text-muted-foreground">Displayed as the sender name in recipients' email clients.</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">From Email</Label>
                <Input type="email" {...register('fromEmail')} placeholder="noreply@marylandguesthouse.com" />
                <p className="text-xs text-muted-foreground">Must be a verified sender domain in Resend.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reply-To (optional)</Label>
              <Input type="email" {...register('replyTo')} placeholder="info@marylandguesthouse.com" />
              <p className="text-xs text-muted-foreground">Where replies from guests will land. Leave blank to use the From address.</p>
            </div>
            <Button type="submit" disabled={saveMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Sender Settings
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Send className="w-4 h-4" />Test Email</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Send a test email to verify your configuration is working correctly.</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="outline"
              disabled={!testEmail || testMutation.isPending}
              onClick={() => testMutation.mutate()}
            >
              {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-1" />}
              Send Test
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4" />Email Templates</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Preview the built-in email templates sent by the system.</p>
          <div className="grid grid-cols-2 gap-3">
            {EMAIL_TEMPLATE_PREVIEWS.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setPreviewTemplate(t)}
                className="text-left p-3 rounded-md border border-border hover:bg-muted/40 transition-colors space-y-1"
              >
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
                <span className="text-xs text-primary">Preview →</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {previewTemplate && (
        <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{previewTemplate.label} — Template Preview</DialogTitle>
              <p className="text-xs text-muted-foreground">{previewTemplate.description}</p>
            </DialogHeader>
            <div className="rounded-md border border-border overflow-hidden">
              <iframe
                srcDoc={previewTemplate.html(emailCfg.fromName || 'Maryland Guesthouse')}
                className="w-full h-[480px]"
                sandbox="allow-same-origin"
                title={`${previewTemplate.label} template preview`}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
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
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="property">Property</TabsTrigger>
          <TabsTrigger value="users">Users & Roles</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="tax">Tax Rates</TabsTrigger>
          <TabsTrigger value="invoice">Invoice Template</TabsTrigger>
          <TabsTrigger value="booking">Booking Policy</TabsTrigger>
          <TabsTrigger value="nightaudit">Night Audit</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="accounting">Accounting</TabsTrigger>
          <TabsTrigger value="procurement">Procurement</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>
        <TabsContent value="property"><PropertyTab /></TabsContent>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="departments"><DepartmentsTab /></TabsContent>
        <TabsContent value="tax"><TaxRatesTab /></TabsContent>
        <TabsContent value="invoice"><InvoiceTemplateTab /></TabsContent>
        <TabsContent value="booking"><BookingPolicyTab /></TabsContent>
        <TabsContent value="nightaudit"><NightAuditSettingsTab /></TabsContent>
        <TabsContent value="attendance"><AttendancePolicyTab /></TabsContent>
        <TabsContent value="accounting"><AccountingDefaultsTab /></TabsContent>
        <TabsContent value="procurement"><ProcurementPolicyTab /></TabsContent>
        <TabsContent value="loyalty"><LoyaltyConfigTab /></TabsContent>
        <TabsContent value="notifications"><NotificationsTab /></TabsContent>
        <TabsContent value="email"><EmailTab /></TabsContent>
        <TabsContent value="audit"><AuditLogTab /></TabsContent>
        <TabsContent value="privacy"><PrivacyTab /></TabsContent>
      </Tabs>
    </FadeIn>
  );
}
