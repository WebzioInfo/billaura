import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../../services/api';
import { BarChart3, Lock, Shield, ArrowLeft, AlertCircle, Loader2, CheckCircle2, RotateCw } from 'lucide-react';

const resetSchema = z.object({
  otp: z.string().length(6, { message: 'Verification code must be exactly 6 digits' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
  confirmPassword: z.string().min(8, { message: 'Confirm password must match' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetFormValues = z.infer<typeof resetSchema>;

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: '', password: '', confirmPassword: '' }
  });

  const otpValue = watch('otp') || '';

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cooldown]);

  const onSubmit = async (data: ResetFormValues) => {
    setIsLoading(true);
    setError(null);
    setResendMessage(null);
    try {
      await api.post('/auth/reset-password', {
        email,
        otp: data.otp,
        password: data.password,
      });

      setSuccess('Password reset successful. Redirecting to login...');
      setTimeout(() => {
        navigate('/auth/login');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setError(null);
    setResendMessage(null);
    try {
      await api.post('/auth/forgot-password', { email });
      setCooldown(60);
      setResendMessage('A new 6-digit recovery code has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reset Password</h2>
        <p className="text-sm text-slate-500">Create a secure new password for your account</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resendMessage && (
        <div className="flex items-center gap-2 p-3 text-sm text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{resendMessage}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
            6-Digit Recovery Verification Code
          </label>
          
          <div className="relative flex justify-center gap-2.5 py-1">
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const char = otpValue[index] || '';
              const isFocused = otpValue.length === index;
              return (
                <div
                  key={index}
                  className={`w-11 h-12 rounded-lg border-2 flex items-center justify-center text-lg font-extrabold font-mono transition-all ${
                    char
                      ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700'
                      : isFocused
                      ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/10'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  {char}
                </div>
              );
            })}
            
            <input
              type="text"
              maxLength={6}
              autoFocus
              value={otpValue}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, ''); // Numbers only
                setValue('otp', val);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full text-center"
            />
          </div>
          {errors.otp && <p className="text-xs text-red-500 text-center mt-2">{errors.otp.message}</p>}
        </div>

        <div className="flex items-center justify-between text-xs mt-1 px-1 pb-2">
          <span className="text-slate-400">Didn't receive the code?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resendLoading}
            className={`font-semibold flex items-center gap-1.5 transition-colors ${
              cooldown > 0
                ? 'text-slate-400 cursor-not-allowed'
                : 'text-indigo-600 hover:text-indigo-500'
            }`}
          >
            {resendLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCw className="w-3.5 h-3.5" />
            )}
            {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              {...register('password')}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
            />
          </div>
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Confirm New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              {...register('confirmPassword')}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
            />
          </div>
          {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading || !!success || otpValue.length !== 6}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Resetting password...
            </>
          ) : (
            'Reset Password'
          )}
        </button>
      </form>

      <div className="text-center pt-2">
        <Link
          to="/auth/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Login
        </Link>
      </div>
    </div>
  );
};
