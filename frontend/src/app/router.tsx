import { createBrowserRouter, Navigate, Link } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { NotFound } from '../pages/NotFound';
import { Unauthorized } from '../pages/Unauthorized';

// --- Lazy Loaded Enterprise Modules ---
const DepartmentsList = lazy(() => import('../features/departments/DepartmentsList').then(m => ({ default: m.DepartmentsList })));
const LeadsList = lazy(() => import('../features/crm/LeadsList').then(m => ({ default: m.LeadsList })));
const CrmDashboard = lazy(() => import('../features/crm/CrmDashboard').then(m => ({ default: m.CrmDashboard })));
const ChartOfAccounts = lazy(() => import('../features/accounting/ChartOfAccounts').then(m => ({ default: m.ChartOfAccounts })));
const LandingPage = lazy(() => import('../features/public/LandingPage').then(m => ({ default: m.LandingPage })));

// --- Onboarding & Auth Pages ---
const Login = lazy(() => import('../features/auth/pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('../features/auth/pages/Register').then(m => ({ default: m.Register })));
const VerifyEmail = lazy(() => import('../features/auth/pages/VerifyEmail').then(m => ({ default: m.VerifyEmail })));
const ForgotPassword = lazy(() => import('../features/auth/pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('../features/auth/pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const OnboardingWizard = lazy(() => import('../features/auth/pages/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ExecutiveDashboard = lazy(() => import('../features/dashboard/ExecutiveDashboard').then(m => ({ default: m.ExecutiveDashboard })));
const InventoryDashboard = lazy(() => import('../features/inventory/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const SalesDashboard = lazy(() => import('../features/sales/SalesDashboard').then(m => ({ default: m.SalesDashboard })));
const PurchasesDashboard = lazy(() => import('../features/purchases/PurchasesDashboard').then(m => ({ default: m.PurchasesDashboard })));
const TaxesDashboard = lazy(() => import('../features/taxes/TaxesDashboard').then(m => ({ default: m.TaxesDashboard })));
const ExpensesDashboard = lazy(() => import('../features/expenses/ExpensesDashboard').then(m => ({ default: m.ExpensesDashboard })));

// Layout Shells
const PublicLayout = lazy(() => import('../layouts/PublicLayout').then(m => ({ default: m.default })));
const AuthLayout = lazy(() => import('../layouts/AuthLayout').then(m => ({ default: m.default })));
const DashboardLayout = lazy(() => import('../layouts/DashboardLayout').then(m => ({ default: m.default })));
const PlatformLayout = lazy(() => import('../layouts/PlatformLayout').then(m => ({ default: m.default })));

const PlatformDashboard = lazy(() => import('../features/dashboard/PlatformDashboard').then(m => ({ default: m.PlatformDashboard })));

const LoadingFallback = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">Loading Accounting Module...</p>
    </div>
  </div>
);

const AppRedirect = () => {
  const path = window.location.pathname;
  const newPath = path.startsWith('/app') ? path.substring(4) : path;
  return <Navigate to={newPath + window.location.search} replace />;
};

export const router = createBrowserRouter([
  // Public Landing / Pricing / Docs Section
  {
    path: '/',
    element: <Suspense fallback={<LoadingFallback />}><ErrorBoundary><PublicLayout /></ErrorBoundary></Suspense>,
    errorElement: <ErrorBoundary />,
    children: [
      { path: '', element: <LandingPage /> },
      { path: 'features', element: <div className="max-w-7xl mx-auto px-4 py-16 text-center"><h1 className="text-3xl font-bold">Accounting Platform Features</h1><p className="text-muted-foreground mt-2">Comprehensive suite of financial management tools.</p></div> },
      { path: 'pricing', element: <div className="max-w-7xl mx-auto px-4 py-16 text-center"><h1 className="text-3xl font-bold">Pricing Plans</h1><p className="text-muted-foreground mt-2">Simple, transparent, scale-friendly licensing.</p></div> },
      { path: 'about', element: <div className="max-w-7xl mx-auto px-4 py-16 text-center"><h1 className="text-3xl font-bold">About Bill Aura</h1><p className="text-muted-foreground mt-2">Cloud accounting engineered for scale.</p></div> },
      { path: 'docs', element: <div className="max-w-7xl mx-auto px-4 py-16 text-center"><h1 className="text-3xl font-bold">Documentation</h1><p className="text-muted-foreground mt-2">Developer APIs and configuration guides.</p></div> },
      { path: 'contact', element: <div className="max-w-7xl mx-auto px-4 py-16 text-center"><h1 className="text-3xl font-bold">Contact Sales</h1><p className="text-muted-foreground mt-2">Get custom onboarding support.</p></div> },
    ],
  },
  // Auth & Onboarding Flow
  {
    path: '/auth',
    element: <Suspense fallback={<LoadingFallback />}><ErrorBoundary><AuthLayout /></ErrorBoundary></Suspense>,
    errorElement: <ErrorBoundary />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'verify-email', element: <VerifyEmail /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password', element: <ResetPassword /> },
      { path: 'onboard', element: <OnboardingWizard /> },
    ],
  },
  // Platform Super Admin Routes
  {
    path: '/platform',
    element: (
      <ProtectedRoute enabled>
        <Suspense fallback={<LoadingFallback />}><ErrorBoundary><PlatformLayout /></ErrorBoundary></Suspense>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      { path: 'dashboard', element: <PlatformDashboard /> },
      { path: 'companies', element: <PlatformDashboard /> },
      { path: 'subscriptions', element: <PlatformDashboard /> },
      { path: 'plans', element: <PlatformDashboard /> },
      { path: 'users', element: <PlatformDashboard /> },
      { path: 'support', element: <PlatformDashboard /> },
      { path: 'revenue', element: <PlatformDashboard /> },
      { path: 'monitoring', element: <PlatformDashboard /> },
      { path: 'logs', element: <PlatformDashboard /> },
      { path: 'settings', element: <PlatformDashboard /> },
      { path: 'notifications', element: <PlatformDashboard /> },
      { path: 'profile', element: <PlatformDashboard /> },
      { path: '*', element: <PlatformDashboard /> }
    ],
  },
  // Accounting Protected Workspace Modules (Pathless Layout)
  {
    id: 'app',
    element: (
      <ProtectedRoute enabled requireCompletedOnboarding>
        <Suspense fallback={<LoadingFallback />}><ErrorBoundary><DashboardLayout /></ErrorBoundary></Suspense>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      { path: 'dashboard', element: <ExecutiveDashboard /> },
      { path: 'customers', element: <CrmDashboard /> },
      { path: 'vendors', element: <PurchasesDashboard /> },
      { path: 'products', element: <InventoryDashboard /> },
      { path: 'services', element: <InventoryDashboard /> },
      { path: 'categories', element: <InventoryDashboard /> },
      { path: 'inventory', element: <InventoryDashboard /> },
      { path: 'warehouses', element: <InventoryDashboard /> },
      { path: 'sales', element: <SalesDashboard /> },
      { path: 'quotations', element: <SalesDashboard /> },
      { path: 'sales-orders', element: <SalesDashboard /> },
      { path: 'delivery-challans', element: <SalesDashboard /> },
      { path: 'invoices', element: <SalesDashboard /> },
      { path: 'recurring-invoices', element: <SalesDashboard /> },
      { path: 'payments', element: <SalesDashboard /> },
      { path: 'purchases', element: <PurchasesDashboard /> },
      { path: 'purchase-orders', element: <PurchasesDashboard /> },
      { path: 'bills', element: <PurchasesDashboard /> },
      { path: 'vendor-payments', element: <PurchasesDashboard /> },
      { path: 'expenses', element: <ExpensesDashboard /> },
      { path: 'banking', element: <ChartOfAccounts /> },
      { path: 'chart-of-accounts', element: <ChartOfAccounts /> },
      { path: 'accounting', element: <ChartOfAccounts /> },
      { path: 'journal-entries', element: <ChartOfAccounts /> },
      { path: 'general-ledger', element: <ChartOfAccounts /> },
      { path: 'trial-balance', element: <ChartOfAccounts /> },
      { path: 'balance-sheet', element: <ChartOfAccounts /> },
      { path: 'profit-loss', element: <ChartOfAccounts /> },
      { path: 'cash-flow', element: <ChartOfAccounts /> },
      { path: 'gst', element: <TaxesDashboard /> },
      { path: 'taxes', element: <TaxesDashboard /> },
      { path: 'reports', element: <ExecutiveDashboard /> },
      { path: 'hr', element: <DepartmentsList /> },
      { path: 'employees', element: <DepartmentsList /> },
      { path: 'attendance', element: <DepartmentsList /> },
      { path: 'payroll', element: <DepartmentsList /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'company', element: <SettingsPage /> },
      { path: 'branches', element: <SettingsPage /> },
      { path: 'users', element: <SettingsPage /> },
      { path: 'roles', element: <SettingsPage /> },
      { path: 'profile', element: <SettingsPage /> },
      { path: 'subscription', element: <SettingsPage /> },
      { path: 'help', element: <ExecutiveDashboard /> },
      { path: 'notifications', element: <ExecutiveDashboard /> },
      { path: 'search', element: <ExecutiveDashboard /> },
      { path: 'crm', element: <CrmDashboard /> }
    ],
  },
  // Legacy URL Redirects
  {
    path: '/app/*',
    element: <AppRedirect />
  },
  {
    path: '/unauthorized',
    element: <Unauthorized />
  },
  {
    path: '*',
    element: <NotFound />
  }
]);
