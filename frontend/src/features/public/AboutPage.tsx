import React from 'react';

export const AboutPage = () => {
  const techStack = [
    { name: 'React', desc: 'Component architecture with fast virtual DOM rendering.' },
    { name: 'TypeScript', desc: 'Type-safe codebase ensuring strict business data models.' },
    { name: 'NestJS', desc: 'Modular backend framework enforcing structural reliability.' },
    { name: 'Prisma', desc: 'Type-safe Node.js ORM to handle complex database schemes.' },
    { name: 'MySQL', desc: 'Enterprise relational database with high transaction speed.' },
    { name: 'TanStack Query', desc: 'Asynchronous state synchronization with automatic caching.' },
    { name: 'Tailwind CSS', desc: 'Utility CSS framework for pixel-perfect design control.' },
    { name: 'Axios', desc: 'HTTP client for standardized enterprise API requests.' }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#070b13] text-[#111111] dark:text-slate-100 py-24 px-6 sm:px-8 relative overflow-hidden transition-colors duration-300">
      
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px] opacity-40 dark:opacity-20 -z-10" />

      <div className="max-w-4xl mx-auto space-y-16 relative z-10 text-left">
        {/* Header Block */}
        <div className="space-y-4 border-b border-slate-100 dark:border-slate-900 pb-10">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold tracking-widest uppercase font-mono">
            Platform Identity &bull; Webzio Engine
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-[#111111] dark:text-white leading-tight">
            About Bill Aura
          </h1>
          <p className="text-sm sm:text-base text-slate-550 dark:text-slate-400 leading-relaxed font-medium">
            Bill Aura is a secure, multi-tenant enterprise Accounting & ERP platform designed and maintained by <strong className="text-slate-800 dark:text-white">Webzio</strong>.
          </p>
        </div>

        {/* Corporate Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-550 font-mono">
              Corporate Vision
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              We believe that enterprise financial applications should not be complex, slow, or difficult to manage. Our mission is to combine the transactional robustness of traditional ERP systems with the speed and elegance of modern single-page applications. 
            </p>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              By working closely with accounting divisions and compliance agencies, Webzio engineered Bill Aura to guarantee strict security, absolute data privacy, and sub-second reporting generation.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-slate-150 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-950/20 space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider font-mono">Partnership Guidelines</h3>
            <ul className="space-y-3 text-xs text-slate-550 dark:text-slate-400">
              <li className="flex gap-2">
                <span className="text-[#a08020] dark:text-[#d4af37] font-bold">&bull;</span>
                <span>Active 24/7 Service Level Agreements for financial databases.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#a08020] dark:text-[#d4af37] font-bold">&bull;</span>
                <span>Fully isolated multi-tenant architecture.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#a08020] dark:text-[#d4af37] font-bold">&bull;</span>
                <span>Bi-weekly updates and security patch integrations.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Technology Stack */}
        <div className="space-y-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono border-b border-slate-100 dark:border-slate-900 pb-3">
            Enterprise Technology Stack
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bill Aura is constructed using only industry-standard open source frameworks, avoiding proprietary dependencies and ensuring lifetime maintainability.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {techStack.map((tech, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-slate-150 dark:border-slate-900 bg-white dark:bg-[#070b13] space-y-1">
                <h4 className="font-bold text-xs text-[#111111] dark:text-slate-200 font-mono">{tech.name}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* System & Licensing Details */}
        <div className="p-6 rounded-2xl bg-slate-50/30 dark:bg-slate-950/20 border border-slate-150 dark:border-slate-900 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 font-mono">
            System License & Release Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <p className="text-slate-400 dark:text-slate-550 uppercase tracking-wider text-[9px]">Product Code</p>
              <p className="text-slate-800 dark:text-slate-200 mt-1 font-bold">BILLAURA-ENT-4.0</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-550 uppercase tracking-wider text-[9px]">Development Team</p>
              <p className="text-[#a08020] dark:text-[#d4af37] mt-1 font-bold">Webzio Labs Inc.</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-550 uppercase tracking-wider text-[9px]">Active License</p>
              <p className="text-slate-800 dark:text-slate-200 mt-1 font-bold">SaaS Enterprise</p>
            </div>
            <div>
              <p className="text-slate-400 dark:text-slate-550 uppercase tracking-wider text-[9px]">DB Engine</p>
              <p className="text-slate-800 dark:text-slate-200 mt-1 font-bold">MySQL InnoDB</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-relaxed border-t border-slate-200/50 dark:border-slate-900 pt-3">
            &copy; {new Date().getFullYear()} Webzio Labs. Bill Aura is a registered trademark of Webzio Labs. All rights reserved. Reverse engineering, database schema extraction, or unauthorized distribution of this application context is strictly prohibited under federal compliance statutes.
          </p>
        </div>
      </div>
    </div>
  );
};
