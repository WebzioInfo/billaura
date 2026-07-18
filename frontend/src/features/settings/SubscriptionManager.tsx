import React from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { PageContainer } from '@/shared/components/ui/LayoutComponents';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { CheckCircle2, Zap, Shield, Crown } from 'lucide-react';
import { useCurrentUser } from '../auth/hooks/useCurrentUser';

export const SubscriptionManager = () => {
  const user = useCurrentUser();
  
  // Default to Enterprise for demo/dev if not set
  const currentPlan = 'Enterprise';

  const plans = [
    {
      name: 'Starter',
      price: '₹999',
      interval: 'month',
      icon: Zap,
      features: ['Up to 3 Users', 'Basic Accounting', 'Invoice Generation', 'Email Support'],
      recommended: false
    },
    {
      name: 'Professional',
      price: '₹2,999',
      interval: 'month',
      icon: Shield,
      features: ['Up to 10 Users', 'Advanced Inventory', 'Multi-Branch Support', 'Priority Support'],
      recommended: true
    },
    {
      name: 'Enterprise',
      price: '₹9,999',
      interval: 'month',
      icon: Crown,
      features: ['Unlimited Users', 'Dedicated Account Manager', 'Custom API Access', 'On-Premise Deployment Options'],
      recommended: false
    }
  ];

  return (
    <PageContainer maxWidth="5xl">
      <PageHeader 
        title="Billing & Subscription" 
        description="Manage your Bill Aura ERP subscription and billing details"
      />

      <div className="mt-8">
        <Card className="bg-primary/5 border-primary/20 shadow-sm mb-12">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Current Plan</p>
              <h3 className="text-3xl font-bold text-foreground flex items-center gap-3">
                {currentPlan}
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full uppercase tracking-wider font-semibold">Active</span>
              </h3>
              <p className="text-sm text-muted-foreground mt-2">Next billing date: {new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString()}</p>
            </div>
            <div className="mt-4 md:mt-0 flex gap-3">
              <Button variant="outline">View Invoices</Button>
              <Button variant="primary">Manage Payment Method</Button>
            </div>
          </CardContent>
        </Card>

        <h3 className="text-xl font-bold mb-6 text-center">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card 
              key={plan.name} 
              className={`relative shadow-sm transition-all duration-200 ${
                currentPlan === plan.name 
                  ? 'border-primary ring-1 ring-primary' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {plan.recommended && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  RECOMMENDED
                </div>
              )}
              <CardHeader className="text-center pb-2 pt-8">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                  <plan.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.interval}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  variant={currentPlan === plan.name ? 'outline' : 'primary'} 
                  className="w-full"
                  disabled={currentPlan === plan.name}
                >
                  {currentPlan === plan.name ? 'Current Plan' : 'Upgrade'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};
