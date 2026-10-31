# Bill Aura ERP — Architecture & Navigation Map

## 1. System Technology Stack
| Layer | Technologies Used | Key Characteristics |
|---|---|---|
| **Frontend UI** | React 19, TypeScript, Vite, Tailwind CSS | High performance, instant SPA transitions, micro-animations |
| **State & Data** | TanStack Query v5, Zustand, React Hook Form, Zod | Stale-while-revalidate caching, schema validation, optimistic UI updates |
| **Icons & Design** | Lucide React, Google Inter Typography | Modern, clean enterprise interface modeled on Zoho Books |
| **Backend API** | NestJS 11, Express, Passport JWT, Throttler | Enterprise modular controllers, service layer architecture, RESTful API |
| **Database & ORM** | PostgreSQL, Prisma ORM 6.x | Strict foreign keys, transactional integrity, multi-tenant isolation |
| **Reporting & PDF**| @react-pdf/renderer, Puppeteer, Recharts | Server-side & client-side printable document generation |

---

## 2. Global Navigation Hierarchy

### A. Top Application Header (`AppHeader.tsx`)
- **Left**: Mobile Menu Hamburger toggle, Brand Logo & Product Name (`Bill Aura`).
- **Center**:
  - **Global Search Dropdown**: Module filter (`All`, `Invoices`, `Customers`, `Quotes`, `Sales Orders`, `Bills`, `Vendors`, `Items`, `Banking`).
  - **Search Input Box**: Real-time debounce query search across records.
- **Right Action Bar**:
  - **Quick Create Button (`+`)**: Dropdown categorized into:
    - *General*: Customer (`/customers/new`), Vendor (`/vendors/new`), Item (`/products`).
    - *Sales*: Invoice (`/invoices/new`), Quote (`/quotations/new`), Sales Order (`/sales-orders/new`), Delivery Challan (`/delivery-challans/new`), Payment Received (`/receipts/new`), Credit Note (`/credit-notes/new`).
    - *Purchases*: Bill (`/bills/new`), Expense (`/expenses`), Purchase Order (`/purchase-orders/new`), Vendor Credit (`/debit-notes/new`).
    - *Accountant*: Manual Journal (`/journal-entries/new`), Chart of Accounts (`/chart-of-accounts`).
  - **Recent History Button**: Flyout showing recently visited documents and routes.
  - **Active Organization Switcher**: Active Company Name, Branch Selector, Financial Year badge.
  - **Notification Bell (`Bell`)**: Unread notification counter, toast feed, mark-all-read.
  - **Settings Gear (`Settings`)**: Shortcut to `/settings`.
  - **User Profile Menu**: User Avatar, User Name, Role, User Profile (`/profile`), Log Out.

### B. Workspace Multi-Document Tab Bar (`WorkspaceTabs.tsx`)
- Tab bar directly underneath the header.
- Allows power users and accountants to work across multiple vouchers simultaneously (e.g., Tab 1: `Invoices`, Tab 2: `New Invoice`, Tab 3: `Customers`, Tab 4: `Profit and Loss`).
- Tabs can be switched instantly without loss of form state or context, and closed with `X`.

### C. Zoho-Style Sidebar Rail & Menu (`AppSidebar.tsx`)
1. **Home**:
   - Dashboard (`/dashboard`)
2. **Items**:
   - Items / Products Master (`/products`)
   - Units Master (`/units`)
   - Categories (`/categories`)
   - Brands (`/brands`)
3. **Inventory**:
   - Inventory Adjustments (`/inventory`)
   - New Stock Adjustment (`/inventory/adjustments/new`)
4. **Sales**:
   - Customers (`/customers`)
   - Quotes (`/quotations`)
   - Sales Orders (`/sales-orders`)
   - Invoices (`/invoices`)
   - Recurring Invoices (`/recurring-invoices`)
   - Delivery Challans (`/delivery-challans`)
   - Payments Received (`/receipts`)
   - Credit Notes (`/credit-notes`)
5. **Purchases**:
   - Vendors (`/vendors`)
   - Expenses (`/expenses`)
   - Purchase Orders (`/purchase-orders`)
   - Bills (`/bills`)
   - Payments Made (`/vendor-payments`)
   - Vendor Credits / Debit Notes (`/debit-notes`)
