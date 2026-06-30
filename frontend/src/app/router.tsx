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
      // other platform routes can be mapped to placeholders or implemented later
      { path: '*', element: <PlatformDashboard /> }
    ],
  },
  // Accounting Protected Workspace Modules
  {
    path: '/app',
    element: (
      <ProtectedRoute enabled requireCompletedOnboarding>
        <Suspense fallback={<LoadingFallback />}><ErrorBoundary><DashboardLayout /></ErrorBoundary></Suspense>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      { path: 'dashboard', element: <ExecutiveDashboard /> },
      { path: 'crm', element: <CrmDashboard /> },
      { path: 'products', element: <InventoryDashboard /> },
      { path: 'sales', element: <SalesDashboard /> },
      { path: 'purchases', element: <PurchasesDashboard /> },
      { path: 'hr', element: <DepartmentsList /> },
      { path: 'accounting', element: <ChartOfAccounts /> },
      { path: 'taxes', element: <TaxesDashboard /> },
      { path: 'expenses', element: <ExpensesDashboard /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
  // Catch all and redirects
  {
    path: '/dashboard',
    element: <Navigate to="/app/dashboard" replace />
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
