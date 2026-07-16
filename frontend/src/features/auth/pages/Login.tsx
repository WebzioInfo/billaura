import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { authService } from '../../../services/api';
import { useSessionStore } from '../stores/sessionStore';
import { TokenService } from '../../../services/auth/TokenService';
import { Lock, Mail, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login = () => {
  const navigate = useNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    console.groupCollapsed('[LOGIN FLOW]');
    console.log('Login button clicked');
    console.log('Validation passed');
    console.log('Calling login()');
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(data);
      TokenService.setTokens(response.access_token, response.refresh_token);
      setSession(response.user, response.access_token);
      
      if (response.user.globalRole === 'SUPER_ADMIN') {
        navigate('/platform/dashboard');
      } else {
        const step = response.user.onboardingStep;
        if (step === 'COMPLETED') {
          navigate('/dashboard');
        } else {
          navigate('/onboard');
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to authenticate';
      setError(msg);
      
      if (msg.includes('verify your OTP')) {
        setTimeout(() => {
          navigate(`/verify-email?email=${encodeURIComponent(data.email)}`);
        }, 1500);
      }
    } finally {
      setIsLoading(false);
      console.groupEnd();
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <Link to="/" className="inline-block transition-transform hover:scale-95">
          <img src="/logo.png" alt="Bill Aura" className="h-7 w-auto object-contain" />
        </Link>
        <div className="space-y-0.5">
          <h2 className="text-xs font-bold tracking-[0.2em] text-slate-800 uppercase font-mono">
            Enterprise Accounting & ERP
          </h2>
          <p className="text-[10px] text-slate-400 italic">
            A Product by Webzio
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-3 text-xs text-red-650 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Input Form Fields */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-left">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              {...register('email')}
              placeholder="name@company.com"
              className="h-10 w-full min-w-0 pl-10 pr-4 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#a08020]/30 focus:border-[#a08020] text-sm text-slate-900 transition-all placeholder:text-slate-400"
            />
          </div>
          {errors.email && <p className="text-xs text-red-600 mt-1 font-semibold">{errors.email.message}</p>}
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              Password
            </label>
            <Link 
              to="/forgot-password" 
              className="text-xs font-semibold text-slate-500 hover:text-black transition-colors"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="••••••••"
              className="h-10 w-full min-w-0 pl-10 pr-10 bg-slate-50/70 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#a08020]/30 focus:border-[#a08020] text-sm text-slate-900 transition-all placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-600 mt-1 font-semibold">{errors.password.message}</p>}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-slate-600 select-none cursor-pointer">
            <input 
              type="checkbox" 
              {...register('rememberMe')}
              className="rounded border-slate-350 text-black focus:ring-slate-500/20" 
            />
            Remember this device
          </label>
        </div>

        {/* Handcrafted Signature Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="h-10 w-full min-w-0 bg-[#111111] hover:bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs tracking-widest uppercase hover:border-[#a08020] hover:border hover:shadow-md hover:shadow-slate-100 duration-200"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
              Verifying Credentials...
            </>
          ) : (
            'Sign In to Dashboard'
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
        Don't have an accounting account?{' '}
        <Link 
          to="/register" 
          className="font-bold text-slate-900 hover:underline ml-1"
        >
          Create account
        </Link>
      </div>
    </div>
  );
};
