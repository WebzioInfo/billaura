# Bill Aura ERP — Master Feature & Button Inventory

This document represents the comprehensive, verifiable feature and button inventory across all accessible modules in the Bill Aura ERP application. Every control documented here exists in the codebase and maps directly to frontend components, state stores, and backend endpoints.

---

## 1. Global Shell & Navigation Controls

| Location / Container | Control Name | Type | Target / Action | API Endpoint / State | Business Impact & Operational Purpose |
|---|---|---|---|---|---|
| **AppHeader** | App Logo & Brand | Link | Navigates to `/dashboard` | `navigate('/dashboard')` | Returns user to the central executive dashboard. |
| **AppHeader** | Mobile Menu Toggle | Button | Opens mobile drawer | Local state `isMobileOpen` | Allows smartphone and tablet navigation collapse. |
| **AppHeader** | Search Scope Dropdown | Select | Filters module query | Local state `selectedModule` | Scopes quick search to Invoices, Customers, Items, Bills, etc. |
| **AppHeader** | Search Input Box | Input | Debounced keyword search | `/api/search/global?q=...` | Instantly displays matching documents across tenants. |
| **AppHeader** | Quick Create (`+`) | Dropdown | Opens multi-group quick actions | UI Flyout | Fast-track creation of Invoices, Quotes, Customers, Bills, Journals. |
| **AppHeader** | Recent History | Button | Opens flyout of recent pages | `localStorage: billaura_recent_history` | Re-open last 10 viewed documents. |
| **AppHeader** | Company Switcher | Dropdown | Lists tenant companies/branches | `/api/auth/switch-company` | Switches tenant context safely without clearing session. |
| **AppHeader** | Notification Bell | Button | Unread count badge & flyout | `/api/notifications` | View system alerts, approval requests & payment notifications. |
| **AppHeader** | Settings Gear | Icon Button | Navigates to `/settings` | `navigate('/settings?tab=company')` | Direct access to enterprise master settings. |
| **AppHeader** | User Avatar / Profile | Dropdown | Profile, Help & Logout | `authService.logout()` | Manages user credentials, active sessions, and logs out securely. |
| **WorkspaceTabs** | Workspace Tab | Tab Item | Switches active open document | `useWorkspaceStore.setActiveTab()` | Multi-tasking without page reload or data loss. |
| **WorkspaceTabs** | Close Tab (`X`) | Button | Closes tab voucher | `useWorkspaceStore.closeTab()` | Dismisses tab from active workspace memory. |
| **AppSidebar** | Collapse Toggle | Button | Toggles rail vs full menu | `localStorage: sidebar-collapsed` | Maximizes screen real estate for wide accounting tables. |
| **AppSidebar** | Nav Group Trigger | Accordion | Expands/collapses sub-menus | Local state `openGroups` | Groups related business modules (Items, Sales, Purchases, Banking, etc.). |

---

## 2. Items & Inventory Management

### A. Items / Products List (`/products`)
| UI Control / Column | Control Type | Parameters / Payload | Connected Endpoint | Downstream Accounting & Inventory Impact |
|---|---|---|---|---|
| **"New Item" Button** | Primary Button | Navigates to `/products/new` | `navigate('/products/new')` | Opens complete item master creation form. |
| **Item Type Tabs** | Filter Tabs | `All`, `Goods`, `Services` | Query param `type=GOODS/SERVICES` | Distinguishes physical inventory items from non-stock services. |
| **Search Bar** | Text Input | Query string (`name`, `sku`, `hsn`) | `GET /api/inventory/items?search=...` | Real-time filtering by item description, code, or HSN. |
| **Category Filter** | Dropdown | Category ID | `GET /api/inventory/items?categoryId=...` | Filters items by product line or department. |
| **Stock Status Filter** | Dropdown | `In Stock`, `Low Stock`, `Out of Stock` | Computed client/server filter | Highlights items requiring replenishment. |
| **Row Actions (Three-dots)**| Dropdown Menu | `Edit`, `View Details`, `Adjust Stock`, `Delete` | `PATCH /api/inventory/items/:id`, `DELETE ...` | Direct maintenance of item prices, tax rates, and active state. |
| **Export Items** | Secondary Button | Generates XLSX / CSV file | `GET /api/inventory/items/export` | Downloads product catalog for bulk editing or audits. |

