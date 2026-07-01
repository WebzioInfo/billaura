import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center space-y-6">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Bill Aura Logo" className="h-12 w-auto dark:hidden" />
          <img src="/logo2.png" alt="Bill Aura Logo" className="h-12 w-auto hidden dark:block" />
        </div>
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">404</h1>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Page Not Found</h2>
          <p className="text-slate-500">
            The page you are looking for doesn't exist or has been moved.
          </p>
        </div>
        <div className="pt-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors w-full"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
