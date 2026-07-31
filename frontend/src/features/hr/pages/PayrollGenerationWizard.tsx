import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator, CheckCircle2, ChevronRight, ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Select } from '@/shared/components/ui/Select';
import apiClient from '@/core/api';

export const PayrollGenerationWizard = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    departmentId: 'all',
  });
  
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/hr/salary-slips/generate', {
        startDate: formData.startDate,
        endDate: formData.endDate,
        departmentId: formData.departmentId === 'all' ? undefined : formData.departmentId
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-slips'] });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
      setStep(4); // Success step
    }
  });

  return (
    <div className="max-w-4xl mx-auto p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-400 dark:to-indigo-400 bg-clip-text text-transparent">
          Payroll Generation Engine
        </h1>
        <p className="text-muted-foreground mt-2">Generate enterprise-grade payroll across custom periods and departments.</p>
      </div>

      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0 rounded-full"></div>
        <div className={`absolute top-1/2 left-0 h-1 bg-gradient-to-r from-violet-600 to-indigo-600 -translate-y-1/2 z-0 rounded-full transition-all duration-500`} style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
        
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full font-bold shadow-sm transition-colors duration-300 ${step >= i ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
            {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
          </div>
        ))}
      </div>

      <Card className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-white/20 dark:border-slate-800/50 shadow-xl overflow-hidden">
        <CardContent className="p-8">
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <div>
                <h2 className="text-2xl font-bold mb-2">Target Selection</h2>
                <p className="text-muted-foreground">Select who you want to run payroll for.</p>
              </div>
              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Select 
                    value={formData.departmentId} 
                    onChange={(e) => setFormData({...formData, departmentId: e.target.value})}
                    options={[
                      { label: "Entire Company", value: "all" },
                      { label: "Engineering", value: "engineering" },
                      { label: "Sales", value: "sales" }
                    ]}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={() => setStep(2)} className="bg-indigo-600 hover:bg-indigo-700">
                  Next Step <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <div>
                <h2 className="text-2xl font-bold mb-2">Payroll Period</h2>
                <p className="text-muted-foreground">Select the flexible date range for this payroll cycle.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="bg-white/50 dark:bg-slate-950/50"/>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="bg-white/50 dark:bg-slate-950/50"/>
                </div>
              </div>
              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <Button onClick={() => setStep(3)} disabled={!formData.startDate || !formData.endDate} className="bg-indigo-600 hover:bg-indigo-700">
                  Review & Preview <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
              <div className="text-center p-8 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <Calculator className="w-16 h-16 mx-auto mb-4 text-indigo-500 opacity-80" />
                <h2 className="text-2xl font-bold mb-2">Ready to Generate</h2>
                <p className="text-muted-foreground mb-6">
                  You are about to generate draft payroll for {formData.departmentId === 'all' ? 'the Entire Company' : 'the selected department'} <br/>
                  from <strong>{formData.startDate}</strong> to <strong>{formData.endDate}</strong>.
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-6 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg inline-block text-left border border-amber-200 dark:border-amber-800">
                  <strong>Note:</strong> This will create DRAFT records. You can preview, edit, or void them before final approval.
                </p>
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                  </Button>
                  <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg text-white">
                    {generateMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <><Save className="w-4 h-4 mr-2" /> Generate Payroll</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 text-center animate-in zoom-in-95 fade-in duration-500 py-12">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Generation Successful!</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-lg">
                Draft payroll records have been successfully calculated and stored. You can now review and approve them in the Payroll Register.
              </p>
              <div className="pt-8">
                <Button variant="outline" className="mr-4" onClick={() => setStep(1)}>
                  Run Another Batch
                </Button>
                <Button className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900">
                  View Payroll Register
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
