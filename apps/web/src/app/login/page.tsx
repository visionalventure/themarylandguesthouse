'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Hotel, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/store/auth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  totpCode: z.string().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await login(data.email, data.password, data.totpCode);
      if (result?.requiresTwoFactor) {
        setRequiresTwoFactor(true);
      } else {
        router.push('/dashboard');
      }
    } catch {
      // error handled in store
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#17142A] via-[#28253B] to-[#17142A] flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(144, 121, 233, 0.3) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(141, 209, 182, 0.25) 0%, transparent 50%)`,
        }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#9079E9] rounded-2xl shadow-lg mb-4">
            <Hotel className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Maryland Guesthouse</h1>
          <p className="text-[#9079E9] mt-1">ERP Management Platform</p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-white">Welcome back</CardTitle>
            <CardDescription className="text-slate-400">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-300">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@marylandguesthouse.com"
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-[#9079E9]"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-red-400 text-sm">{form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-[#9079E9] pr-10"
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-red-400 text-sm">{form.formState.errors.password.message}</p>
                )}
              </div>

              {requiresTwoFactor && (
                <div className="space-y-2">
                  <Label htmlFor="totpCode" className="text-slate-300">2FA Code</Label>
                  <Input
                    id="totpCode"
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-[#9079E9] text-center tracking-widest text-lg"
                    {...form.register('totpCode')}
                  />
                  <p className="text-slate-400 text-sm">Enter the 6-digit code from your authenticator app</p>
                </div>
              )}

              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-xs text-[#9079E9] hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-[#9079E9] hover:bg-[#7c68d4] text-white font-semibold py-2.5"
                disabled={isLoading}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="mt-4 p-3 rounded-lg bg-[#9079E9]/10 border border-[#9079E9]/20">
              <p className="text-slate-400 text-xs text-center">
                Demo: <span className="text-[#9079E9]">admin@marylandguesthouse.com</span> / <span className="text-[#9079E9]">Admin@123!</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-slate-500 text-sm mt-6">
          © 2026 Maryland Guesthouse ERP. All rights reserved.
        </p>
      </div>
    </div>
  );
}