### B. Product Form (`/products/new`, `/products/:id/edit`)
| Form Section | Field Name | Input Type | Validation Rules | Business Meaning & Rules |
|---|---|---|---|---|
| **Basic Info** | Item Type | Radio / Toggle | Required (`GOODS` or `SERVICE`) | Determines whether stock tracking and inventory valuation apply. |
| **Basic Info** | Item Name | Text Input | Required, min 2 chars | Official name displayed on invoices and purchase bills. |
| **Basic Info** | SKU / Item Code | Text Input | Unique within tenant | Stock Keeping Unit used for barcode scanning and tracking. |
| **Basic Info** | Unit of Measure | Searchable Select | Required (e.g., `PCS`, `KGS`, `BOX`) | Determines billing unit and stock conversion ratios. |
| **Basic Info** | Category & Brand | Select Dropdowns | Optional | Groups items for sales reporting and inventory analytics. |
| **Tax & Statutory** | HSN / SAC Code | Text Input | 4–8 digits (GST standard) | Mandatory for Indian GST invoices to determine tax eligibility. |
| **Tax & Statutory** | Tax Slab (GST %) | Select Dropdown | 0%, 5%, 12%, 18%, 28%, Exempt | Automatically splits tax into CGST+SGST or IGST on invoices. |
| **Sales Info** | Selling Price | Currency Input | Required numeric >= 0 | Default unit rate populated when adding item to invoices/quotes. |
| **Sales Info** | Sales Account | Select Dropdown | Default: `Sales Account (Revenue)` | General Ledger account credited upon invoicing. |
| **Purchase Info**| Purchase Price | Currency Input | Numeric >= 0 | Default cost price populated on purchase orders and bills. |
| **Purchase Info**| Cost of Goods Account| Select Dropdown | Default: `Cost of Goods Sold (Expense)` | COGS account debited when stock is sold. |
| **Inventory Info**| Track Inventory | Toggle Switch | Applicable to Goods | Enables warehouse stock levels and stock movement logs. |
| **Inventory Info**| Opening Stock | Number Input | Numeric >= 0 | Initial quantity on hand as of the books opening date. |
| **Inventory Info**| Opening Stock Rate | Currency Input | Required if opening stock > 0 | Establishes starting inventory valuation on the Balance Sheet. |
| **Inventory Info**| Reorder Point | Number Input | Optional | Triggers low-stock warning indicators on dashboards. |
| **Action Bar** | "Save Item" Button | Primary Button | Form submit with Zod validation | Posts payload to `POST /api/inventory/items`. |
| **Action Bar** | "Cancel" Button | Secondary Button | Returns to `/products` | Discards uncommitted changes. |

### C. Units of Measure Master (`/units`)
- **Add Unit Modal**: Unit Name (e.g. `Kilogram`), Unit Code (`KGS`), UQC Code (Standard GST Unique Quantity Code), Decimal Places (0 to 4).
- **Edit & Delete Actions**: Validates whether unit is currently utilized by active items.

### D. Inventory Adjustments (`/inventory`, `/inventory/adjustments/new`)
- **Adjustment Type**: `Quantity Adjustment` or `Value Adjustment`.
- **Reference Number**: Auto-generated sequence (`ADJ-0001`).
- **Adjustment Account**: Selects Inventory Adjustment expense account (credited/debited to balance stock valuation changes).
- **Reason Code**: Dropdown (`Stock on hand check`, `Damaged goods`, `Stock write-off`, `Theft/Shrinkage`, `Inventory revaluation`).
- **Line Items Grid**: Item selector, current stock (read-only), new quantity on hand or quantity adjusted (+/-), unit cost, total value adjustment.

---

## 3. Customers & CRM Management

### A. Customers List (`/customers`)
| Control / Column | Type | Target / Payload | Business Purpose |
|---|---|---|---|
| **"New Customer"** | Button | Navigates to `/customers/new` | Onboards new buyer or business partner. |
| **Customer Type Tabs**| Tabs | `All`, `B2B Companies`, `B2C Individuals` | Segregates registered GST businesses from retail consumers. |
| **Search & Filters** | Searchbox | Name, Phone, Email, GSTIN | Fast retrieval of account records. |
| **Receivables KPI** | KPI Card | Sum of unpaid invoices | Shows total outstanding balance across all customers. |
| **Customer Row** | Table Row | Navigates to `/customers/:id` | Opens Customer 360 profile with ledger and transactions. |

