import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { GuestGuard } from '../features/auth/components/GuestGuard';
import { ErrorBoundary } from '../shared/components/ErrorBoundary';
import { NotFound } from '../pages/NotFound';
import { Unauthorized } from '../pages/Unauthorized';
import { KeyboardNavigationProvider } from '../shared/components/workspace/KeyboardNavigationProvider';

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

const CategoriesList = lazy(() => import('../features/inventory/CategoriesList').then(m => ({ default: m.CategoriesList })));
const ProductsList = lazy(() => import('../features/inventory/ProductsList').then(m => ({ default: m.ProductsList })));
const ProductForm = lazy(() => import('../features/inventory/ProductForm').then(m => ({ default: m.ProductForm })));
const InventoryAdjustmentsList = lazy(() => import('../features/inventory/InventoryAdjustmentsList').then(m => ({ default: m.InventoryAdjustmentsList })));
const InventoryAdjustmentForm = lazy(() => import('../features/inventory/InventoryAdjustmentForm').then(m => ({ default: m.InventoryAdjustmentForm })));
const BrandsList = lazy(() => import('../features/inventory/BrandsList').then(m => ({ default: m.BrandsList })));
const UnitsMasterPage = lazy(() => import('../features/inventory/UnitsMasterPage').then(m => ({ default: m.UnitsMasterPage })));

const BankingDashboard = lazy(() => import('../features/banking/BankingDashboard').then(m => ({ default: m.BankingDashboard })));
const BankTransactionsList = lazy(() => import('../features/banking/BankTransactionsList').then(m => ({ default: m.BankTransactionsList })));
const ReconciliationCenter = lazy(() => import('../features/banking/ReconciliationCenter').then(m => ({ default: m.ReconciliationCenter })));

const FixedAssetsList = lazy(() => import('../features/accounting/FixedAssetsList').then(m => ({ default: m.FixedAssetsList })));
const ProjectsList = lazy(() => import('../features/accounting/ProjectsList').then(m => ({ default: m.ProjectsList })));
const EmployeesList = lazy(() => import('../features/hr/EmployeesList').then(m => ({ default: m.EmployeesList })));
const PayrollDashboard = lazy(() => import('../features/hr/pages/PayrollDashboard').then(m => ({ default: m.PayrollDashboard })));
const AttendanceReportPage = lazy(() => import('../features/hr/pages/AttendanceReportPage').then(m => ({ default: m.AttendanceReportPage })));
const PayrollGenerationWizard = lazy(() => import('../features/hr/pages/PayrollGenerationWizard').then(m => ({ default: m.PayrollGenerationWizard })));
const PayrollWorkspacePage = lazy(() => import('../features/hr/pages/PayrollWorkspacePage').then(m => ({ default: m.PayrollWorkspacePage })));

const CustomersList = lazy(() => import('../features/crm/CustomersList').then(m => ({ default: m.CustomersList })));
const CustomerProfile = lazy(() => import('../features/crm/CustomerProfile').then(m => ({ default: m.CustomerProfile })));
const CustomerForm = lazy(() => import('../features/crm/BusinessPartnerForm').then(m => ({ default: m.BusinessPartnerForm })));
const CustomerSegmentManager = lazy(() => import('../features/crm/CustomerSegmentManager').then(m => ({ default: m.CustomerSegmentManager })));
const CustomerDepartmentManager = lazy(() => import('../features/crm/CustomerDepartmentManager').then(m => ({ default: m.CustomerDepartmentManager })));
const VendorsList = lazy(() => import('../features/vendors/VendorsList').then(m => ({ default: m.VendorsList })));
const VendorProfile = lazy(() => import('../features/vendors/VendorProfile').then(m => ({ default: m.VendorProfile })));
const VendorForm = lazy(() => import('../features/vendors/VendorForm').then(m => ({ default: m.VendorForm })));

