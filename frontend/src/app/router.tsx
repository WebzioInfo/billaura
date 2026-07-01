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
const IncomeDashboard = lazy(() => import('../features/income/IncomeDashboard').then(m => ({ default: m.IncomeDashboard })));
const ChartOfAccounts = lazy(() => import('../features/accounting/ChartOfAccounts').then(m => ({ default: m.ChartOfAccounts })));
const JournalVouchersList = lazy(() => import('../features/accounting/JournalVouchersList').then(m => ({ default: m.JournalVouchersList })));
const JournalVoucherForm = lazy(() => import('../features/accounting/JournalVoucherForm').then(m => ({ default: m.JournalVoucherForm })));
const CapitalDashboard = lazy(() => import('../features/accounting/CapitalDashboard').then(m => ({ default: m.CapitalDashboard })));
const ProfitLossDashboard = lazy(() => import('../features/reports/ProfitLossDashboard'));
const LandingPage = lazy(() => import('../features/public/LandingPage').then(m => ({ default: m.LandingPage })));

const CustomersList = lazy(() => import('../features/crm/CustomersList').then(m => ({ default: m.CustomersList })));
const VendorsList = lazy(() => import('../features/crm/VendorsList').then(m => ({ default: m.VendorsList })));
const InvoicesList = lazy(() => import('../features/sales/InvoicesList').then(m => ({ default: m.InvoicesList })));
const InvoiceForm = lazy(() => import('../features/sales/InvoiceForm').then(m => ({ default: m.InvoiceForm })));
const BillsList = lazy(() => import('../features/purchases/BillsList').then(m => ({ default: m.BillsList })));
const BillForm = lazy(() => import('../features/purchases/BillForm').then(m => ({ default: m.BillForm })));
const TrialBalance = lazy(() => import('../features/reports/TrialBalance').then(m => ({ default: m.TrialBalance })));
const BalanceSheet = lazy(() => import('../features/reports/BalanceSheet').then(m => ({ default: m.BalanceSheet })));
const GeneralLedger = lazy(() => import('../features/reports/GeneralLedger').then(m => ({ default: m.GeneralLedger })));
const DayBook = lazy(() => import('../features/reports/DayBook').then(m => ({ default: m.DayBook })));
const FinancialReports = lazy(() => import('../features/reports/FinancialReports').then(m => ({ default: m.FinancialReports })));

