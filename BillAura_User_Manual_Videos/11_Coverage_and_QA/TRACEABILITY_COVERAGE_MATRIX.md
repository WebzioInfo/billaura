# Bill Aura ERP — Traceability Coverage Matrix

This matrix establishes 100% end-to-end traceability from every accessible module, route, UI control, and business action discovered in the Bill Aura codebase to its instructional video chapter, script, and quality assurance outcome.

| Discovered Module | Accessible Route | Key Action / UI Control | Assigned Video Chapter | Script & Director Plan Reference | Verification & QA Status |
|---|---|---|---|---|---|
| **Global Shell** | `/dashboard`, Layout | AppHeader, Quick Create `+`, Org Switcher, Notifications, Search | Chapter 01 | `Chapter_01_Workspace_Navigation.md` | **PASSED & VERIFIED** |
| **Workspace Engine** | All internal routes | Multi-Document Workspace Tabs, Close `X`, Tab Persistence | Chapter 01 | `Chapter_01_Workspace_Navigation.md` | **PASSED & VERIFIED** |
| **Sidebar Rail** | All internal routes | Collapsible Rail, Hover Flyouts, Nav Group Accordions | Chapter 01 | `Chapter_01_Workspace_Navigation.md` | **PASSED & VERIFIED** |
| **Command Palette**| Global (`Ctrl + /`) | Instant Command Search & Route Jumping | Chapter 01 | `Chapter_01_Workspace_Navigation.md` | **PASSED & VERIFIED** |
| **Company Master** | `/settings?tab=company`| Company Details, GSTIN, PAN, Logo Upload, Address | Chapter 02 | `Chapter_02_Company_Setup_And_Settings.md` | **PASSED & VERIFIED** |
| **Branches** | `/settings?tab=branches`| Multi-Branch Creation, Branch GSTIN, Regional Addresses | Chapter 02 | `Chapter_02_Company_Setup_And_Settings.md` | **PASSED & VERIFIED** |
| **Numbering Engine**| `/settings?tab=numbering`| Prefix, Suffix, Starting Number, Annual Sequence Resets | Chapter 02 | `Chapter_02_Company_Setup_And_Settings.md` | **PASSED & VERIFIED** |
| **Financial Year** | `/settings?tab=financial-year`| Financial Year Setup, Period Closing, Historical Lock | Chapter 02 | `Chapter_02_Company_Setup_And_Settings.md` | **PASSED & VERIFIED** |
| **Executive Dash** | `/dashboard` | Receivables KPI, Payables KPI, Cash Balances, Net Profit | Chapter 03 | `Chapter_03_Executive_Dashboard.md` | **PASSED & VERIFIED** |
| **Trend Analytics** | `/dashboard` | Income vs Expense Graph, Cash Flow Preview, Recent Items | Chapter 03 | `Chapter_03_Executive_Dashboard.md` | **PASSED & VERIFIED** |
| **Units Master** | `/units` | Add Unit, Unit Code, GST UQC Mapping, Decimal Precision | Chapter 04 | `Chapter_04_Items_And_Units_Master.md` | **PASSED & VERIFIED** |
| **Categories & Brands**| `/categories`, `/brands`| Hierarchical Item Groups, Manufacturer Brand Links | Chapter 04 | `Chapter_04_Items_And_Units_Master.md` | **PASSED & VERIFIED** |
| **Items Master** | `/products`, `/products/new`| Goods vs Service Toggle, HSN Code, Tax Slab, Sale/Cost Price | Chapter 04 | `Chapter_04_Items_And_Units_Master.md` | **PASSED & VERIFIED** |
| **Stock Tracking** | `/products/new` | Opening Stock Qty, Opening Stock Rate, Reorder Alert | Chapter 04 | `Chapter_04_Items_And_Units_Master.md` | **PASSED & VERIFIED** |
| **Stock Adjustments**| `/inventory`, `/inventory/adjustments/new`| Quantity/Value Adjustment, Reason Codes, Offset Account | Chapter 05 | `Chapter_05_Inventory_Adjustments.md` | **PASSED & VERIFIED** |
| **Customers Master**| `/customers`, `/customers/new`| B2B/B2C, GSTIN Validation, State Code, Billing/Shipping Address | Chapter 06 | `Chapter_06_Customers_And_CRM.md` | **PASSED & VERIFIED** |
| **Customer Segments**| `/customer-segments`| Customer Tiers, Segment Discount Rules | Chapter 06 | `Chapter_06_Customers_And_CRM.md` | **PASSED & VERIFIED** |
| **Customer 360** | `/customers/:id` | Customer Profile, Ledger Statements, Unused Credits | Chapter 06 | `Chapter_06_Customers_And_CRM.md` | **PASSED & VERIFIED** |
| **Quotations** | `/quotations`, `/quotations/new`| Line items, Discounts, Expiry Dates, Branded PDF Preview | Chapter 07 | `Chapter_07_Quotations_And_Estimates.md` | **PASSED & VERIFIED** |
| **Quote Conversion**| `/quotations/:id` | 1-Click Convert to Sales Order or Tax Invoice | Chapter 07 | `Chapter_07_Quotations_And_Estimates.md` | **PASSED & VERIFIED** |
| **Sales Orders** | `/sales-orders`, `/sales-orders/new`| Order Confirmation, Customer PO Ref, Fulfillment Status | Chapter 08 | `Chapter_08_Sales_Orders_And_Delivery_Challans.md` | **PASSED & VERIFIED** |
| **Delivery Challans**| `/delivery-challans/new`| Transporter Name, Vehicle #, LR #, 3-Copy Challan Print | Chapter 08 | `Chapter_08_Sales_Orders_And_Delivery_Challans.md` | **PASSED & VERIFIED** |
| **Sales Invoicing** | `/invoices`, `/invoices/new`| Tax Invoices, Multi-line Taxes, Round-off, Dynamic UPI QR | Chapter 09 | `Chapter_09_Invoices_And_Billing.md` | **PASSED & VERIFIED** |
| **Invoice Ledger** | `/accounting/ledger` | Automated AR Debit, Revenue Credit, Output Tax Credit | Chapter 09 | `Chapter_09_Invoices_And_Billing.md` | **PASSED & VERIFIED** |
| **Invoice Print** | `/invoices/:id/print`| PDF Download, Thermal Print, WhatsApp & Email Sharing | Chapter 09 | `Chapter_09_Invoices_And_Billing.md` | **PASSED & VERIFIED** |
| **Recurring Invoices**| `/recurring-invoices`| Subscription Profiles, Monthly/Weekly Billing Schedules | Chapter 10 | `Chapter_10_Recurring_Invoices.md` | **PASSED & VERIFIED** |
| **Payments Received**| `/receipts`, `/receipts/new`| Bank/Cash Selection, Auto-Allocate against Invoices, TDS | Chapter 11 | `Chapter_11_Payments_Received_And_Receipts.md` | **PASSED & VERIFIED** |
| **Customer Advances**| `/receipts/new` | Excess Payment Holding as Current Liability | Chapter 11 | `Chapter_11_Payments_Received_And_Receipts.md` | **PASSED & VERIFIED** |
| **Credit Notes** | `/credit-notes`, `/credit-notes/new`| Sales Returns, Reason Codes, Tax Reversal, Invoice Linking | Chapter 12 | `Chapter_12_Credit_Notes_And_Returns.md` | **PASSED & VERIFIED** |
| **Vendors Master** | `/vendors`, `/vendors/new`| Vendor Onboarding, GSTIN, MSME Status, Bank Details | Chapter 13 | `Chapter_13_Vendors_And_Suppliers.md` | **PASSED & VERIFIED** |
| **Purchase Orders** | `/purchase-orders`, `/purchase-orders/new`| Procurement Tracking, Line Items, Expected Delivery Date | Chapter 14 | `Chapter_14_Purchase_Orders.md` | **PASSED & VERIFIED** |
| **Purchase Bills** | `/bills`, `/bills/new` | Vendor Invoices, Input Tax Credit (ITC), Reverse Charge (RCM)| Chapter 15 | `Chapter_15_Bills_And_Vendor_Payables.md` | **PASSED & VERIFIED** |
| **Payments Made** | `/vendor-payments`, `/vendor-payments/new`| Vendor Disbursals, Multi-Bill Settlement, Bank UTR Refs | Chapter 16 | `Chapter_16_Payments_Made_And_Disbursals.md` | **PASSED & VERIFIED** |
| **Vendor Credits** | `/debit-notes`, `/debit-notes/new`| Debit Notes for Purchase Returns, Adjusting Future Bills | Chapter 17 | `Chapter_17_Vendor_Credits_And_Debit_Notes.md` | **PASSED & VERIFIED** |
| **Expenses** | `/expenses`, `/expenses/new`| Operating Expenses, Direct Costs, Expense Receipts | Chapter 18 | `Chapter_18_Expenses_And_Other_Income.md` | **PASSED & VERIFIED** |
| **Banking Overview**| `/banking` | Account Watchlist, Book Balances, Un-cleared Transactions | Chapter 19 | `Chapter_19_Banking_And_Cash_Transactions.md` | **PASSED & VERIFIED** |
| **Contra Transfers**| `/banking` modal | Inter-Account Movement (Bank to Cash / Bank to Bank) | Chapter 19 | `Chapter_19_Banking_And_Cash_Transactions.md` | **PASSED & VERIFIED** |
| **Reconciliation** | `/reconciliation` | Bank Statement Upload, Transaction Matching, Balance Reconcile| Chapter 20 | `Chapter_20_Bank_Reconciliation.md` | **PASSED & VERIFIED** |
| **Chart of Accounts**| `/chart-of-accounts` | Five Master Roots, Add Custom Ledger, System Account Locks | Chapter 21 | `Chapter_21_Chart_Of_Accounts_And_Ledgers.md` | **PASSED & VERIFIED** |
| **Ledger Inquiry** | `/accounting/ledger` | Forensic Account Drill-Down, Running Balances, Excel Export | Chapter 21 | `Chapter_21_Chart_Of_Accounts_And_Ledgers.md` | **PASSED & VERIFIED** |
| **Manual Journals**| `/journal-entries`, `/journal-entries/new`| Multi-Line Double Entry, Debit = Credit Rule, Audit Notes | Chapter 22 | `Chapter_22_Manual_Journals_And_Vouchers.md` | **PASSED & VERIFIED** |
| **Capital & Assets**| `/capital`, `/fixed-assets`| Equity Infusion, Owner Drawings, Asset Register, Depreciation | Chapter 23 | `Chapter_23_Capital_And_Fixed_Assets.md` | **PASSED & VERIFIED** |
| **GST Dashboard** | `/taxes`, `/gst` | Output Tax vs Input Tax Credit, Net Liability Calculation | Chapter 24 | `Chapter_24_GST_And_Statutory_Taxes.md` | **PASSED & VERIFIED** |
| **GSTR-1 & GSTR-3B**| `/taxes` | Table 4 B2B, Table 7 B2C, Table 12 HSN, GST Portal Export | Chapter 24 | `Chapter_24_GST_And_Statutory_Taxes.md` | **PASSED & VERIFIED** |
| **Reports Center** | `/reports` | 30+ Categorized Reports, Search, Favorites, Timestamps | Chapter 25 | `Chapter_25_Reports_Center_And_Analytics.md` | **PASSED & VERIFIED** |
| **Financial Stmts** | `/reports/profit-and-loss`, `/reports/balance-sheet`| Dynamic P&L, Balance Sheet, Accrual vs Cash Basis, Excel Export| Chapter 25 | `Chapter_25_Reports_Center_And_Analytics.md` | **PASSED & VERIFIED** |
| **Aging Analytics**| `/reports/ar-aging`, `/reports/ap-aging`| Chronological Overdue Buckets (Current, 30, 60, 90+ days) | Chapter 25 | `Chapter_25_Reports_Center_And_Analytics.md` | **PASSED & VERIFIED** |
| **HR & Employees** | `/employees`, `/attendance`| Staff Profiles, Monthly Attendance Registers | Chapter 26 | `Chapter_26_HR_Employees_And_Payroll.md` | **PASSED & VERIFIED** |
| **Payroll Wizard** | `/hr/payroll/generate`, `/payroll`| Salary Component Calculations, Payslips, Bank Disbursals | Chapter 26 | `Chapter_26_HR_Employees_And_Payroll.md` | **PASSED & VERIFIED** |
| **Users & Security**| `/settings?tab=users`, `tab=roles`| User Invites, Granular Role Permissions, Audit Logs, 2FA | Chapter 27 | `Chapter_27_Users_Roles_And_Permissions.md` | **PASSED & VERIFIED** |
| **Template Engine** | `/settings/templates` | Invoice Layout Customization, Colors, Fonts, Header/Footer | Chapter 28 | `Chapter_28_Invoice_Templates_And_Branding.md` | **PASSED & VERIFIED** |
| **Connected O2C** | Multi-module | Quote -> Sales Order -> Delivery Challan -> Invoice -> Receipt | Chapter 29 | `Chapter_29_End_To_End_Connected_Workflows.md` | **PASSED & VERIFIED** |
| **Connected P2P** | Multi-module | Purchase Order -> Bill -> Payment Made -> Stock -> AP Ledger | Chapter 29 | `Chapter_29_End_To_End_Connected_Workflows.md` | **PASSED & VERIFIED** |
| **Admin & Backup** | `/settings?tab=backup` | Automated Database Backups, Troubleshooting SOPs | Chapter 30 | `Chapter_30_Backup_Security_And_Troubleshooting.md` | **PASSED & VERIFIED** |
