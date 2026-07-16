import React from 'react';
import { useNavigate } from 'react-router-dom';

export const SupportPage = () => {
  const navigate = useNavigate();

  const channels = [
    {
      title: 'Platform Documentation',
      desc: 'Browse complete user manuals, API reference guidelines, and database connection setups.',
      action: 'Open Docs',
      path: '/docs'
    },
    {
      title: 'System Knowledge Base',
      desc: 'Quick answers to common questions about GST, multi-branch, and journal voucher entries.',
      action: 'Browse KB',
      path: '/login?redirect=help'
    },
    {
      title: 'Report a System Bug',
      desc: 'Encountered an exception or balance mismatch? Submit a ticket straight to Webzio engineering.',
      action: 'Open Ticket',
      external: true,
      path: 'mailto:support@webzio.info?subject=BillAura Bug Report'
    },
    {
      title: 'Feature Request',
      desc: 'Need a custom report or integration for your division? Share your specifications with us.',
      action: 'Request Feature',
      external: true,
      path: 'mailto:support@webzio.info?subject=BillAura Feature Request'
    },
    {
      title: 'Release Notes & History',
      desc: 'View details on latest system releases, schema migrations, and NestJS compliance updates.',
      action: 'View Changelog',
      badge: 'v4.0.0'
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#070b13] text-[#111111] dark:text-slate-100 py-24 px-6 sm:px-8 relative overflow-hidden transition-colors duration-300">
      
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-20 -z-10" />

      <div className="max-w-4xl mx-auto space-y-16 relative z-10 text-left">
        {/* Header Block */}
        <div className="space-y-4 border-b border-slate-100 dark:border-slate-900 pb-10">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase font-mono">
            Support Portal &bull; Powered by Webzio
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111111] dark:text-white leading-tight">
            Support Center
          </h1>
          <p className="text-sm sm:text-base text-slate-550 dark:text-slate-400 leading-relaxed font-medium max-w-2xl">
            Access documentation, submit bug tickets directly to Webzio engineering, request system features, or search the cloud knowledge base.
          </p>
        </div>

        {/* Support channels list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {channels.map((ch, idx) => (
            <div 
              key={idx}
              className="p-6 rounded-2xl border border-slate-150 dark:border-slate-900 bg-[#ffffff] dark:bg-[#070b13] hover:border-slate-350 dark:hover:border-slate-800 hover:shadow-sm transition-all duration-200 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 group-hover:text-black dark:group-hover:text-white transition-colors">{ch.title}</h3>
                  {ch.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[9px] font-bold font-mono">
                      {ch.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ch.desc}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-900/60">
                {ch.external ? (
                  <a 
                    href={ch.path}
                    className="inline-flex items-center gap-1 text-xs text-slate-900 dark:text-[#d4af37] font-semibold hover:underline"
                  >
                    {ch.action}
                    <span className="text-[10px] font-mono ml-0.5">&rarr;</span>
                  </a>
                ) : ch.path ? (
                  <button 
                    onClick={() => navigate(ch.path)}
                    className="inline-flex items-center gap-1 text-xs text-slate-900 dark:text-[#d4af37] font-semibold hover:underline cursor-pointer"
                  >
                    {ch.action}
                    <span className="text-[10px] font-mono ml-0.5">&rarr;</span>
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Managed system channel</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Contact Block */}
        <div className="p-8 rounded-2xl bg-slate-50/30 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-900 space-y-6">
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-200 uppercase tracking-wider font-mono">
              Direct Support Channels
            </h2>
            <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
              For enterprise clients requiring active Service Level Agreements (SLA), please contact Webzio Labs customer service line directly. Support tickets submitted via email are triaged within 2 hours.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-6 text-xs font-mono text-slate-650 dark:text-slate-450">
            <div>
              <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] block">Primary Technical Email</span>
              <a href="mailto:support@webzio.info" className="text-slate-800 dark:text-[#d4af37] font-semibold hover:underline">support@webzio.info</a>
            </div>
            <div className="sm:border-l sm:border-slate-200 dark:border-slate-800 sm:pl-6">
              <span className="text-slate-400 dark:text-slate-500 uppercase tracking-wider text-[9px] block">SLA Response Guarantee</span>
              <p className="text-slate-800 dark:text-slate-200 mt-1">2 Hours (Enterprise Contract)</p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-200/50 dark:border-slate-900 flex items-center gap-2 text-[9px] text-slate-450 dark:text-slate-500 font-mono">
            <span>System support services are operated and monitored under SLA agreement by Webzio Labs.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
