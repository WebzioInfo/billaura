import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Menu, X } from 'lucide-react';

export default function PublicLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Force light mode on public landing pages
    document.documentElement.classList.remove('dark');
  }, []);

  const navLinks = [
    { name: 'Features', path: '/features' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'About', path: '/about' },
    { name: 'Documentation', path: '/docs' },
    { name: 'Contact', path: '/contact' }
  ];

  return (
    <div className="min-h-screen bg-[#ffffff] dark:bg-[#070b13] text-[#111111] dark:text-slate-100 transition-colors duration-300 flex flex-col font-sans antialiased relative">
      
      {/* Floating Capsule Header (Inspired by Dynamic Island / Premium Hardware) */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[92%] sm:w-11/12 max-w-4xl z-50 transition-all duration-300">
        <header className="backdrop-blur-md bg-white/70 dark:bg-[#070b13]/70 border border-slate-200/50 dark:border-slate-800/80 rounded-full px-5 py-2.5 sm:px-6 sm:py-3 shadow-lg shadow-slate-200/10 dark:shadow-none flex items-center justify-between">
          
          {/* Logo and Tagline */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <img src="/logo.png" alt="Bill Aura" className="h-5 w-auto dark:hidden transition-transform duration-200 group-hover:scale-95" />
              <img src="/logo2.png" alt="Bill Aura" className="h-5 w-auto hidden dark:block transition-transform duration-200 group-hover:scale-95" />
              <span className="hidden sm:inline-block text-[9px] tracking-wider text-slate-400 dark:text-slate-500 font-bold uppercase font-mono border-l border-slate-200 dark:border-slate-800 pl-3">
                A Product by Webzio
              </span>
            </Link>
          </div>

          {/* Center Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-7 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`transition-colors duration-250 hover:text-black dark:hover:text-white ${
                    isActive ? 'text-black dark:text-white font-bold' : ''
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Action Elements */}
          <div className="hidden md:flex items-center gap-5">
            <Link
              to="/login"
              className="text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-black dark:hover:text-white transition-colors"
            >
              Sign In
            </Link>

            <Link
              to="/register"
              className="bg-black dark:bg-white text-white dark:text-black hover:bg-slate-900 dark:hover:bg-slate-100 px-4 py-1.5 rounded-full text-[10px] font-extrabold tracking-widest uppercase shadow-sm transition-all duration-200"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Icon */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-black dark:hover:text-white cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>

        </header>

        {/* Mobile Dropdown (Dynamic Island inspired slide out) */}
        {mobileMenuOpen && (
          <div className="mt-2 border border-slate-200/50 dark:border-slate-800/80 bg-white/95 dark:bg-[#070b13]/95 px-6 py-6 space-y-4 rounded-3xl shadow-xl backdrop-blur-md animate-fade-in text-left">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-xs font-bold uppercase tracking-wider text-slate-550 hover:text-black dark:hover:text-white transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 text-xs font-bold uppercase tracking-wider text-slate-550 hover:text-black dark:hover:text-white"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="bg-black dark:bg-white text-white dark:text-black text-center py-2 rounded-full text-xs font-bold tracking-wider uppercase shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Spacer (to clear the top-floating header) */}
      <main className="flex-grow pt-24 bg-[#ffffff] dark:bg-[#070b13]">
        <Outlet />
      </main>

      {/* Timeless Minimalist Footer */}
      <footer className="bg-[#fafafa] dark:bg-[#05080f] border-t border-slate-100 dark:border-slate-900 py-16 flex-shrink-0 text-left">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex flex-col">
                <span className="flex items-center gap-2">
                  <img src="/logo.png" alt="Bill Aura Logo" className="h-5 w-auto dark:hidden" />
                  <img src="/logo2.png" alt="Bill Aura Logo" className="h-5 w-auto hidden dark:block" />
                </span>
                <span className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold font-mono mt-1">
                  A Product by Webzio
                </span>
              </div>
              <p className="text-xs text-slate-450 dark:text-slate-400 leading-relaxed pr-4">
                Quiet enterprise accounting SaaS. Designed with extreme attention to detail and zero visual clutter.
              </p>
            </div>
            
            <div>
              <h3 className="text-[9px] font-bold uppercase tracking-widest text-[#111111] dark:text-white mb-4">Platform</h3>
              <ul className="space-y-3 text-xs">
                <li><Link to="/features" className="text-slate-550 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="text-slate-550 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">Pricing</Link></li>
                <li><Link to="/about" className="text-slate-550 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">About Us</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-[9px] font-bold uppercase tracking-widest text-[#111111] dark:text-white mb-4">Resources</h3>
              <ul className="space-y-3 text-xs">
                <li><Link to="/docs" className="text-slate-550 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">Documentation</Link></li>
                <li><Link to="/contact" className="text-slate-550 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors">Contact Support</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-[9px] font-bold uppercase tracking-widest text-[#111111] dark:text-white mb-4">Webzio</h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                Bill Aura is designed and developed by <a href="https://webzio.info" target="_blank" rel="noreferrer" className="text-black dark:text-white font-bold hover:underline">Webzio</a>.
              </p>
              <div className="inline-block px-2 py-0.5 rounded bg-slate-200/50 dark:bg-slate-900 border border-slate-350/20 dark:border-slate-800 text-[9px] text-slate-450 dark:text-slate-500 font-mono">
                Version: 4.0.0-enterprise
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200/40 dark:border-slate-900 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-450 dark:text-slate-500">
            <p>&copy; {new Date().getFullYear()} Bill Aura. All rights reserved. Powered by Webzio.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-black dark:hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-black dark:hover:text-white">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
