import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, Menu, X } from 'lucide-react';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const coreModules = [
    { code: '01', name: 'Sales & Invoicing', desc: 'Itemized billing, tax breakdown, PDF dispatch & customer balances' },
    { code: '02', name: 'Purchases & Bills', desc: 'Vendor orders, procurement bills, input tax credit & disbursals' },
    { code: '03', name: 'General Ledger', desc: 'Strict double-entry journal vouchers, chart of accounts & trial balance' },
    { code: '04', name: 'Inventory & Stock', desc: 'Multi-warehouse locations, SKU tracking, valuations & adjustments' },
    { code: '05', name: 'Cash & Banking', desc: 'Real-time account balances, contra transfers & bank reconciliation' },
    { code: '06', name: 'Tax Compliance', desc: 'Automated GST computations, GSTR-1, GSTR-3B audit-ready summaries' }
  ];

  return (
    <div className="min-h-[100svh] lg:h-[100svh] lg:max-h-[100svh] lg:overflow-hidden flex flex-col justify-between bg-[#FAFAF7] dark:bg-[#0A0D12] text-[#121316] dark:text-[#ECEEEF] selection:bg-[#EAE7DC] dark:selection:bg-[#1E2430] selection:text-[#121316] dark:selection:text-white transition-colors duration-200 antialiased">
      
      {/* ─────────────────────────────────────────────────────────────
          1. COMPACT FLOATING ISLAND NAVBAR (fit-content, centered)
      ─────────────────────────────────────────────────────────────── */}
      <div className="flex-none pt-2.5 sm:pt-3.5 px-4 w-full flex justify-center z-30">
        <header className="w-full sm:w-auto max-w-full sm:max-w-fit mx-auto h-13 sm:h-14 px-3.5 sm:px-5 rounded-2xl sm:rounded-full border border-[#E2E2D8] dark:border-[#1E2330] bg-[#FAFAF7]/95 dark:bg-[#0E1117]/95 shadow-[0_4px_18px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_22px_-4px_rgba(0,0,0,0.5)] backdrop-blur-md flex items-center justify-between sm:justify-start gap-3 sm:gap-5">
          
          {/* Left: Webzio Technology Brand + Bill Aura Relationship */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <a
              href="https://www.webziotech.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 focus:outline-none"
              title="Webzio Technology — Official Website"
            >
              {/* Studio Emblem */}
              <span className="w-6.5 h-6.5 rounded-md bg-[#121316] dark:bg-white text-white dark:text-[#0A0D12] flex items-center justify-center font-bold text-[11px] tracking-tight group-hover:bg-[#8F6827] dark:group-hover:bg-[#C99C48] transition-colors shadow-2xs">
                W
              </span>
              <div className="flex flex-col text-left">
                <span className="text-[12px] font-extrabold tracking-[0.14em] uppercase text-[#121316] dark:text-white leading-none">
                  Webzio
                </span>
                <span className="text-[8px] font-bold tracking-[0.22em] uppercase text-[#8F6827] dark:text-[#C99C48] leading-tight mt-0.5">
                  Technology
                </span>
              </div>
            </a>

            {/* Hairline Divider */}
            <span className="h-3.5 w-px bg-[#DCDCD4] dark:bg-[#202530] hidden sm:block" />

            {/* Compact Relationship Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#F0EFEA] dark:bg-[#151922] border border-[#E1E0D7] dark:border-[#222735]">
              <span className="text-[9px] uppercase tracking-wider font-bold text-[#6D717D] dark:text-[#8D929E]">
                Creator of
              </span>
              <Link
                to="/"
                className="inline-flex items-center gap-1 text-[10.5px] font-bold text-[#121316] dark:text-white hover:text-[#8F6827] dark:hover:text-[#C99C48] transition-colors"
              >
                <img src="/logo.png" alt="Bill Aura Logo" className="h-3 w-auto dark:hidden" />
                <img src="/logo2.png" alt="Bill Aura Logo" className="h-3 w-auto hidden dark:block" />
                <span className="tracking-tight">Bill Aura</span>
              </Link>
            </div>
          </div>

          <span className="h-3.5 w-px bg-[#EAEAE2] dark:bg-[#1E232E] hidden md:block" />

          {/* Right: Navigation Links & Actions (compact spacing) */}
          <div className="hidden md:flex items-center gap-4 sm:gap-5">
            <nav className="flex items-center gap-4 text-[11px] font-medium tracking-wide text-[#646873] dark:text-[#9499A5]">
              <Link to="/features" className="hover:text-[#121316] dark:hover:text-white transition-colors">
                Features
              </Link>
              <Link to="/pricing" className="hover:text-[#121316] dark:hover:text-white transition-colors">
                Pricing
              </Link>
              <Link to="/about" className="hover:text-[#121316] dark:hover:text-white transition-colors">
                About
              </Link>
              <Link to="/contact" className="hover:text-[#121316] dark:hover:text-white transition-colors">
                Contact
              </Link>
            </nav>

            <span className="h-3.5 w-px bg-[#EAEAE2] dark:bg-[#1E232E]" />

            <div className="flex items-center gap-2 sm:gap-2.5">
              <button
                onClick={() => navigate('/login')}
                className="px-2 py-1 text-[11px] font-semibold text-[#3D404A] dark:text-[#9DA2AF] hover:text-[#121316] dark:hover:text-white transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-3.5 py-1.5 rounded-full text-[10.5px] font-semibold tracking-wide bg-[#121316] hover:bg-[#252830] text-white dark:bg-white dark:text-[#0A0D12] dark:hover:bg-[#E2E4E8] transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
              >
                Get Started
              </button>
            </div>
          </div>

          {/* Mobile Nav Controls */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="text-[11px] font-semibold text-[#3D404A] dark:text-[#9DA2AF] px-1"
            >
              Sign In
            </button>
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="p-1 text-[#5F636E] dark:text-[#9499A5] hover:text-[#121316] dark:hover:text-white"
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </header>

        {/* Mobile Dropdown Panel */}
        {mobileNavOpen && (
          <div className="md:hidden mt-2 w-full max-w-sm mx-auto border border-[#E2E2D8] dark:border-[#1E2330] bg-[#FAFAF7] dark:bg-[#0E1117] px-5 py-4 rounded-2xl shadow-lg space-y-2.5 text-left animate-in fade-in duration-150">
            <Link
              to="/features"
              onClick={() => setMobileNavOpen(false)}
              className="block text-xs font-medium text-[#4B4E57] dark:text-[#A0A4B0] py-1"
            >
              Features
            </Link>
            <Link
              to="/pricing"
              onClick={() => setMobileNavOpen(false)}
              className="block text-xs font-medium text-[#4B4E57] dark:text-[#A0A4B0] py-1"
            >
              Pricing
            </Link>
            <Link
              to="/about"
              onClick={() => setMobileNavOpen(false)}
              className="block text-xs font-medium text-[#4B4E57] dark:text-[#A0A4B0] py-1"
            >
              About Webzio & Bill Aura
            </Link>
            <Link
              to="/contact"
              onClick={() => setMobileNavOpen(false)}
              className="block text-xs font-medium text-[#4B4E57] dark:text-[#A0A4B0] py-1"
            >
              Contact
            </Link>
            <div className="pt-2 border-t border-[#E2E2D8] dark:border-[#1E2330] flex items-center justify-between">
              <a
                href="https://www.webziotech.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-[#8F6827] dark:text-[#C99C48] flex items-center gap-1"
              >
                webziotech.in <ArrowUpRight className="w-3 h-3" />
              </a>
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate('/register');
                }}
                className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold bg-[#121316] text-white dark:bg-white dark:text-[#0A0D12]"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. MAIN STAGE — Balanced Split Composition
      ─────────────────────────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 flex items-center py-4 lg:py-0">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-0 items-stretch">
          
          {/* ────────── LEFT: WEBZIO TECHNOLOGY (The Company) ────────── */}
          <section className="lg:col-span-5 flex flex-col justify-center text-left lg:pr-14 lg:border-r border-[#EAEAE2] dark:border-[#181C26] space-y-5">
            
            {/* Studio Marker */}
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#8F6827] dark:bg-[#C99C48]" />
              <span className="text-[10px] uppercase tracking-[0.24em] font-semibold text-[#8F6827] dark:text-[#C99C48] font-mono">
                Technology Studio
              </span>
            </div>

            {/* Restrained Headline */}
            <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-medium tracking-tight text-[#121316] dark:text-white leading-[1.2]">
              Technology built around the way businesses work.
            </h2>

            {/* Concise Studio Narrative */}
            <p className="text-xs sm:text-[13px] text-[#555864] dark:text-[#9A9EA9] leading-relaxed max-w-md">
              Webzio Technology is an independent software studio. We design and engineer focused digital products that remove operational friction—crafted for teams that value architectural precision and long-term stability.
            </p>

            {/* Core Architectural Tenets */}
            <div className="space-y-3 pt-2 border-t border-[#EAEAE2] dark:border-[#181C26]">
              <div className="flex items-start gap-3">
                <span className="text-[10px] font-mono font-semibold text-[#7E828E] dark:text-[#7A7F8D] mt-0.5">
                  01
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-[#181A20] dark:text-[#ECEEEF]">
                    Multi-Tenant SaaS Isolation
                  </h4>
                  <p className="text-[11px] text-[#696D79] dark:text-[#8D929E] leading-normal mt-0.5">
                    Strict organizational row-scoping and tenant data isolation verified across every query.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[10px] font-mono font-semibold text-[#7E828E] dark:text-[#7A7F8D] mt-0.5">
                  02
                </span>
                <div>
                  <h4 className="text-xs font-semibold text-[#181A20] dark:text-[#ECEEEF]">
                    Real Ledger Integrity
                  </h4>
                  <p className="text-[11px] text-[#696D79] dark:text-[#8D929E] leading-normal mt-0.5">
                    No simulated metrics or dummy data. Real double-entry debits, credits, and live trial balances.
                  </p>
                </div>
              </div>
            </div>

            {/* Official Webzio Studio Link */}
            <div className="pt-1">
              <a
                href="https://www.webziotech.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-1.5 text-xs font-medium text-[#121316] dark:text-white hover:text-[#8F6827] dark:hover:text-[#C99C48] transition-colors"
              >
                <span>Visit official company site at webziotech.in</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#8F6827] dark:text-[#C99C48] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>

          </section>

          {/* ────────── RIGHT: BILL AURA (The Product) ────────── */}
          <section className="lg:col-span-7 flex flex-col justify-center text-left lg:pl-14 space-y-5">
            
            {/* Prominent Webzio Branding Badge near Product Identity (Opens https://www.webziotech.in/) */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <a
                href="https://www.webziotech.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F0EFEA] dark:bg-[#141822] border border-[#E1E0D7] dark:border-[#222736] hover:border-[#8F6827]/40 dark:hover:border-[#C99C48]/40 transition-colors cursor-pointer shadow-2xs"
                title="Webzio Technology — Company Behind Bill Aura"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#8F6827] dark:bg-[#C99C48]" />
                <span className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-[#121316] dark:text-white font-mono group-hover:text-[#8F6827] dark:hover:text-[#C99C48] transition-colors">
                  A Product by Webzio Technology
                </span>
                <ArrowUpRight className="w-3 h-3 text-[#8F6827] dark:text-[#C99C48] opacity-70 group-hover:opacity-100 transition-opacity" />
              </a>
              <span className="text-[11px] font-mono font-medium text-[#7A7E8B] dark:text-[#8D929E]">
                &bull; Bill Aura ERP
              </span>
            </div>

            {/* Primary Headline Direction: "The business, in balance." */}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-semibold tracking-tight text-[#121316] dark:text-white leading-[1.12]">
                The business, in balance.
              </h1>
              {/* Supporting Copy */}
              <p className="text-xs sm:text-[14px] text-[#555864] dark:text-[#9A9EA9] leading-relaxed mt-2.5 max-w-xl">
                Billing, accounting, GST, inventory, and financial reporting, brought together in one workspace.
              </p>
            </div>

            {/* Verifiable Module Architecture Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {coreModules.map((item) => (
                <div
                  key={item.code}
                  className="p-3 rounded-md border border-[#EAEAE2] dark:border-[#181C26] bg-white/70 dark:bg-[#101319]/50 hover:border-[#D0D0C6] dark:hover:border-[#262B37] transition-colors"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#8F6827] dark:text-[#C99C48] font-semibold">
                    <span>{item.code}</span>
                  </div>
                  <div className="text-[11px] font-semibold text-[#181A20] dark:text-[#ECEEEF] tracking-tight mt-1">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-[#6E7380] dark:text-[#8D929E] mt-0.5 leading-snug">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Clear Actions */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1.5">
              <button
                onClick={() => navigate('/register')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold tracking-wide bg-[#121316] hover:bg-[#252830] text-white dark:bg-white dark:text-[#0A0D12] dark:hover:bg-[#E2E4E8] transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold text-[#121316] dark:text-white border border-[#DCDCD4] dark:border-[#202530] hover:bg-[#F2F2ED] dark:hover:bg-[#141720] transition-colors cursor-pointer"
              >
                Sign In to Workspace
              </button>

              <Link
                to="/features"
                className="text-xs font-medium text-[#646873] dark:text-[#9499A5] hover:text-[#121316] dark:hover:text-white transition-colors ml-1"
              >
                Explore Modules &rarr;
              </Link>
            </div>

          </section>

        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          3. BOTTOM EDGE — Minimal Signature (Within the same viewport)
      ─────────────────────────────────────────────────────────────── */}
      <footer className="flex-none h-12 sm:h-14 border-t border-[#EAEAE2] dark:border-[#181C26] px-6 sm:px-10 lg:px-16 flex items-center justify-between text-[11px] text-[#747884] dark:text-[#7A7F8D] bg-[#FAFAF7]/90 dark:bg-[#0A0D12]/90">
        
        {/* Left Signature */}
        <div className="flex items-center gap-2">
          <a
            href="https://www.webziotech.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#181A20] dark:text-white hover:text-[#8F6827] dark:hover:text-[#C99C48] transition-colors"
          >
            Webzio Technology
          </a>
          <span className="text-stone-300 dark:text-stone-700">&bull;</span>
          <span>Creators of Bill Aura</span>
          <span className="text-stone-300 dark:text-stone-700">&bull;</span>
          <span className="font-mono text-[10px]">&copy; 2026</span>
        </div>

        {/* Right Contact & Support */}
        <div className="flex items-center gap-5">
          <a
            href="mailto:support@webzio.info"
            className="hover:text-[#121316] dark:hover:text-white transition-colors"
          >
            support@webzio.info
          </a>
          <span className="hidden sm:inline-block text-stone-300 dark:text-stone-700">&bull;</span>
          <Link
            to="/docs"
            className="hidden sm:inline-block hover:text-[#121316] dark:hover:text-white transition-colors"
          >
            Documentation
          </Link>
          <span className="hidden sm:inline-block text-stone-300 dark:text-stone-700">&bull;</span>
          <Link
            to="/about"
            className="hidden sm:inline-block hover:text-[#121316] dark:hover:text-white transition-colors"
          >
            About
          </Link>
        </div>

      </footer>

    </div>
  );
};