const InvoicesList = lazy(() => import('../features/sales/InvoicesList').then(m => ({ default: m.InvoicesList })));
const InvoicePrintView = lazy(() => import('../features/sales/InvoicePrintView').then(m => ({ default: m.InvoicePrintView })));
const SalesDocumentForm = lazy(() => import('../features/sales/SalesDocumentForm').then(m => ({ default: m.SalesDocumentForm })));
const InvoiceDetails = lazy(() => import('../features/sales/InvoiceDetails').then(m => ({ default: m.InvoiceDetails })));
const InvoicePaymentPage = lazy(() => import('../features/sales/InvoicePaymentPage').then(m => ({ default: m.InvoicePaymentPage })));
const ReceiptsList = lazy(() => import('../features/sales/ReceiptsList').then(m => ({ default: m.ReceiptsList })));
const ReceiptForm = lazy(() => import('../features/sales/ReceiptForm').then(m => ({ default: m.ReceiptForm })));
const SalesOrdersList = lazy(() => import('../features/sales/SalesOrdersList').then(m => ({ default: m.SalesOrdersList })));
const DeliveryNotesList = lazy(() => import('../features/sales/DeliveryNotesList').then(m => ({ default: m.DeliveryNotesList })));
const QuotationsList = lazy(() => import('../features/sales/QuotationsList').then(m => ({ default: m.QuotationsList })));
const QuotationDetails = lazy(() => import('../features/sales/QuotationDetails').then(m => ({ default: m.QuotationDetails })));
const QuotationForm = lazy(() => import('../features/sales/QuotationForm').then(m => ({ default: m.QuotationForm })));
const CreditNotesList = lazy(() => import('../features/sales/CreditNotesList').then(m => ({ default: m.CreditNotesList })));
const CreditNoteForm = lazy(() => import('../features/sales/CreditNoteForm').then(m => ({ default: m.CreditNoteForm })));
const RecurringInvoicesList = lazy(() => import('../features/sales/RecurringInvoicesList').then(m => ({ default: m.RecurringInvoicesList })));