// --- Onboarding & Auth Pages ---
const Login = lazy(() => import('../features/auth/pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('../features/auth/pages/Register').then(m => ({ default: m.Register })));
const VerifyEmail = lazy(() => import('../features/auth/pages/VerifyEmail').then(m => ({ default: m.VerifyEmail })));
const ForgotPassword = lazy(() => import('../features/auth/pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('../features/auth/pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const OnboardingWizard = lazy(() => import('../features/auth/pages/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
const BackupRestoreCenter = lazy(() => import('../features/settings/BackupRestoreCenter').then(m => ({ default: m.BackupRestoreCenter })));
const ExecutiveDashboard = lazy(() => import('../features/dashboard/ExecutiveDashboard').then(m => ({ default: m.ExecutiveDashboard })));
const InventoryDashboard = lazy(() => import('../features/inventory/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const SalesDashboard = lazy(() => import('../features/sales/SalesDashboard').then(m => ({ default: m.SalesDashboard })));
const PurchasesDashboard = lazy(() => import('../features/purchases/PurchasesDashboard').then(m => ({ default: m.PurchasesDashboard })));
const TaxesDashboard = lazy(() => import('../features/taxes/TaxesDashboard').then(m => ({ default: m.TaxesDashboard })));
const ExpensesDashboard = lazy(() => import('../features/expenses/ExpensesDashboard').then(m => ({ default: m.ExpensesDashboard })));

// Layout Shells
const PublicLayout = lazy(() => import('../layouts/PublicLayout').then(m => ({ default: m.default })));
const AuthLayout = lazy(() => import('../layouts/AuthLayout').then(m => ({ default: m.default })));
const WorkspaceLayout = lazy(() => import('../layouts/WorkspaceLayout').then(m => ({ default: m.WorkspaceLayout })));
const PlatformLayout = lazy(() => import('../layouts/PlatformLayout').then(m => ({ default: m.default })));

const PlatformDashboard = lazy(() => import('../features/dashboard/PlatformDashboard').then(m => ({ default: m.PlatformDashboard })));

const LoadingFallback = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-background text-foreground">
    <div className="flex flex-col items-center gap-4">
      <img 
        src="/logo.png" 
        alt="Loading Bill Aura..." 
        className="w-24 h-auto animate-pulse dark:hidden" 
      />
      <img 
        src="/logo2.png" 
        alt="Loading Bill Aura..." 
        className="w-24 h-auto animate-pulse hidden dark:block" 
      />
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
        <Suspense fallback={<LoadingFallback />}><ErrorBoundary><WorkspaceLayout /></ErrorBoundary></Suspense>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      { path: 'dashboard', element: <ExecutiveDashboard /> },
      { path: 'customers', element: <CustomersList /> },
      { path: 'vendors', element: <VendorsList /> },
      { path: 'products', element: <InventoryDashboard /> },
      { path: 'services', element: <InventoryDashboard /> },
      { path: 'categories', element: <InventoryDashboard /> },
      { path: 'inventory', element: <InventoryDashboard /> },
      { path: 'warehouses', element: <InventoryDashboard /> },
      { path: 'sales', element: <SalesDashboard /> },
      { path: 'quotations', element: <SalesDashboard /> },
      { path: 'sales-orders', element: <SalesDashboard /> },
      { path: 'delivery-challans', element: <SalesDashboard /> },
      { path: 'invoices', element: <InvoicesList /> },
      { path: 'invoices/new', element: <InvoiceForm /> },
      { path: 'recurring-invoices', element: <SalesDashboard /> },
      { path: 'payments', element: <SalesDashboard /> },
      { path: 'purchases', element: <PurchasesDashboard /> },
      { path: 'purchase-orders', element: <PurchasesDashboard /> },
      { path: 'bills', element: <BillsList /> },
      { path: 'bills/new', element: <BillForm /> },
      { path: 'vendor-payments', element: <PurchasesDashboard /> },
      { path: 'expenses', element: <ExpensesDashboard /> },
      { path: 'other-income', element: <IncomeDashboard /> },
      { path: 'banking', element: <ChartOfAccounts /> },
      { path: 'chart-of-accounts', element: <ChartOfAccounts /> },
      { path: 'accounting', element: <ChartOfAccounts /> },
      { path: 'journal-entries', element: <JournalVouchersList /> },
      { path: 'journal-entries/new', element: <JournalVoucherForm /> },
      { path: 'capital', element: <CapitalDashboard /> },
      { path: 'general-ledger', element: <GeneralLedger /> },
      { path: 'day-book', element: <DayBook /> },
      { path: 'trial-balance', element: <TrialBalance /> },
      { path: 'balance-sheet', element: <BalanceSheet /> },
      { path: 'profit-loss', element: <ProfitLossDashboard /> },
      { path: 'cash-flow', element: <ChartOfAccounts /> },
      { path: 'gst', element: <TaxesDashboard /> },
      { path: 'taxes', element: <TaxesDashboard /> },
      { path: 'reports', element: <FinancialReports /> },
      { path: 'reports/financial', element: <FinancialReports /> },
      { path: 'reports/sales', element: <SalesDashboard /> },
      { path: 'reports/purchases', element: <PurchasesDashboard /> },
      { path: 'reports/gst', element: <TaxesDashboard /> },
      { path: 'reports/inventory', element: <InventoryDashboard /> },
      { path: 'reports/payroll', element: <DepartmentsList /> },
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
      { path: 'backup-restore', element: <BackupRestoreCenter /> },
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
