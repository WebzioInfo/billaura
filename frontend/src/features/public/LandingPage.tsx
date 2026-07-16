import React from 'react';
import { useNavigate } from 'react-router-dom';

export const LandingPage = () => {
  const navigate = useNavigate();

  const capabilities = [
    { title: 'Double-Entry General Ledger', desc: 'Maintain perfect debit and credit balance control automatically. Complete chart of accounts validation with real-time trial balance sheets.' },
    { title: 'Tax & GST Compliance', desc: 'Automatic local GST calculation, custom invoice mapping, and audit-ready tax report generation built directly into the ledger workflow.' },
    { title: 'Multi-Branch Density', desc: 'Isolate or consolidate departments, branch operations, and warehouse facilities under a unified organizational umbrella.' },
    { title: 'Activity Audit Records', desc: 'A secure audit trail records every data change, ensuring complete corporate compliance and security verification.' }
  ];

  const whyChooseUs = [
    { title: 'Sub-100ms Database Sync', desc: 'Vastly optimized NestJS backends process transactions instantly without pipeline blocking.' },
    { title: 'Absolute Data Separation', desc: 'Strict SaaS row-level isolation guarantees complete privacy for every tenant.' },
    { title: 'Spacious Financial View', desc: 'Layout density designed for screen efficiency, offering data depth without visual fatigue.' }
  ];

  const businessValues = [
    { title: 'Fast', desc: 'Accelerate monthly closings with batch templates.' },
    { title: 'Secure', desc: 'AES-256 state encryption guarding data.' },
    { title: 'Multi Company', desc: 'Manage unlimited subsidiaries easily.' },
    { title: 'Audit Ready', desc: 'Export standardized statements instantly.' }
  ];

  return (
    <div className="bg-[#ffffff] dark:bg-[#070b13] text-[#111111] dark:text-slate-100 font-sans selection:bg-amber-100 dark:selection:bg-[#d4af37]/25 selection:text-black dark:selection:text-white transition-colors duration-300">
      
      {/* Hero Section - Confident, Spacious, and Minimal */}
      <section className="pt-24 pb-16 px-6 sm:px-8 max-w-5xl mx-auto text-left space-y-10">
        
        {/* Webzio Creator Tagline */}
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-bold font-mono">
          Bill Aura &bull; A Product by Webzio
        </div>

        {/* Large Typography Hero Heading */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#111111] dark:text-white leading-[1.08] max-w-4xl">
          Enterprise Accounting <br />
          for Scaling Businesses.
        </h1>

        {/* Supporting description with excellent reading line height */}
        <p className="text-sm sm:text-base md:text-lg text-slate-550 dark:text-slate-400 max-w-2xl leading-relaxed">
          Manage Accounting, Sales, Purchases, Inventory, Customers, Vendors, Banking, GST, and Financial Reports from one secure, multi-tenant platform. Engineered by Webzio.
        </p>

        {/* Handcrafted Signature Buttons */}
        <div className="flex flex-col sm:flex-row items-start justify-start gap-4">
          <button
            onClick={() => navigate('/register')}
            className="w-full sm:w-auto bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#a08020] dark:hover:bg-[#d4af37] hover:text-white dark:hover:text-black px-8 py-3 rounded-full text-xs font-bold tracking-widest uppercase shadow-sm transition-all duration-200"
          >
            Get Started
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto bg-transparent text-[#111111] dark:text-slate-200 border border-slate-350 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 px-8 py-3 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-200"
          >
            Watch Demo
          </button>
        </div>
      </section>

      {/* Product Preview - Realistic, Raw Application Layout */}
      <section className="py-12 px-6 sm:px-8 max-w-5xl mx-auto text-left">
        <div className="rounded-3xl border border-slate-200/60 dark:border-slate-800 bg-[#faf9f6] dark:bg-slate-950/20 p-2">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0b0f19] overflow-hidden p-6 sm:p-8 space-y-6">
            
            {/* Header controls of our mockup */}
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-[#141b2b] pb-4">
              <div>
                <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">General Ledger Console</h3>
                <p className="text-[11px] text-slate-450 dark:text-slate-500 font-mono mt-0.5">Tenant Isolation: Active (Webzio Enterprise Node)</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] uppercase tracking-wider font-bold font-mono text-slate-400 dark:text-slate-500">Live Sync: 32ms</span>
              </div>
            </div>

            {/* Simulated Accounting Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-slate-650 dark:text-slate-350">
                <thead>
                  <tr className="text-slate-400 dark:text-slate-550 border-b border-slate-100 dark:border-[#141b2b]">
                    <th className="pb-3 text-left font-bold uppercase tracking-wider text-[10px]">Account ID</th>
                    <th className="pb-3 text-left font-bold uppercase tracking-wider text-[10px]">Description</th>
                    <th className="pb-3 text-right font-bold uppercase tracking-wider text-[10px]">Debit ($)</th>
                    <th className="pb-3 text-right font-bold uppercase tracking-wider text-[10px]">Credit ($)</th>
                    <th className="pb-3 text-right font-bold uppercase tracking-wider text-[10px]">Net Balance ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#141b2b]">
                  {[
                    { code: '1010-00', desc: 'Cash & Operations Reserves', dr: '184,900.00', cr: '0.00', bal: '184,900.00 Dr' },
                    { code: '1200-00', desc: 'Trade Receivables (Accounts Receivable)', dr: '592,400.00', cr: '40,000.00', bal: '552,400.00 Dr' },
                    { code: '2100-00', desc: 'Trade Payables (Accounts Payable)', dr: '12,000.00', cr: '124,500.00', bal: '112,500.00 Cr' },
                    { code: '4000-00', desc: 'Operating SaaS Revenue', dr: '0.00', cr: '624,800.00', bal: '624,800.00 Cr' }
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="py-3 font-semibold text-slate-800 dark:text-slate-300">{row.code}</td>
                      <td className="py-3 text-slate-700 dark:text-slate-200">{row.desc}</td>
                      <td className="py-3 text-right">{row.dr}</td>
                      <td className="py-3 text-right">{row.cr}</td>
                      <td className="py-3 text-right font-bold text-slate-800 dark:text-white">{row.bal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Console Footer Status */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-4 border-t border-slate-100 dark:border-[#141b2b] text-[10px] text-slate-450 dark:text-slate-500 font-mono">
              <span>Automatic Trial Balance audit: Passed successfully</span>
              <span>AES-256 encrypted row lock verified</span>
            </div>

          </div>
        </div>
      </section>

      {/* Core Capabilities - Staggered/Asymmetrical Editorial Layout */}
      <section className="py-24 px-6 sm:px-8 max-w-5xl mx-auto space-y-16 text-left">
        <div className="max-w-2xl">
          <span className="text-[10px] text-[#a08020] dark:text-[#d4af37] font-semibold tracking-widest uppercase font-mono">
            Platform Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] dark:text-white mt-3">
            Constructed for financial precision.
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
            Every module is designed to eliminate processing friction and deliver compliant, sub-100ms database reads.
          </p>
        </div>

        {/* Asymmetric capabilities layout (breaks repetitive grids) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
          <div className="space-y-10">
            {capabilities.slice(0, 2).map((cap, i) => (
              <div key={i} className="space-y-2 border-l border-slate-200 dark:border-slate-800 pl-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">{cap.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
          <div className="space-y-10 md:translate-y-6">
            {capabilities.slice(2, 4).map((cap, i) => (
              <div key={i} className="space-y-2 border-l border-slate-200 dark:border-slate-800 pl-6">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">{cap.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Bill Aura - Staggered comparative analysis */}
      <section className="bg-[#fafafa] dark:bg-slate-950/20 border-y border-slate-100 dark:border-slate-900/60 py-24 px-6 sm:px-8">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
          {whyChooseUs.map((item, idx) => (
            <div key={idx} className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200 font-mono tracking-tight uppercase text-[#a08020] dark:text-[#d4af37]">
                0{idx + 1} &bull; {item.title}
              </h4>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Business Value Points */}
      <section className="py-24 px-6 sm:px-8 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-left">
          {businessValues.map((val, idx) => (
            <div key={idx} className="space-y-2">
              <div className="w-1.5 h-1.5 bg-[#a08020] dark:bg-[#d4af37] rounded-full" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-200">{val.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{val.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About Webzio (Extremely Minimal) */}
      <section className="bg-[#fafafa] dark:bg-slate-950/10 border-t border-slate-100 dark:border-slate-900 py-16 px-6 sm:px-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-left">
          <div className="space-y-2 max-w-xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-550 font-mono">Webzio Collaboration</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bill Aura is proudly designed and developed under secure compliance specifications by <strong>Webzio</strong>. We handle transaction isolation controls, SQL integrations, and multi-tenant databases.
            </p>
          </div>
          <button
            onClick={() => navigate('/about')}
            className="flex-none text-xs font-bold text-[#111111] dark:text-white flex items-center gap-1 hover:underline cursor-pointer group"
          >
            Learn More
            <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </button>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-24 px-6 sm:px-8 text-center max-w-2xl mx-auto space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111111] dark:text-white">
          Start using Bill Aura today.
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
          Establish your secure multi-tenant accounting node and prepare financial audits in less than five minutes.
        </p>
        <div className="pt-4">
          <button
            onClick={() => navigate('/register')}
            className="bg-[#111111] dark:bg-white text-white dark:text-[#111111] hover:bg-[#a08020] dark:hover:bg-[#d4af37] hover:text-white dark:hover:text-black px-8 py-3 rounded-full text-xs font-bold tracking-widest uppercase shadow-sm transition-all duration-200"
          >
            Get Started
          </button>
        </div>
      </section>

    </div>
  );
};
