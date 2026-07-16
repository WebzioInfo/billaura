import React from 'react';
import { Settings, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export const MaintenancePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-100px)] flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md mx-auto">
        <div className="flex justify-center">
          <div className="bg-primary/10 p-4 rounded-full">
            <Settings className="w-16 h-16 text-primary animate-spin-slow" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Module Under Maintenance</h1>
          <p className="text-muted-foreground leading-relaxed">
            This module is currently undergoing scheduled maintenance and updates for the Version 1.0 release. Please check back later.
          </p>
        </div>

        <div className="pt-4">
          <Button onClick={() => navigate('/')} variant="primary" className="flex items-center gap-2 mx-auto">
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
