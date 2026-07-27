import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../shared/components/ui/PageHeader';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { ArrowLeft, Building, Users, Server, FileText, Activity, Shield } from 'lucide-react';

export const CompanyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building },
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'branches', label: 'Branches', icon: Server },
    { id: 'subscription', label: 'Subscription', icon: Shield },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center space-x-4 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/platform/companies')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </div>

      <PageHeader
        title="Acme Corp Details"
        description="Tenant Code: ACME01"
        primaryAction={
          <div className="space-x-2">
            <Button variant="outline">Suspend Tenant</Button>
            <Button>Login as Admin</Button>
          </div>
        }
      />

      <div className="flex space-x-1 border-b border-slate-200 mb-6 overflow-x-auto pb-px">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id 
                ? 'border-brand-600 text-brand-600 bg-brand-50/50' 
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5 md:col-span-2 space-y-4 border border-slate-200">
              <h3 className="text-lg font-medium text-slate-800">Company Information</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <div className="text-slate-500 mb-1">Legal Name</div>
                  <div className="font-medium">Acme Corporation Ltd</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Business Type</div>
                  <div className="font-medium">TRADING</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Email</div>
                  <div className="font-medium">contact@acme.com</div>
                </div>
                <div>
                  <div className="text-slate-500 mb-1">Status</div>
                  <Badge variant="success">ACTIVE</Badge>
                </div>
              </div>
            </Card>

            <Card className="p-5 space-y-4 border border-slate-200">
              <h3 className="text-lg font-medium text-slate-800">Usage Limits</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Users</span>
                    <span className="font-medium text-slate-700">15 / 50</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-brand-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Storage</span>
                    <span className="font-medium text-slate-700">1.2 GB / 10 GB</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '12%' }}></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
        
        {activeTab !== 'overview' && (
          <Card className="p-12 text-center border border-slate-200">
            <h3 className="text-lg font-medium text-slate-700">Content for {tabs.find(t => t.id === activeTab)?.label}</h3>
            <p className="text-slate-500 mt-2">This section is currently under construction.</p>
          </Card>
        )}
      </div>
    </div>
  );
};
