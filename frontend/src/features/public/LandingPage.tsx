import React from 'react';
import { ArrowRight, BarChart3, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation */}
      <nav className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">Bill Aura</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
            <a href="#docs" className="hover:text-indigo-600 transition-colors">Documentation</a>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/auth/login')}
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/auth/register')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full text-sm font-medium transition-colors shadow-sm shadow-indigo-600/20"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-medium mb-8">
          <Zap className="w-4 h-4 fill-indigo-600" />
          <span>V2 Cloud Accounting Platform Now Live</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight max-w-4xl leading-tight">
          The Operating System for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">Modern Accounting</span>
        </h1>
        
        <p className="mt-8 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Bill Aura replaces your entire fragmented software stack. Manage Accounting, Billing, GST, and Banking on a single, blazing-fast cloud SaaS platform.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
          <button 
            onClick={() => navigate('/auth/register')}
            className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-full text-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10"
          >
            Start Your Free Trial
            <ArrowRight className="w-5 h-5" />
          </button>
          <button className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-8 py-4 rounded-full text-lg font-medium transition-colors">
            Contact Sales
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="mt-24 pt-12 border-t border-slate-200 w-full max-w-4xl">
          <p className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-8">Trusted by industry leaders worldwide</p>
          <div className="flex flex-wrap justify-center gap-12 opacity-50 grayscale">
            <div className="flex items-center gap-2 font-bold text-xl"><ShieldCheck /> ACME Corp</div>
            <div className="flex items-center gap-2 font-bold text-xl"><BarChart3 /> GlobalTech</div>
            <div className="flex items-center gap-2 font-bold text-xl"><Zap /> FastLogistics</div>
          </div>
        </div>
      </main>
    </div>
  );
};
