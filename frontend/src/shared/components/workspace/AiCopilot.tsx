import React, { useState } from 'react';
import { Sparkles, X, TrendingUp, AlertCircle, HelpCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/core/api';

export const AiCopilot = () => {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      const res = await apiClient.get('/ai/insights');
      return res.data;
    },
    enabled: isOpen
  });

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 z-50 flex items-center justify-center"
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold">Bill Aura Copilot</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 bg-gray-50 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500 space-y-4">
                <Sparkles className="w-8 h-8 animate-pulse text-blue-500" />
                <p>Analyzing ERP data...</p>
              </div>
            ) : data ? (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl border shadow-sm text-center">
                  <p className="text-sm text-gray-500">Business Health Score</p>
                  <p className="text-3xl font-bold text-green-500">{data.healthScore}/100</p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase text-gray-500">Smart Insights</h4>
                  {data.insights.map((insight: any, i: number) => (
                    <div key={i} className="bg-white p-3 rounded-lg border shadow-sm flex items-start gap-3">
                      {insight.type === 'positive' && <TrendingUp className="w-5 h-5 text-green-500 shrink-0" />}
                      {insight.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />}
                      {insight.type === 'suggestion' && <HelpCircle className="w-5 h-5 text-blue-500 shrink-0" />}
                      <p className="text-sm text-gray-700">{insight.message}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                  <h4 className="text-xs font-semibold uppercase text-indigo-800 mb-2">Forecast</h4>
                  <p className="text-sm text-indigo-900">Next Month Revenue: <strong>{data.forecast.nextMonthRevenue}</strong></p>
                  <p className="text-sm text-indigo-900">Estimated Runway: <strong>{data.forecast.runway}</strong></p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">Failed to load insights.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};