const BillsList = lazy(() => import('../features/purchases/BillsList').then(m => ({ default: m.BillsList })));
const BillForm = lazy(() => import('../features/purchases/BillForm').then(m => ({ default: m.BillForm })));
const PurchaseOrdersList = lazy(() => import('../features/purchases/PurchaseOrdersList').then(m => ({ default: m.PurchaseOrdersList })));
const PurchaseOrderForm = lazy(() => import('../features/purchases/PurchaseOrderForm').then(m => ({ default: m.PurchaseOrderForm })));
const PurchaseOrderDetails = lazy(() => import('../features/purchases/PurchaseOrderDetails').then(m => ({ default: m.PurchaseOrderDetails })));
const PaymentsMadeList = lazy(() => import('../features/purchases/PaymentsMadeList').then(m => ({ default: m.PaymentsMadeList })));
const PaymentMadeForm = lazy(() => import('../features/purchases/PaymentMadeForm').then(m => ({ default: m.PaymentMadeForm })));
const VendorCreditsList = lazy(() => import('../features/purchases/VendorCreditsList').then(m => ({ default: m.VendorCreditsList })));
const VendorCreditForm = lazy(() => import('../features/purchases/VendorCreditForm').then(m => ({ default: m.VendorCreditForm })));
const ReportsCenter = lazy(() => import('../features/reports/ReportsCenter').then(m => ({ default: m.ReportsCenter })));
const ReportViewer = lazy(() => import('../features/reports/ReportViewer').then(m => ({ default: m.ReportViewer })));
const DocumentsList = lazy(() => import('../features/documents/DocumentsList').then(m => ({ default: m.DocumentsList })));
const EmployeeProfilePage = lazy(() => import('../features/hr/pages/EmployeeProfilePage').then(m => ({ default: m.EmployeeProfilePage })));
const AttendanceList = lazy(() => import('../features/hr/AttendanceList').then(m => ({ default: m.AttendanceList })));
const SubscriptionManager = lazy(() => import('../features/settings/SubscriptionManager').then(m => ({ default: m.SubscriptionManager })));
const TemplatesList = lazy(() => import('../features/settings/TemplatesList').then(m => ({ default: m.TemplatesList })));
const NotificationsCenter = lazy(() => import('../features/common/NotificationsCenter').then(m => ({ default: m.NotificationsCenter })));
const GlobalSearch = lazy(() => import('../features/common/GlobalSearch').then(m => ({ default: m.GlobalSearch })));
const InvoiceConfiguration = lazy(() => import('../features/settings/InvoiceConfiguration').then(m => ({ default: m.InvoiceConfiguration })));

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
const UserProfilePage = lazy(() => import('../features/users/UserProfilePage').then(m => ({ default: m.UserProfilePage })));
const CompanyProfilePage = lazy(() => import('../features/settings/pages/CompanyProfilePage').then(m => ({ default: m.CompanyProfilePage })));
const BackupRestoreCenter = lazy(() => import('../features/settings/BackupRestoreCenter').then(m => ({ default: m.BackupRestoreCenter })));
const ExecutiveDashboard = lazy(() => import('../features/dashboard/ExecutiveDashboard').then(m => ({ default: m.ExecutiveDashboard })));
const InventoryDashboard = lazy(() => import('../features/inventory/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const SalesDashboard = lazy(() => import('../features/sales/SalesDashboard').then(m => ({ default: m.SalesDashboard })));
const PurchasesDashboard = lazy(() => import('../features/purchases/PurchasesDashboard').then(m => ({ default: m.PurchasesDashboard })));
const TaxesDashboard = lazy(() => import('../features/taxes/TaxesDashboard').then(m => ({ default: m.TaxesDashboard })));
const ExpensesDashboard = lazy(() => import('../features/expenses/ExpensesDashboard').then(m => ({ default: m.ExpensesDashboard })));
const ExpenseForm = lazy(() => import('../features/expenses/ExpenseForm').then(m => ({ default: m.ExpenseForm })));
const TemplateBuilder = lazy(() => import('../pages/settings/TemplateBuilder'));
const HelpCenterPortal = lazy(() => import('../pages/help/HelpCenterPortal'));

// Layout Shells
const PublicLayout = lazy(() => import('../layouts/PublicLayout').then(m => ({ default: m.default })));
const AuthLayout = lazy(() => import('../layouts/AuthLayout').then(m => ({ default: m.default })));
const WorkspaceLayout = lazy(() => import('../layouts/WorkspaceLayout').then(m => ({ default: m.WorkspaceLayout })));
const PlatformLayout = lazy(() => import('../layouts/PlatformLayout').then(m => ({ default: m.default })));

const PlatformDashboard = lazy(() => import('../features/dashboard/PlatformDashboard').then(m => ({ default: m.PlatformDashboard })));
const CompaniesList = lazy(() => import('../features/platform/companies/CompaniesList').then(m => ({ default: m.CompaniesList })));
const CreateCompany = lazy(() => import('../features/platform/companies/CreateCompany').then(m => ({ default: m.CreateCompany })));
const CompanyDetails = lazy(() => import('../features/platform/companies/CompanyDetails').then(m => ({ default: m.CompanyDetails })));
import { PageLoader } from '../shared/components/ui/LoadingSystem';
import { ComingSoon } from '../shared/components/ui/ComingSoon';

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
      // Guest-only routes
      {
        path: '',
        element: <GuestGuard><Outlet /></GuestGuard>,
        children: [
          { path: 'login', element: <Login /> },
          { path: 'register', element: <Register /> },
          { path: 'forgot-password', element: <ForgotPassword /> },
          { path: 'reset-password', element: <ResetPassword /> },
        ]
      },
      // Routes accessible during onboarding (unauthenticated or authenticated)
      { path: 'verify-email', element: <VerifyEmail /> },
      // Onboarding step (requires authentication)
      { 
        path: 'onboard', 
        element: (
          <ProtectedRoute enabled>
            <OnboardingWizard />
          </ProtectedRoute>
        ) 
      },
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
      { path: 'companies', element: <CompaniesList /> },
      { path: 'companies/new', element: <CreateCompany /> },
      { path: 'companies/:id', element: <CompanyDetails /> },
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
      { path: 'customer-segments', element: <CustomerSegmentManager /> },
      { path: 'customer-departments', element: <CustomerDepartmentManager /> },
      { path: 'vendors', element: <VendorsList /> },
      { path: 'vendors/new', element: <VendorForm /> },
      { path: 'vendors/:id', element: <VendorProfile /> },
      { path: 'vendors/:id/edit', element: <VendorForm /> },
      { path: 'products', element: <ProductsList /> },
      { path: 'products/new', element: <ProductForm /> },
      { path: 'products/:id', element: <ProductsList /> },
      { path: 'products/:id/edit', element: <ProductForm /> },
      { path: 'services', element: <ProductsList /> },
      { path: 'categories', element: <CategoriesList /> },
      { path: 'brands', element: <BrandsList /> },
      { path: 'units', element: <UnitsMasterPage /> },
      { path: 'inventory', element: <InventoryAdjustmentsList /> },
      { path: 'inventory/adjustments/new', element: <InventoryAdjustmentForm onClose={() => window.history.back()} /> },
      { path: 'inventory-dashboard', element: <InventoryDashboard /> },

      { path: 'sales', element: <SalesDashboard /> },
      { path: 'quotations', element: <QuotationsList /> },
      { path: 'quotations/new', element: <QuotationForm /> },
      { path: 'quotations/:id', element: <QuotationDetails /> },
      { path: 'quotations/:id/edit', element: <QuotationForm /> },
      { path: 'sales/quotes', element: <QuotationsList /> },
      { path: 'sales/quotes/new', element: <QuotationForm /> },
      { path: 'sales/quotes/:id', element: <QuotationDetails /> },
      { path: 'sales/quotes/:id/edit', element: <QuotationForm /> },
      { path: 'sales-orders', element: <SalesOrdersList /> },
      { path: 'sales-orders/new', element: <SalesDocumentForm initialDocType="SALES_ORDER" /> },
      { path: 'sales-orders/:id/edit', element: <SalesDocumentForm initialDocType="SALES_ORDER" /> },
      { path: 'delivery-challans', element: <DeliveryNotesList /> },
      { path: 'delivery-challans/new', element: <SalesDocumentForm initialDocType="DELIVERY_CHALLAN" /> },
      { path: 'delivery-notes', element: <DeliveryNotesList /> },
      { path: 'delivery-notes/new', element: <SalesDocumentForm initialDocType="DELIVERY_CHALLAN" /> },
      { path: 'credit-notes', element: <CreditNotesList /> },
      { path: 'credit-notes/new', element: <CreditNoteForm /> },
      { path: 'credit-notes/:id/edit', element: <CreditNoteForm /> },
      { path: 'invoices', element: <InvoicesList /> },
      { path: 'invoices/:id', element: <InvoiceDetails /> },
      { path: 'invoices/:id/payment', element: <InvoicePaymentPage /> },
      { path: 'invoices/:id/record-payment', element: <InvoicePaymentPage /> },
      { path: 'invoices/:id/edit', element: <SalesDocumentForm initialDocType="INVOICE" /> },
      { path: 'invoices/:id/print', element: <InvoicePrintView /> },
      { path: 'invoices/new', element: <SalesDocumentForm initialDocType="INVOICE" /> },
      { path: 'proformas/new', element: <SalesDocumentForm initialDocType="PROFORMA" /> },
      { path: 'receipts', element: <ReceiptsList /> },
      { path: 'receipts/new', element: <ReceiptForm /> },
      { path: 'receipts/:id', element: <ReceiptForm /> },
      { path: 'receipts/:id/edit', element: <ReceiptForm /> },
      { path: 'payments-received', element: <ReceiptsList /> },
      { path: 'payments-received/new', element: <ReceiptForm /> },
      { path: 'payments-received/:id', element: <ReceiptForm /> },
      { path: 'payments-received/:id/edit', element: <ReceiptForm /> },
      { path: 'sales/receipts/new', element: <Navigate to="/receipts/new" replace /> },
      { path: 'purchase/receipts/new', element: <Navigate to="/receipts/new" replace /> },
      { path: 'expense/receipts/new', element: <Navigate to="/receipts/new" replace /> },
      { path: 'recurring-invoices', element: <RecurringInvoicesList /> },
      { path: 'payments', element: <SalesDashboard /> },
      { path: 'purchases', element: <PurchasesDashboard /> },
      { path: 'purchase-orders', element: <PurchaseOrdersList /> },
      { path: 'purchase-orders/new', element: <PurchaseOrderForm /> },
      { path: 'purchase-orders/:id', element: <PurchaseOrderDetails /> },
      { path: 'purchase-orders/:id/edit', element: <PurchaseOrderForm /> },
      { path: 'goods-receipts', element: <Navigate to="/purchases" replace /> },
      { path: 'goods-receipts/*', element: <Navigate to="/purchases" replace /> },
      { path: 'bills', element: <BillsList /> },
      { path: 'bills/new', element: <BillForm /> },
      { path: 'bills/:id/edit', element: <BillForm /> },
      { path: 'debit-notes', element: <VendorCreditsList /> },
      { path: 'debit-notes/new', element: <VendorCreditForm /> },
      { path: 'vendor-credits', element: <VendorCreditsList /> },
      { path: 'vendor-credits/new', element: <VendorCreditForm /> },
      { path: 'vendor-payments', element: <PaymentsMadeList /> },
      { path: 'vendor-payments/new', element: <PaymentMadeForm /> },
      { path: 'vendor-payments/:id', element: <PaymentMadeForm /> },
      { path: 'vendor-payments/:id/edit', element: <PaymentMadeForm /> },
      { path: 'payments-made', element: <PaymentsMadeList /> },
      { path: 'payments-made/new', element: <PaymentMadeForm /> },
      { path: 'payments-made/:id', element: <PaymentMadeForm /> },
      { path: 'payments-made/:id/edit', element: <PaymentMadeForm /> },
      { path: 'stock-transfer', element: <InventoryDashboard /> },
      { path: 'expenses', element: <ExpensesDashboard /> },
      { path: 'expenses/new', element: <ExpenseForm /> },
      { path: 'expenses/:id/edit', element: <ExpenseForm /> },
      { path: 'other-income', element: <IncomeDashboard /> },
      { path: 'banking', element: <BankingDashboard /> },
      { path: 'bank-transactions', element: <BankTransactionsList /> },
      { path: 'reconciliation', element: <ReconciliationCenter /> },
      { path: 'bank-reconciliation', element: <Navigate to="/reconciliation" replace /> },
      { path: 'chart-of-accounts', element: <ChartOfAccounts /> },
      { path: 'accounting', element: <ChartOfAccounts /> },
      { path: 'accounting/ledger', element: <LedgerInquiry /> },
      { path: 'accounting/ledger/:ledgerId', element: <LedgerInquiry /> },
      { path: 'journal-entries', element: <JournalVouchersList /> },
      { path: 'journal-entries/new', element: <JournalVoucherForm /> },
      { path: 'journal-entries/:id', element: <JournalEntryDetails /> },
      { path: 'contra-voucher', element: <JournalVoucherForm /> },
      { path: 'capital', element: <CapitalDashboard /> },
      // Reports Module: ONE Reports Center + ONE Report Viewer
      { path: 'reports', element: <ReportsCenter /> },
      { path: 'reports/:reportKey', element: <ReportViewer /> },

      // Legacy Report Route Redirects (All redirect to new Report Viewer or Reports Center)
      { path: 'reports-center', element: <Navigate to="/reports" replace /> },
      { path: 'reports/financial', element: <Navigate to="/reports" replace /> },
      { path: 'general-ledger', element: <Navigate to="/reports/general-ledger" replace /> },
      { path: 'day-book', element: <Navigate to="/reports/day-book" replace /> },
      { path: 'trial-balance', element: <Navigate to="/reports/trial-balance" replace /> },
      { path: 'balance-sheet', element: <Navigate to="/reports/balance-sheet" replace /> },
      { path: 'profit-loss', element: <Navigate to="/reports/profit-and-loss" replace /> },
      { path: 'cash-flow', element: <Navigate to="/reports/cash-flow-statement" replace /> },
      { path: 'sales-register', element: <Navigate to="/reports/sales-by-customer" replace /> },
      { path: 'purchase-register', element: <Navigate to="/reports/purchases-by-vendor" replace /> },
      { path: 'reports/departmental', element: <Navigate to="/reports/departmental-performance" replace /> },
      { path: 'reports/sales', element: <Navigate to="/reports/sales-by-customer" replace /> },
      { path: 'reports/purchases', element: <Navigate to="/reports/purchases-by-vendor" replace /> },
      { path: 'reports/gst', element: <Navigate to="/reports/tax-summary" replace /> },
      { path: 'reports/inventory', element: <Navigate to="/reports" replace /> },

      // Filing & Compliance / Taxes Dashboards
      { path: 'gst', element: <TaxesDashboard /> },
      { path: 'taxes', element: <TaxesDashboard /> },
      { path: 'gstr-1', element: <TaxesDashboard /> },
      { path: 'gstr-3b', element: <TaxesDashboard /> },
      { path: 'documents', element: <DocumentsList /> },
      { path: 'documents/:folder', element: <DocumentsList /> },
      { path: 'reports/payroll', element: <PayrollDashboard /> },
      { path: 'reports/attendance', element: <AttendanceReportPage /> },
      { path: 'salary-slips', element: <PayrollDashboard /> },
      { path: 'hr', element: <PayrollDashboard /> },
      { path: 'hr/attendance-report', element: <AttendanceReportPage /> },
      { path: 'hr/payroll/generate', element: <PayrollGenerationWizard /> },
      { path: 'employees', element: <EmployeesList /> },
      { path: 'employees/:id', element: <EmployeeProfilePage /> },
      { path: 'departments', element: <DepartmentsList /> },
      { path: 'cost-centres', element: <Navigate to="/departments?tab=masters&sub=cost-centres" replace /> },
      { path: 'cost-centers', element: <Navigate to="/departments?tab=masters&sub=cost-centres" replace /> },
      { path: 'master-config', element: <Navigate to="/departments?tab=masters" replace /> },
      { path: 'attendance', element: <AttendanceList /> },
      { path: 'payroll', element: <PayrollDashboard /> },
      { path: 'payroll/:id', element: <PayrollWorkspacePage /> },
      { path: 'payroll/:id/:tab', element: <PayrollWorkspacePage /> },
      { path: 'fixed-assets', element: <FixedAssetsList /> },
      { path: 'projects', element: <ProjectsList /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/general', element: <Navigate to="/settings?tab=company" replace /> },
      { path: 'company', element: <Navigate to="/settings?tab=company" replace /> },
      { path: 'branches', element: <Navigate to="/settings?tab=branches" replace /> },
      { path: 'users', element: <Navigate to="/settings?tab=users" replace /> },
      { path: 'users/new', element: <UserForm /> },
      { path: 'users/:id/edit', element: <UserForm /> },
      { path: 'roles', element: <Navigate to="/settings?tab=roles" replace /> },
      { path: 'financial-year', element: <Navigate to="/settings?tab=financial-year" replace /> },
      { path: 'permissions', element: <Navigate to="/settings?tab=roles" replace /> },
      { path: 'currencies', element: <Navigate to="/settings?tab=currencies" replace /> },
      { path: 'integrations', element: <Navigate to="/settings?tab=integrations" replace /> },
      { path: 'profile', element: <UserProfilePage /> },
      { path: 'subscription', element: <Navigate to="/settings?tab=subscription" replace /> },
      { path: 'settings/templates', element: <TemplatesList /> },
      { path: 'invoice-engine', element: <Navigate to="/settings/templates?type=invoice" replace /> },
      { path: 'settings/templates/new', element: <TemplateBuilder /> },
      { path: 'settings/templates/:id/edit', element: <TemplateBuilder /> },
      { path: 'settings/templates/:id', element: <TemplateBuilder /> },
      { path: 'help', element: <HelpCenterPortal /> },
      { path: 'notifications', element: <NotificationsCenter /> },
      { path: 'search', element: <GlobalSearch /> },
      { path: 'crm', element: <CrmDashboard /> },
      
      // Legacy Customer Statement & Ageing Redirects
      { path: 'customer-statements', element: <Navigate to="/reports/customer-balance-summary" replace /> },
      { path: 'reports/customer-ageing', element: <Navigate to="/reports/ar-aging-summary" replace /> },
      
      // Placeholders for unimplemented features have been removed to enforce nested routing
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