6. **Banking**:
   - Banking Overview (`/banking`)
   - Bank Transactions (`/bank-transactions`)
   - Reconciliation Center (`/reconciliation`)
7. **Accountant**:
   - Manual Journals (`/journal-entries`)
   - Chart of Accounts (`/chart-of-accounts`)
   - Capital (`/capital`)
8. **Reports**:
   - Reports Center (`/reports`)
9. **People & HR**:
   - Employees (`/employees`)
   - Payroll (`/payroll`)
   - Attendance (`/attendance`)
10. **Documents & Templates**:
    - Templates List (`/settings/templates`)
11. **Settings**:
    - Full System Settings (`/settings?tab=company`)

---

## 3. Route & URL Directory
| Route | Feature Component | Layout Parent | Purpose |
|---|---|---|---|
| `/login` | `Login.tsx` | AuthLayout | User authentication via email & password |
| `/register` | `Register.tsx` | AuthLayout | New user registration |
| `/onboard` | `OnboardingWizard.tsx` | AuthLayout | Guided company & statutory profile setup |
| `/dashboard` | `ExecutiveDashboard.tsx` | WorkspaceLayout | Financial summary, sales graphs & KPIs |
| `/products` | `ProductsList.tsx` | WorkspaceLayout | Catalog of products and services |
| `/products/new` | `ProductForm.tsx` | WorkspaceLayout | Create product/service with HSN, pricing & stock |
| `/units` | `UnitsMasterPage.tsx` | WorkspaceLayout | Unit codes, UQC mappings, decimal precision |
| `/categories` | `CategoriesList.tsx` | WorkspaceLayout | Item classifications |
| `/brands` | `BrandsList.tsx` | WorkspaceLayout | Brand classifications |
| `/inventory` | `InventoryAdjustmentsList.tsx` | WorkspaceLayout | Stock adjustment records & audit trails |
| `/inventory/adjustments/new` | `InventoryAdjustmentForm.tsx`| WorkspaceLayout | Stock write-off / write-in voucher |
| `/customers` | `CustomersList.tsx` | WorkspaceLayout | Directory of customers and receivables |
| `/customers/new` | `BusinessPartnerForm.tsx` | WorkspaceLayout | Customer onboarding form with GSTIN auto-fill |
| `/customers/:id` | `CustomerProfile.tsx` | WorkspaceLayout | Customer 360 view: ledger, transactions & stats |
| `/quotations` | `QuotationsList.tsx` | WorkspaceLayout | Sales quotation list & conversion tracking |
| `/quotations/new` | `QuotationForm.tsx` | WorkspaceLayout | Draft quotations with line items & taxes |
| `/quotations/:id` | `QuotationDetails.tsx` | WorkspaceLayout | Quote view, PDF generation & convert buttons |
| `/sales-orders` | `SalesOrdersList.tsx` | WorkspaceLayout | Confirmed customer orders |
| `/sales-orders/new` | `SalesDocumentForm.tsx` | WorkspaceLayout | Create sales order |
| `/delivery-challans` | `DeliveryNotesList.tsx` | WorkspaceLayout | Goods dispatch documentation |
| `/delivery-challans/new`| `SalesDocumentForm.tsx` | WorkspaceLayout | Create dispatch note / delivery challan |
| `/invoices` | `InvoicesList.tsx` | WorkspaceLayout | Tax Invoices list, status tags & filters |
| `/invoices/new` | `SalesDocumentForm.tsx` | WorkspaceLayout | Comprehensive tax invoice creation form |
| `/invoices/:id` | `InvoiceDetails.tsx` | WorkspaceLayout | Full invoice view & action menu |
| `/invoices/:id/payment`| `InvoicePaymentPage.tsx` | WorkspaceLayout | Record receipt against invoice |
| `/invoices/:id/print` | `InvoicePrintView.tsx` | WorkspaceLayout | Printable invoice template view |
| `/receipts` | `ReceiptsList.tsx` | WorkspaceLayout | Payment received voucher list |
| `/receipts/new` | `ReceiptForm.tsx` | WorkspaceLayout | Create payment received & invoice allocation |
| `/recurring-invoices` | `RecurringInvoicesList.tsx` | WorkspaceLayout | Automated recurring invoice subscriptions |
| `/credit-notes` | `CreditNotesList.tsx` | WorkspaceLayout | Credit notes / sales returns |
| `/credit-notes/new` | `CreditNoteForm.tsx` | WorkspaceLayout | Issue credit note against sales invoice |
| `/vendors` | `VendorsList.tsx` | WorkspaceLayout | Vendor directory & payable balances |
| `/vendors/new` | `VendorForm.tsx` | WorkspaceLayout | Onboard supplier with MSME, GSTIN & bank details |
| `/vendors/:id` | `VendorProfile.tsx` | WorkspaceLayout | Supplier 360 view & purchase history |
| `/purchase-orders` | `PurchaseOrdersList.tsx` | WorkspaceLayout | PO management and order status |
| `/purchase-orders/new` | `PurchaseOrderForm.tsx` | WorkspaceLayout | Draft purchase order |
| `/bills` | `BillsList.tsx` | WorkspaceLayout | Vendor bills, payments pending & due dates |
| `/bills/new` | `BillForm.tsx` | WorkspaceLayout | Enter vendor invoice, tax breakdown & ITC |
| `/vendor-payments` | `PaymentsMadeList.tsx` | WorkspaceLayout | Supplier payment vouchers |
| `/vendor-payments/new` | `PaymentMadeForm.tsx` | WorkspaceLayout | Record payment to vendor against bills |
| `/debit-notes` | `VendorCreditsList.tsx` | WorkspaceLayout | Debit notes / vendor credits |
| `/debit-notes/new` | `VendorCreditForm.tsx` | WorkspaceLayout | Issue debit note for purchase return |
| `/expenses` | `ExpensesDashboard.tsx` | WorkspaceLayout | Expense recording, categories & trends |
| `/expenses/new` | `ExpenseForm.tsx` | WorkspaceLayout | Add business expense voucher |
| `/other-income` | `IncomeDashboard.tsx` | WorkspaceLayout | Non-sales income recording |
| `/banking` | `BankingDashboard.tsx` | WorkspaceLayout | Bank accounts, balances & cash accounts |
| `/bank-transactions` | `BankTransactionsList.tsx` | WorkspaceLayout | Statement log & contra transfers |
| `/reconciliation` | `ReconciliationCenter.tsx` | WorkspaceLayout | Bank vs book balance reconciliation |
| `/chart-of-accounts` | `ChartOfAccounts.tsx` | WorkspaceLayout | Hierarchical ledger account tree |
| `/accounting/ledger` | `LedgerInquiry.tsx` | WorkspaceLayout | General ledger search & statement |
| `/journal-entries` | `JournalVouchersList.tsx` | WorkspaceLayout | Manual double-entry journal vouchers |
| `/journal-entries/new`| `JournalVoucherForm.tsx` | WorkspaceLayout | Create multi-line journal voucher |
| `/capital` | `CapitalDashboard.tsx` | WorkspaceLayout | Equity, capital infusion & owner drawings |
| `/reports` | `ReportsCenter.tsx` | WorkspaceLayout | Centralized report browser (30+ reports) |
| `/reports/:reportKey` | `ReportViewer.tsx` | WorkspaceLayout | Dynamic interactive report viewer |
| `/gst` / `/taxes` | `TaxesDashboard.tsx` | WorkspaceLayout | GST compliance, GSTR-1 & GSTR-3B |
| `/employees` | `EmployeesList.tsx` | WorkspaceLayout | Employee master list |
| `/payroll` | `PayrollDashboard.tsx` | WorkspaceLayout | Payroll run overview & salary slips |
| `/payroll/generate` | `PayrollGenerationWizard.tsx`| WorkspaceLayout | Multi-step salary calculation wizard |
| `/attendance` | `AttendanceList.tsx` | WorkspaceLayout | Daily attendance register |
| `/settings` | `SettingsPage.tsx` | WorkspaceLayout | Full enterprise settings (16 sub-tabs) |
