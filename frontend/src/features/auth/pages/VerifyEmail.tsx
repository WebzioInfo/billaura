import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../../services/api';
import { useSessionStore } from '../stores/sessionStore';
import { BarChart3, Shield, Mail, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

const verifySchema = z.object({
  otp: z.string().length(6, { message: 'OTP must be exactly 6 digits' }),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setSession = useSessionStore((state) => state.setSession);
  const email = searchParams.get('email') || '';
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
  });

  const onSubmit = async (data: VerifyFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/verify-email', {
        email,
        otp: data.otp,
      });

      setSession(response.data.user, response.data.access_token);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/auth/onboard');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please check the OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center space-y-2">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Verify Email</h2>
        <p className="text-sm text-slate-500">Enter the verification code sent to your email</p>
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="truncate">Sent to: <strong>{email || 'your email address'}</strong></span>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0 animate-bounce" />
          <span>Verification successful! Setting up workspace...</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">6-Digit OTP Verification Code</label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              maxLength={6}
              {...register('otp')}
              placeholder="123456"
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm tracking-widest text-center font-mono font-bold transition-all"
            />
          </div>
          {errors.otp && <p className="text-xs text-red-500 mt-1">{errors.otp.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading || success}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-sm"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Confirming code...
            </>
          ) : (
            'Verify & Sign In'
          )}
        </button>
      </form>
    </div>
  );
};
