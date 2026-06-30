import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Landmark } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-background premium-glow relative overflow-hidden transition-colors duration-300">
      {/* Background visual accents */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-accent opacity-[0.02] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-accent opacity-[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center gap-2">
          <Link to="/" className="flex items-center gap-2 font-bold text-2xl tracking-tight">
            <Landmark className="w-8 h-8 text-accent" />
            <span>Bill <span className="text-accent">Aura</span></span>
          </Link>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground uppercase tracking-widest font-semibold">
          Cloud Accounting SaaS Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4">
        <div className="glass-panel py-8 px-6 sm:px-10 rounded-2xl shadow-premium border border-border">
          <Outlet />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Secure Tenant Isolation &bull; SSO Enabled &bull; AES-256 Encrypted
        </p>
      </div>
    </div>
  );
}
