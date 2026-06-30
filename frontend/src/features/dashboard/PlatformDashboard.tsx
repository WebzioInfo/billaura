import React from 'react';
import { Users, Activity, Shield, ArrowUpRight } from 'lucide-react';

export function PlatformDashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Operations</h1>
          <p className="text-sm text-slate-500 mt-1">Super Admin global view of all SaaS tenants.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Active Tenants</h3>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">124</p>
          <div className="flex items-center gap-2 mt-2 text-sm text-emerald-600 font-medium">
            <ArrowUpRight className="w-4 h-4" />
            <span>+12% this month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Platform MRR</h3>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">$45,200</p>
          <div className="flex items-center gap-2 mt-2 text-sm text-emerald-600 font-medium">
            <ArrowUpRight className="w-4 h-4" />
            <span>+8.4% this month</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">System Health</h3>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">99.99%</p>
          <div className="flex items-center gap-2 mt-2 text-sm text-slate-500 font-medium">
            <span>All systems operational</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Tenant Activity</h3>
        <div className="text-center py-12 text-slate-500">
          Activity log will appear here
        </div>
      </div>
    </div>
  );
}