### B. Customer Form (`/customers/new`, `/customers/:id/edit`)
- **Business Details**: Customer Type (`Business` or `Individual`), Display Name, Company Legal Name, Primary Contact Person (Salutation, First Name, Last Name), Email, Phone, Mobile.
- **Statutory & Tax**:
  - GST Treatment: `Registered Business - Regular`, `Registered Business - Composition`, `Unregistered Business`, `Consumer`, `Overseas / Export`, `Special Economic Zone (SEZ)`.
  - GSTIN: Validates 15-character Indian GST format (`22AAAAA0000A1Z5`). Auto-populates State and State Code.
  - PAN: 10-character Permanent Account Number.
- **Address Management**:
  - Billing Address: Attention, Country, Address Line 1 & 2, City, State/Province, PIN Code.
  - Shipping Address: Checkbox "Copy billing address" or discrete shipping address for e-Way bills.
- **Financial & Payment Terms**:
  - Currency: Defaults to INR.
  - Payment Terms: `Due on Receipt`, `Net 15`, `Net 30`, `Net 45`, `Net 60`.
  - Credit Limit: Numeric ceiling; triggers warning if open invoices exceed this amount.
  - Opening Balance: Starting receivables balance as of financial year start date.

---

## 4. Sales & Invoicing Pipeline

### A. Quotations / Estimates (`/quotations`, `/quotations/new`, `/quotations/:id`)
- **Header Fields**: Customer Selector, Quote Number (`QT-YYYY-XXXX`), Reference Number, Quote Date, Expiry Date, Payment Terms.
- **Item Grid**: Item search/select, Description, HSN Code, Quantity, Unit, Rate, Discount (% or Flat), Tax Slab, Amount.
- **Summary Section**: Subtotal, Discount, CGST, SGST, IGST, Round-off, Total Amount.
- **Customer Notes & Terms**: Standard terms & conditions, validity statement.
- **Detail Page Actions**:
  - `Convert to Invoice`: Automatically copies quote lines into a new draft invoice (`/invoices/new?fromQuote=...`).
  - `Convert to Sales Order`: Converts quotation into a confirmed sales order.
  - `Download PDF`: Generates branded quote PDF.
  - `Send via Email`: Opens email modal with quote attachment.
  - `Mark as Accepted / Declined`: Updates quotation status lifecycle.

### B. Sales Invoices (`/invoices`, `/invoices/new`, `/invoices/:id`)
| Control Name | Type | Action / Endpoint | Business Rule & Ledger Impact |
|---|---|---|---|
| **Invoice Number** | Text Input | Sequence generator | Unique statutory sequence (e.g., `INV-2026-001`). Cannot have gaps. |
| **Invoice Date & Due Date**| Date Picker | Determines aging bucket | Controls AR Aging reports (Current, 1-30, 31-60, 61-90, 90+ days). |
| **Place of Supply** | Dropdown | Indian States list | Critical: Determines Inter-state (IGST) vs Intra-state (CGST + SGST). |
| **Line Items Table** | Dynamic Grid | Adds/removes item rows | Computes line total, tax breakdown, and HSN tax summary. |
| **Apply Discount** | Input / Select | Line-level or invoice-level | Deducts discount before computing GST liability. |
| **Round Off** | Computed Toggle | +/- paise to nearest rupee | Ensures final payable amount has no fractional decimals. |
| **"Save as Draft"** | Button | `POST /api/sales/invoices (status: DRAFT)` | Saves record without posting to accounting ledgers. |
| **"Save and Issue"** | Button | `POST /api/sales/invoices (status: ISSUED)` | Posts to General Ledger: Debits Accounts Receivable, Credits Sales Revenue & Tax Payable. Decrements inventory stock. |
| **"Record Payment"** | Button | Navigates to `/invoices/:id/payment` | Opens receipt allocation screen to record customer payment. |
| **"Print / Download PDF"**| Button | Navigates to `/invoices/:id/print` | Renders print-ready GST tax invoice with QR code and bank details. |

