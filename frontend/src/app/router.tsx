import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { NotFound } from '../pages/NotFound';
import { Unauthorized } from '../pages/Unauthorized';
import { KeyboardNavigationProvider } from '../components/workspace/KeyboardNavigationProvider';

// --- Lazy Loaded Enterprise Modules ---
const DepartmentsList = lazy(() => import('../features/departments/DepartmentsList').then(m => ({ default: m.DepartmentsList })));

const CrmDashboard = lazy(() => import('../features/crm/CrmDashboard').then(m => ({ default: m.CrmDashboard })));
const IncomeDashboard = lazy(() => import('../features/income/IncomeDashboard').then(m => ({ default: m.IncomeDashboard })));
const ChartOfAccounts = lazy(() => import('../features/accounting/ChartOfAccounts').then(m => ({ default: m.ChartOfAccounts })));
const LedgerInquiry = lazy(() => import('../features/accounting/LedgerInquiry').then(m => ({ default: m.LedgerInquiry })));
const JournalVouchersList = lazy(() => import('../features/accounting/JournalVouchersList').then(m => ({ default: m.JournalVouchersList })));
const JournalVoucherForm = lazy(() => import('../features/accounting/JournalVoucherForm').then(m => ({ default: m.JournalVoucherForm })));
const JournalEntryDetails = lazy(() => import('../features/accounting/JournalEntryDetails').then(m => ({ default: m.JournalEntryDetails })));
const CapitalDashboard = lazy(() => import('../features/accounting/CapitalDashboard').then(m => ({ default: m.CapitalDashboard })));
const ProfitLossDashboard = lazy(() => import('../features/reports/ProfitLossDashboard'));
const LandingPage = lazy(() => import('../features/public/LandingPage').then(m => ({ default: m.LandingPage })));
const AboutPage = lazy(() => import('../features/public/AboutPage').then(m => ({ default: m.AboutPage })));
const SupportPage = lazy(() => import('../features/public/SupportPage').then(m => ({ default: m.SupportPage })));

const WarehousesList = lazy(() => import('../features/inventory/WarehousesList').then(m => ({ default: m.WarehousesList })));
const BatchesList = lazy(() => import('../features/inventory/BatchesList').then(m => ({ default: m.BatchesList })));
const SerialsList = lazy(() => import('../features/inventory/SerialsList').then(m => ({ default: m.SerialsList })));
const CategoriesList = lazy(() => import('../features/inventory/CategoriesList').then(m => ({ default: m.CategoriesList })));
const BomList = lazy(() => import('../features/inventory/BomList').then(m => ({ default: m.BomList })));
const ProductsList = lazy(() => import('../features/inventory/ProductsList').then(m => ({ default: m.ProductsList })));

const BankingDashboard = lazy(() => import('../features/banking/BankingDashboard').then(m => ({ default: m.BankingDashboard })));
const BankTransactionsList = lazy(() => import('../features/banking/BankTransactionsList').then(m => ({ default: m.BankTransactionsList })));
const ReconciliationCenter = lazy(() => import('../features/banking/ReconciliationCenter').then(m => ({ default: m.ReconciliationCenter })));

const FixedAssetsList = lazy(() => import('../features/accounting/FixedAssetsList').then(m => ({ default: m.FixedAssetsList })));
const ProjectsList = lazy(() => import('../features/accounting/ProjectsList').then(m => ({ default: m.ProjectsList })));
const EmployeesList = lazy(() => import('../features/hr/EmployeesList').then(m => ({ default: m.EmployeesList })));
const PayrollDashboard = lazy(() => import('../features/hr/pages/PayrollDashboard').then(m => ({ default: m.PayrollDashboard })));

const CustomersList = lazy(() => import('../features/crm/CustomersList').then(m => ({ default: m.CustomersList })));
const CustomerProfile = lazy(() => import('../features/crm/CustomerProfile').then(m => ({ default: m.CustomerProfile })));
const CustomerForm = lazy(() => import('../features/crm/BusinessPartnerForm').then(m => ({ default: m.BusinessPartnerForm })));
const VendorsList = lazy(() => import('../features/vendors/VendorsList').then(m => ({ default: m.VendorsList })));
const VendorProfile = lazy(() => import('../features/vendors/VendorProfile').then(m => ({ default: m.VendorProfile })));

