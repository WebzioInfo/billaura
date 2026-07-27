import React from 'react';
import { Hammer, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface ComingSoonProps {
  title?: string;
  description?: string;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ 
  title = 'Feature Under Construction', 
  description = 'Our engineering team is currently building this module. It will be available in an upcoming release.' 
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 py-16 text-center select-none animate-fade-in">
      <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-indigo-100">
        <Hammer className="w-10 h-10 text-indigo-600 animate-pulse" />
      </div>
      
      <h2 className="text-3xl font-bold tracking-tight text-slate-900 mb-3">{title}</h2>
      
      <p className="text-slate-500 max-w-md mx-auto mb-8 text-sm leading-relaxed">
        {description}
      </p>

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          Return to Dashboard
        </button>
      </div>
      
      <div className="mt-16 text-[10px] uppercase tracking-[0.2em] font-bold text-slate-300">
        A Webzio Product
      </div>
    </div>
  );
};