### C. Receipts / Payments Received (`/receipts`, `/receipts/new`)
- **Payment Header**: Customer selector, Receipt Number, Payment Date, Payment Mode (`Cash`, `Bank Transfer / NEFT / RTGS`, `Cheque`, `UPI / QR`), Deposit-To Account (Bank or Cash ledger).
- **Tax Deducted (TDS)**: Checkbox to record TDS deducted by customer under Section 194C / 194J.
- **Unpaid Invoices Grid**: Displays all open invoices for selected customer with Invoice #, Date, Invoice Amount, Balance Due, and "Payment Amount" input.
- **"Auto-Allocate" Button**: Allocates total received amount sequentially against oldest open invoices first.
- **Unallocated Excess**: Excess amount recorded as "Customer Advance / Unearned Revenue" available for future invoice offsets.

---

## 5. Purchases & Payables Pipeline

### A. Vendors Master (`/vendors`, `/vendors/new`, `/vendors/:id`)
- Vendor profile, GSTIN verification, MSME Category (Micro, Small, Medium), Bank Account details (Bank Name, Account #, IFSC Code), Opening balance.

### B. Purchase Bills (`/bills`, `/bills/new`)
- **Bill Number**: Supplier's actual tax invoice number.
- **Vendor Selector & Bill Date**: Supplier invoice date and due date.
- **ITC Eligibility**: Dropdown (`Eligible for ITC`, `Ineligible under Section 17(5)`, `ITC to be reversed`).
- **Reverse Charge (RCM)**: Toggle for transactions where buyer is liable to pay GST directly to government.
- **Line Items & Expenses**: Assigns purchases to Inventory or Direct/Indirect Expense ledger accounts.
- **Ledger Impact on Save**: Debits Inventory/Expense, Debits Input Tax Credit (CGST/SGST/IGST), Credits Accounts Payable (Vendor).

### C. Vendor Payments (`/vendor-payments`, `/vendor-payments/new`)
- Vendor selection, Payment Date, Paid From (Bank/Cash Account), Settlement against open bills, Cheque/Reference number.
- **Ledger Impact**: Debits Accounts Payable (Vendor), Credits Bank/Cash Account.

---

## 6. Banking & Cash Management

### A. Banking Dashboard (`/banking`)
- Displays all configured Bank Accounts, Credit Cards, and Petty Cash registers with Book Balances vs Bank Balances.

### B. Bank Transactions & Transfers (`/bank-transactions`)
- **New Transaction**: `Deposit`, `Withdrawal`, or `Transfer (Contra)`.
- **Contra Transfer**: Moves funds between two company accounts (e.g. Cash withdrawal from HDFC Bank to Petty Cash). Automatically enforces balanced double entry.

### C. Bank Reconciliation Center (`/reconciliation`)
- Upload bank statement (CSV/OFX).
- Side-by-side matching of statement transactions against Bill Aura book transactions.
- "Match", "Create Voucher", and "Clear Transaction" actions.

---

## 7. Accountant, General Ledger & Reports

### A. Chart of Accounts (`/chart-of-accounts`)
- Five master accounting root groups:
  1. **Assets** (Current Assets, Cash & Bank, Accounts Receivable, Inventory, Fixed Assets).
  2. **Liabilities** (Current Liabilities, Accounts Payable, Taxes Payable, Loans).
  3. **Equity** (Owner's Capital, Retained Earnings, Drawings).
  4. **Revenue** (Operating Sales, Other Income, Interest).
  5. **Expenses** (Cost of Goods Sold, Operating Expenses, Administrative Expenses, Depreciation).
- Actions: "Add New Account", "Edit Account Name/Code", "View Account Ledger".

### B. Manual Journals (`/journal-entries`, `/journal-entries/new`)
- Double-entry voucher creation with multiple debit and credit rows.
- Validates strictly that **Total Debits == Total Credits** before saving.
- Optional tags: Branch, Department, Project / Cost Center.

### C. Reports Center (`/reports`)
- 30+ categorized reports with live filters (Date range, Cash vs Accrual basis, Prior period comparison, Excel/PDF export):
  - **Financial Statements**: Profit & Loss, Balance Sheet, Cash Flow Statement, Trial Balance.
  - **Ledgers**: General Ledger, Day Book, Journal Book.
  - **Sales & Receivables**: Sales Register, Customer Balances Summary, AR Aging Summary.
  - **Purchases & Payables**: Purchase Register, Vendor Balances Summary, AP Aging Summary.
  - **Taxes**: GST Summary Report, GSTR-1 preparation, GSTR-3B tax liability sheet.