const InvoicesList = lazy(() => import('../features/sales/InvoicesList').then(m => ({ default: m.InvoicesList })));
const InvoicePrintView = lazy(() => import('../features/sales/InvoicePrintView').then(m => ({ default: m.InvoicePrintView })));
const SalesDocumentForm = lazy(() => import('../features/sales/SalesDocumentForm').then(m => ({ default: m.SalesDocumentForm })));
const InvoiceDetails = lazy(() => import('../features/sales/InvoiceDetails').then(m => ({ default: m.InvoiceDetails })));
const ReceiptsList = lazy(() => import('../features/sales/ReceiptsList').then(m => ({ default: m.ReceiptsList })));
const ReceiptForm = lazy(() => import('../features/sales/ReceiptForm').then(m => ({ default: m.ReceiptForm })));
const SalesOrdersList = lazy(() => import('../features/sales/SalesOrdersList').then(m => ({ default: m.SalesOrdersList })));
const DeliveryNotesList = lazy(() => import('../features/sales/DeliveryNotesList').then(m => ({ default: m.DeliveryNotesList })));

const BillsList = lazy(() => import('../features/purchases/BillsList').then(m => ({ default: m.BillsList })));
const BillForm = lazy(() => import('../features/purchases/BillForm').then(m => ({ default: m.BillForm })));
const PurchaseOrdersList = lazy(() => import('../features/purchases/PurchaseOrdersList').then(m => ({ default: m.PurchaseOrdersList })));
const PurchaseOrderForm = lazy(() => import('../features/purchases/PurchaseOrderForm').then(m => ({ default: m.PurchaseOrderForm })));
const PurchaseOrderDetails = lazy(() => import('../features/purchases/PurchaseOrderDetails').then(m => ({ default: m.PurchaseOrderDetails })));
const GoodsReceiptsList = lazy(() => import('../features/purchases/GoodsReceiptsList').then(m => ({ default: m.GoodsReceiptsList })));
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
const BranchesPage = lazy(() => import('../features/settings/pages/BranchesPage').then(m => ({ default: m.BranchesPage })));
const RolesPage = lazy(() => import('../features/settings/pages/RolesPage').then(m => ({ default: m.RolesPage })));
const UsersPage = lazy(() => import('../features/settings/pages/UsersPage').then(m => ({ default: m.UsersPage })));
const UserForm = lazy(() => import('../features/users/UserForm').then(m => ({ default: m.UserForm })));
const CompanyProfilePage = lazy(() => import('../features/settings/pages/CompanyProfilePage').then(m => ({ default: m.CompanyProfilePage })));
const BackupRestoreCenter = lazy(() => import('../features/settings/BackupRestoreCenter').then(m => ({ default: m.BackupRestoreCenter })));
const ExecutiveDashboard = lazy(() => import('../features/dashboard/ExecutiveDashboard').then(m => ({ default: m.ExecutiveDashboard })));
const InventoryDashboard = lazy(() => import('../features/inventory/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const SalesDashboard = lazy(() => import('../features/sales/SalesDashboard').then(m => ({ default: m.SalesDashboard })));
const PurchasesDashboard = lazy(() => import('../features/purchases/PurchasesDashboard').then(m => ({ default: m.PurchasesDashboard })));
const TaxesDashboard = lazy(() => import('../features/taxes/TaxesDashboard').then(m => ({ default: m.TaxesDashboard })));
const ExpensesDashboard = lazy(() => import('../features/expenses/ExpensesDashboard').then(m => ({ default: m.ExpensesDashboard })));
const TemplateBuilder = lazy(() => import('../pages/settings/TemplateBuilder'));
const HelpCenterPortal = lazy(() => import('../pages/help/HelpCenterPortal'));

// Layout Shells
const PublicLayout = lazy(() => import('../layouts/PublicLayout').then(m => ({ default: m.default })));
const AuthLayout = lazy(() => import('../layouts/AuthLayout').then(m => ({ default: m.default })));
const WorkspaceLayout = lazy(() => import('../layouts/WorkspaceLayout').then(m => ({ default: m.WorkspaceLayout })));
const PlatformLayout = lazy(() => import('../layouts/PlatformLayout').then(m => ({ default: m.default })));

const PlatformDashboard = lazy(() => import('../features/dashboard/PlatformDashboard').then(m => ({ default: m.PlatformDashboard })));
const MaintenancePage = lazy(() => import('./MaintenancePage').then(m => ({ default: m.MaintenancePage })));

import { PageLoader } from '../components/ui/LoadingSystem';

const LoadingFallback = () => (
  <div className="h-screen w-screen flex flex-col items-center justify-center bg-white text-slate-800 space-y-6 select-none relative overflow-hidden">
    {/* Background visual accents */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-100 opacity-[0.2] rounded-full blur-[100px] pointer-events-none" />
    
    <div className="flex flex-col items-center space-y-4 animate-fade-in relative z-10">
      <img 
        src="/logo.png" 
        alt="Bill Aura" 
        className="w-24 h-auto animate-pulse" 
      />
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[#a08020] font-semibold font-mono">
          A Webzio Product
        </p>
        <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-[#a08020] to-transparent mx-auto mt-2 opacity-50" />
      </div>
    </div>
    
    <div className="w-48 bg-slate-100 h-[2px] rounded-full overflow-hidden relative z-10">
      <div className="bg-[#a08020] h-full w-2/3 rounded-full animate-loading-bar absolute left-0" style={{ animation: 'shimmer 2s infinite linear' }} />
    </div>
    
    <style dangerouslySetInnerHTML={{__html: `
      @keyframes shimmer {
        0% { left: -100%; width: 100%; }
        100% { left: 100%; width: 100%; }
      }
    `}} />
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
      { path: 'about', element: <AboutPage /> },
      { path: 'docs', element: <div className="max-w-7xl mx-auto px-4 py-16 text-center"><h1 className="text-3xl font-bold">Documentation</h1><p className="text-muted-foreground mt-2">Developer APIs and configuration guides.</p></div> },
      { path: 'contact', element: <SupportPage /> },
    ],
  },
  // Redirects for old /auth paths
  { path: '/auth/login', element: <Navigate to="/login" replace /> },
  { path: '/auth/register', element: <Navigate to="/register" replace /> },
  { path: '/auth/verify-email', element: <Navigate to="/verify-email" replace /> },
  { path: '/auth/onboard', element: <Navigate to="/onboard" replace /> },
  { path: '/auth/forgot-password', element: <Navigate to="/forgot-password" replace /> },
  { path: '/auth/reset-password', element: <Navigate to="/reset-password" replace /> },

  // Auth & Onboarding Flow
  {
    path: '/',
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
      { path: 'banking', element: <BankingDashboard /> },
      { path: 'bank-transactions', element: <BankTransactionsList /> },
      { path: 'reconciliation', element: <ReconciliationCenter /> },
      
      // Fixed Assets & Projects
      { path: 'fixed-assets', element: <FixedAssetsList /> },
      { path: 'projects', element: <ProjectsList /> },

      // HR
      { path: 'employees', element: <EmployeesList /> },
      { path: '*', element: <PlatformDashboard /> }
    ],
  },
  // Accounting Protected Workspace Modules (Pathless Layout)
  {
    id: 'app',
    element: (
      <ProtectedRoute enabled requireCompletedOnboarding>
        <Suspense fallback={<LoadingFallback />}>
          <ErrorBoundary>
            <KeyboardNavigationProvider>
              <WorkspaceLayout />
            </KeyboardNavigationProvider>
          </ErrorBoundary>
        </Suspense>
      </ProtectedRoute>
    ),
    errorElement: <ErrorBoundary />,
    children: [
      { path: 'dashboard', element: <ExecutiveDashboard /> },
      { path: 'customers', element: <CustomersList /> },
      { path: 'customers/new', element: <CustomerForm /> },
      { path: 'customers/:id', element: <CustomerProfile /> },
      { path: 'customers/:id/edit', element: <CustomerForm /> },
      { path: 'vendors', element: <VendorsList /> },
      { path: 'vendors/new', element: <CustomerForm /> },
      { path: 'vendors/:id', element: <VendorProfile /> },
      { path: 'vendors/:id/edit', element: <CustomerForm /> },
      { path: 'products', element: <ProductsList /> },
      { path: 'services', element: <ProductsList /> },
      {path: 'categories', element: <CategoriesList /> },
      { path: 'brands', element: <MaintenancePage /> },
      { path: 'inventory', element: <InventoryDashboard /> },
      { path: 'warehouses', element: <WarehousesList /> },
      { path: 'batches', element: <BatchesList /> },
      { path: 'serials', element: <SerialsList /> },
      { path: 'bom', element: <BomList /> },
      { path: 'sales', element: <SalesDashboard /> },
      { path: 'quotations', element: <MaintenancePage /> },
      { path: 'quotations/new', element: <SalesDocumentForm initialDocType="QUOTATION" /> },
      { path: 'sales-orders', element: <SalesOrdersList /> },
      { path: 'delivery-challans', element: <DeliveryNotesList /> },
      { path: 'delivery-notes', element: <DeliveryNotesList /> },
      { path: 'invoices', element: <InvoicesList /> },
      { path: 'invoices/:id', element: <InvoiceDetails /> },
      { path: 'invoices/:id/print', element: <InvoicePrintView /> },
      { path: 'invoices/new', element: <SalesDocumentForm initialDocType="INVOICE" /> },
      { path: 'proformas/new', element: <SalesDocumentForm initialDocType="PROFORMA" /> },
      { path: 'receipts', element: <ReceiptsList /> },
      { path: 'receipts/new', element: <ReceiptForm /> },
      { path: 'receipts/:id', element: <ReceiptForm /> },
      { path: 'receipts/:id/edit', element: <ReceiptForm /> },
      { path: 'sales/receipts/new', element: <Navigate to="/receipts/new" replace /> },
      { path: 'purchase/receipts/new', element: <Navigate to="/receipts/new" replace /> },
      { path: 'expense/receipts/new', element: <Navigate to="/receipts/new" replace /> },
      { path: 'recurring-invoices', element: <MaintenancePage /> },
      { path: 'payments', element: <SalesDashboard /> },
      { path: 'purchases', element: <PurchasesDashboard /> },
      { path: 'purchase-orders', element: <PurchaseOrdersList /> },
      { path: 'purchase-orders/new', element: <PurchaseOrderForm /> },
      { path: 'purchase-orders/:id', element: <PurchaseOrderDetails /> },
      { path: 'purchase-orders/:id/edit', element: <PurchaseOrderForm /> },
      { path: 'goods-receipts', element: <GoodsReceiptsList /> },
      { path: 'bills', element: <BillsList /> },
      { path: 'bills/new', element: <BillForm /> },
      { path: 'vendor-payments', element: <PurchasesDashboard /> },
      { path: 'expenses', element: <ExpensesDashboard /> },
      { path: 'other-income', element: <IncomeDashboard /> },
      { path: 'banking', element: <ChartOfAccounts /> },
      { path: 'chart-of-accounts', element: <ChartOfAccounts /> },
      { path: 'accounting', element: <ChartOfAccounts /> },
      { path: 'accounting/ledger', element: <LedgerInquiry /> },
      { path: 'accounting/ledger/:ledgerId', element: <LedgerInquiry /> },
      { path: 'journal-entries', element: <JournalVouchersList /> },
      { path: 'journal-entries/new', element: <JournalVoucherForm /> },
      { path: 'journal-entries/:id', element: <JournalEntryDetails /> },
      { path: 'capital', element: <CapitalDashboard /> },
      { path: 'general-ledger', element: <GeneralLedger /> },
      { path: 'day-book', element: <DayBook /> },
      { path: 'trial-balance', element: <TrialBalance /> },
      { path: 'balance-sheet', element: <BalanceSheet /> },
      { path: 'profit-loss', element: <ProfitLossDashboard /> },
      { path: 'cash-flow', element: <MaintenancePage /> },
      { path: 'gst', element: <TaxesDashboard /> },
      { path: 'taxes', element: <TaxesDashboard /> },
      { path: 'reports', element: <FinancialReports /> },
      { path: 'reports/financial', element: <FinancialReports /> },
      { path: 'reports/sales', element: <MaintenancePage /> },
      { path: 'reports/purchases', element: <MaintenancePage /> },
      { path: 'reports/gst', element: <TaxesDashboard /> },
      { path: 'reports/inventory', element: <MaintenancePage /> },
      { path: 'reports/payroll', element: <PayrollDashboard /> },
      { path: 'hr', element: <PayrollDashboard /> },
      { path: 'employees', element: <EmployeesList /> },
      { path: 'departments', element: <DepartmentsList /> },
      { path: 'attendance', element: <MaintenancePage /> },
      { path: 'payroll', element: <PayrollDashboard /> },
      { path: 'fixed-assets', element: <FixedAssetsList /> },
      { path: 'projects', element: <ProjectsList /> },
      { path: 'settings/general', element: <SettingsPage /> },
      { path: 'company', element: <CompanyProfilePage /> },
      { path: 'branches', element: <BranchesPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'users/new', element: <UserForm /> },
      { path: 'users/:id/edit', element: <UserForm /> },
      { path: 'roles', element: <RolesPage /> },
      { path: 'profile', element: <CompanyProfilePage /> },
      { path: 'subscription', element: <MaintenancePage /> },
      { path: 'backup-restore', element: <BackupRestoreCenter /> },
      { path: 'settings/templates', element: <MaintenancePage /> }, // We can make a list page later
      { path: 'settings/templates/new', element: <TemplateBuilder /> },
      { path: 'settings/templates/:id', element: <TemplateBuilder /> },
      { path: 'help', element: <HelpCenterPortal /> },
      { path: 'notifications', element: <MaintenancePage /> },
      { path: 'search', element: <MaintenancePage /> },
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
