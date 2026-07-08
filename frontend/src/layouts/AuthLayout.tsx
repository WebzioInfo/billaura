import React from 'react';
import { Outlet, Link } from 'react-router-dom';


export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-8 bg-background premium-glow relative overflow-hidden transition-colors duration-300">
      {/* Background visual accents */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-accent opacity-[0.02] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-accent opacity-[0.02] rounded-full blur-[120px] pointer-events-none" />

      <div className="mx-auto w-full max-w-md z-10">
        <div className="flex justify-center items-center gap-2">
          <Link to="/" className="flex items-center justify-center">
            <img src="/logo.png" alt="Bill Aura" className="h-12 max-w-full w-auto object-contain dark:hidden" />
            <img src="/logo2.png" alt="Bill Aura" className="h-12 max-w-full w-auto object-contain hidden dark:block" />
          </Link>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground uppercase tracking-widest font-semibold whitespace-nowrap">
          Cloud Accounting SaaS Platform
        </p>
      </div>

      <div className="mt-8 mx-auto w-full max-w-md min-w-0 z-10">
        <div className="glass-panel w-full min-w-0 rounded-xl shadow-xl border border-border bg-white px-6 py-8 sm:px-8 space-y-6">
          <Outlet />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Secure Tenant Isolation &bull; SSO Enabled &bull; AES-256 Encrypted
        </p>
      </div>
    </div>
  );
}

