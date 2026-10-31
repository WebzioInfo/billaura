# Bill Aura ERP — Master Video Training Manual & Operational Library

## Project Mission
To provide an exhaustive, authoritative, professional, and beginner-to-advanced software user manual and video production suite for **Bill Aura ERP / Billing SaaS**.

Bill Aura is an enterprise-grade multi-tenant SaaS application built with **React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, NestJS, Prisma, and PostgreSQL**. This training suite documents every operational module, navigation workflow, UI button, form field, action menu, dropdown selector, accounting entry, and statutory compliance process implemented in the actual codebase.

---

## Workspace Structure
```
BillAura_User_Manual_Videos/
├── 00_Project_Overview/
│   ├── MASTER_TRAINING_CURRICULUM.md
│   ├── ARCHITECTURE_AND_NAVIGATION_MAP.md
│   └── VIDEO_PRODUCTION_STANDARDS.md
├── 01_Feature_Inventory/
│   ├── MASTER_FEATURE_AND_BUTTON_INVENTORY.md
│   └── CRUD_AND_ACTION_MATRIX.md
├── 02_Test_Results/
│   ├── VERIFICATION_REPORT_AND_TEST_DATA.md
│   └── DEFECT_AND_LIMITATION_LOG.md
├── 03_Video_Scripts/
│   ├── Chapter_01_Workspace_Navigation.md
│   ├── Chapter_02_Company_Setup_And_Settings.md
│   ├── Chapter_03_Executive_Dashboard.md
│   ├── Chapter_04_Items_And_Units_Master.md
│   ├── Chapter_05_Inventory_Adjustments.md
│   ├── Chapter_06_Customers_And_CRM.md
│   ├── Chapter_07_Quotations_And_Estimates.md
│   ├── Chapter_08_Sales_Orders_And_Delivery_Challans.md
│   ├── Chapter_09_Invoices_And_Billing.md
│   ├── Chapter_10_Recurring_Invoices.md
│   ├── Chapter_11_Payments_Received_And_Receipts.md
│   ├── Chapter_12_Credit_Notes_And_Returns.md
│   ├── Chapter_13_Vendors_And_Suppliers.md
│   ├── Chapter_14_Purchase_Orders.md
│   ├── Chapter_15_Bills_And_Vendor_Payables.md
│   ├── Chapter_16_Payments_Made_And_Disbursals.md
│   ├── Chapter_17_Vendor_Credits_And_Debit_Notes.md
│   ├── Chapter_18_Expenses_And_Other_Income.md
│   ├── Chapter_19_Banking_And_Cash_Transactions.md
│   ├── Chapter_20_Bank_Reconciliation.md
│   ├── Chapter_21_Chart_Of_Accounts_And_Ledgers.md
│   ├── Chapter_22_Manual_Journals_And_Vouchers.md
│   ├── Chapter_23_Capital_And_Fixed_Assets.md
│   ├── Chapter_24_GST_And_Statutory_Taxes.md
│   ├── Chapter_25_Reports_Center_And_Analytics.md
│   ├── Chapter_26_HR_Employees_And_Payroll.md
│   ├── Chapter_27_Users_Roles_And_Permissions.md
│   ├── Chapter_28_Invoice_Templates_And_Branding.md
│   ├── Chapter_29_End_To_End_Connected_Workflows.md
│   └── Chapter_30_Backup_Security_And_Troubleshooting.md
├── 04_Screen_Recording_Plans/
│   └── SCREEN_RECORDING_DIRECTOR_GUIDE.md
├── 05_Voiceover_Scripts/
│   └── VOICEOVER_MASTER_NARRATION.md
├── 06_Subtitles_SRT/
│   ├── Chapter_01_Navigation.srt
│   ├── Chapter_02_CompanySetup.srt
│   ├── Chapter_03_ExecutiveDashboard.srt
│   ├── Chapter_04_ItemsMaster.srt
│   ├── Chapter_05_InventoryAdjustments.srt
│   ├── Chapter_06_Customers.srt
│   ├── Chapter_07_Quotations.srt
│   ├── Chapter_08_SalesOrders.srt
│   ├── Chapter_09_Invoices.srt
│   ├── Chapter_11_Receipts.srt
│   ├── Chapter_15_Bills.srt
│   ├── Chapter_19_Banking.srt
│   ├── Chapter_21_ChartOfAccounts.srt
│   ├── Chapter_24_GST_Taxes.srt
│   ├── Chapter_25_ReportsCenter.srt
│   └── Chapter_29_EndToEndWorkflows.srt
├── 07_Recorded_Videos/
│   └── RECORDED_VIDEOS_INDEX.md
├── 08_Edited_Final_Videos/
│   └── FINAL_PRODUCTION_CHECKLIST.md
├── 09_Screenshots/
│   └── SCREENSHOT_CATALOG.md
├── 10_User_Guides/
│   ├── QUICK_START_USER_GUIDE.md
│   ├── ACCOUNTANT_OPERATIONAL_HANDBOOK.md
│   └── GST_COMPLIANCE_AND_INVOICING_SOP.md
├── 11_Coverage_and_QA/
│   ├── TRACEABILITY_COVERAGE_MATRIX.md
│   └── QUALITY_ASSURANCE_SIGNOFF.md
└── README.md
```

---

## Core Operational Highlights
- **Multi-Tenant SaaS Foundation**: Enforces tenant data isolation via JWT, active company selection, and tenant-scoped Prisma database queries.
- **Zoho Books-style Navigation**: Features a persistent Dark Navy header (Search, Quick Create, Company Switcher, Notifications, User Menu), collapsible dual-state sidebar (Icon Rail & Expanded Menus), and dynamic Workspace Tab persistence.
- **Complete Invoicing Engine**: Supports GST tax breaks (CGST/SGST/IGST), discount tiers, round-off handling, dynamic QR payment codes, customizable template layouts, and PDF generation.
- **Double-Entry Accounting Backing**: All transactions link seamlessly to real General Ledger accounts, Chart of Accounts hierarchy, Trial Balance, Profit & Loss, and Balance Sheet.
- **Statutory GST Ready**: Built for Indian business operations, supporting HSN/SAC codes, reverse charge mechanism (RCM), place of supply, GSTR-1, and GSTR-3B reporting.
