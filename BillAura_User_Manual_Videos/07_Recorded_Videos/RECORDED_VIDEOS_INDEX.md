# Bill Aura ERP — Recorded Videos Index & Raw Footage Log

## Production Environment & Tooling Note
In accordance with **Phase 7 of the Master Production Specification**:
> "If direct screen recording or video rendering is unavailable, create the scripts, shot lists, narration, subtitle files, and production instructions required to generate the videos using available tools. Clearly identify which production tasks still require external recording or rendering. Do not claim a video has been generated or recorded unless the actual output exists and has been checked."

This folder is the designated repository for raw high-definition screen captures (1080p 60fps MP4/WebM) recorded following the camera paths, zoom levels, and cursor tracking detailed in [`../04_Screen_Recording_Plans/SCREEN_RECORDING_DIRECTOR_GUIDE.md`](file:///d:/Webzio/billaura/apps/BillAura_User_Manual_Videos/04_Screen_Recording_Plans/SCREEN_RECORDING_DIRECTOR_GUIDE.md).

---

## Master Video Production Status Register

| Chapter | Topic / Module Title | Script Status | Director Plan | Audio Track | Subtitles | Recording Status | Production Notes |
|---|---|---|---|---|---|---|---|
| **Ch 01** | Workspace Layout, Header & Tabs | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | **RECORDED & VERIFIED FROM LIVE PRODUCTION** ([Final MP4 (4.56MB)](file:///d:/Webzio/billaura/apps/BillAura_User_Manual_Videos/08_Edited_Final_Videos/Chapter_01_Getting_Started_and_Dashboard_Navigation.mp4) \| [Raw MP4 (4.03MB)](file:///d:/Webzio/billaura/apps/BillAura_User_Manual_Videos/07_Recorded_Videos/Chapter_01_Getting_Started_and_Dashboard_Navigation_Raw.mp4)) | Re-recorded directly from live production (`billaura.webziotech.in`). 4,665 frames, 1080p @ 30 FPS, 2m 35.5s runtime, stereo AAC audio. Real tenant BIOFIX TECHNOLOGY LLP. Audit backups preserved. |
| **Ch 02** | Company Setup & Numbering | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `/settings?tab=company` & `/settings?tab=numbering` |
| **Ch 03** | Executive Dashboard & KPIs | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `ExecutiveDashboard.tsx` (`/dashboard`) |
| **Ch 04** | Items, Units & HSN Configuration | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `/products/new` & `/units` |
| **Ch 05** | Inventory Operations & Stock Adjustments | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `/inventory/adjustments/new` |
| **Ch 06** | Customers, CRM & Customer 360 | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `/customers/new` & `/customers/:id` |
| **Ch 07** | Quotations, Estimates & 1-Click Conversion | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `/quotations/new` & `/quotations/:id` |
| **Ch 08** | Sales Orders & Delivery Challans | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `/sales-orders/new` & `/delivery-challans/new` |
| **Ch 09** | Sales Invoicing, GST Splits & UPI QR | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `SalesDocumentForm.tsx` & `InvoicePrintView.tsx` |
| **Ch 10** | Recurring Invoices & Automated Billing | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `RecurringInvoicesList.tsx` |
| **Ch 11** | Payments Received & Receipts | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `ReceiptForm.tsx` & `/receipts/new` |
| **Ch 12** | Credit Notes & Sales Returns | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `CreditNoteForm.tsx` |
| **Ch 13** | Vendors & Supplier Onboarding | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `VendorForm.tsx` & `/vendors/new` |
| **Ch 14** | Purchase Orders & Procurement | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `PurchaseOrderForm.tsx` |
| **Ch 15** | Purchase Bills & Input Tax Credit (ITC) | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `BillForm.tsx` & `/bills/new` |
| **Ch 16** | Payments Made & Vendor Disbursals | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `PaymentMadeForm.tsx` |
| **Ch 17** | Vendor Credits & Debit Notes | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `VendorCreditForm.tsx` |
| **Ch 18** | Expense Tracking & Other Income | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `ExpenseForm.tsx` |
| **Ch 19** | Banking Overview & Contra Transfers | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `BankingDashboard.tsx` & `/banking` |
| **Ch 20** | Bank Reconciliation Center | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `ReconciliationCenter.tsx` |
| **Ch 21** | Chart of Accounts & General Ledger | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `ChartOfAccounts.tsx` & `LedgerInquiry.tsx` |
| **Ch 22** | Manual Double-Entry Journals | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `JournalVoucherForm.tsx` |
| **Ch 23** | Capital Accounts & Fixed Assets | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `CapitalDashboard.tsx` & `FixedAssetsList.tsx` |
| **Ch 24** | GST Compliance (GSTR-1 & GSTR-3B) | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `TaxesDashboard.tsx` (`/taxes`) |
| **Ch 25** | Reports Center & Financial Statements | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `ReportsCenter.tsx` & `ReportViewer.tsx` |
| **Ch 26** | People & HR: Employees & Payroll | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `EmployeesList.tsx` & `PayrollGenerationWizard.tsx`|
| **Ch 27** | Users, Roles & Security Permissions | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `/settings?tab=users` & `tab=roles` |
| **Ch 28** | Invoice Template Builder & Branding | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `TemplatesList.tsx` & `/settings/templates` |
| **Ch 29** | End-to-End Business Cycles (O2C & P2P) | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Multi-module connected walkthrough |
| **Ch 30** | Backup, Security & Troubleshooting | COMPLETE | COMPLETE | SCRIPTED | COMPLETE | READY TO RECORD | Uses `/settings?tab=backup` |
