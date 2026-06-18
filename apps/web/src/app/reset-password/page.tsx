'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Hotel, Loader2, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = async (data: FormData) => {
    setError('');
    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }
    try {
      await api.post('/v1/auth/reset-password', { token, newPassword: data.password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Invalid or expired reset link.');
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4 py-4">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
        <p className="text-sm text-muted-foreground">Missing reset token. Please request a new reset link.</p>
        <Button asChild variant="outline"><Link href="/forgot-password">Request new link</Link></Button>
      </div>
    );
  }

  return success ? (
    <div className="text-center space-y-4 py-4">
      <div className="flex justify-center">
        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">Password reset successfully. Redirecting to login…</p>
    </div>
  ) : (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="password">New password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            className="pr-9"
            placeholder="Min. 8 characters"
            {...form.register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {form.formState.errors.password && (
          <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type={showPassword ? 'text' : 'password'}
          placeholder="Re-enter password"
          {...form.register('confirm')}
        />
        {form.formState.errors.confirm && (
          <p className="text-xs text-destructive">{form.formState.errors.confirm.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Reset password
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Hotel className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Maryland Guesthouse</span>
          </div>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>Enter and confirm your new password.</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="py-8 text-center text-muted-foreground text-sm">Loading…</div>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
