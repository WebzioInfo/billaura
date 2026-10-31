# Bill Aura ERP Video Script — Chapter 02: Company Setup, Master Configuration & Settings

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 2: Company Setup, Statutory Profile & Numbering Sequences
- **Module ID**: `MOD-02-SETUP`
- **Estimated Runtime**: 09:30
- **Prerequisites**: Administrator role access to Settings (`/settings`).
- **Target Audience**: Business owners, finance heads, chartered accountants, system administrators.

---

## Instructional Sequence

### Section 1: Introduction & Navigation (00:00 – 01:20)
- **On-Screen**: Click Settings Gear in header or navigate to `/settings?tab=company`.
- **Narration**:
  "Welcome back to Bill Aura ERP. Before generating your first invoice or booking customer transactions, your enterprise configuration and statutory tax profile must be properly established. 
  
  In this session, you will learn how to configure your company identity, upload your official logo, specify your legal GSTIN and PAN details, configure multi-location branches, establish default currencies, and create professional document numbering sequences for invoices and vouchers. Let us begin by navigating to System Settings."

---

### Section 2: Company Profile & Statutory Tax Setup (01:20 – 03:45)
- **On-Screen**: `SettingsPage.tsx` active on `Company` tab (`/settings?tab=company`).
- **Cursor Action**: Cursor highlights Company Name, Legal Name, GSTIN, PAN, Address, State, and Currency fields.
- **Narration**:
  "The Company tab contains the legal identity that will appear on all your printed tax invoices, estimates, and official statements.
  
  First, enter your Trade Name in the 'Company Name' field, and if your registered name differs, enter your legal corporate name in 'Legal Name'.
  
  Next is the GSTIN field. Enter your 15-character Goods and Services Tax Identification Number. For Indian registered businesses, notice that the first two digits represent your State Code—for example, 27 for Maharashtra, 29 for Karnataka, or 07 for Delhi. Once entered, Bill Aura validates the checksum and automatically maps your default State and Place of Supply.
  
  Directly below, enter your 10-digit Permanent Account Number (PAN) and your registered business email, telephone, and complete postal address including PIN Code.
  
  Notice the Currency selector. Bill Aura defaults to INR (Indian Rupee), but supports multi-currency configurations. 
  
  On the right, click 'Upload Logo'. Select a high-resolution PNG, JPG, or WebP file up to 5 megabytes. A live preview of your corporate emblem appears immediately. This logo will automatically brand your invoices, delivery challans, and customer payment receipts. Click the gold 'Save Changes' button at the bottom. A success toast confirms that your company master record is updated."

---

### Section 3: Branches & Multi-Location Configuration (03:45 – 05:30)
- **On-Screen**: Click on `Branches` tab in Settings (`/settings?tab=branches`).
- **Cursor Action**: Click `+ Add Branch` button. Modal drawer slides in from the right.
- **Narration**:
  "If your business operates across multiple warehouses, retail outlets, or regional offices, navigate to the Branches tab.
  
  Click the 'Add Branch' button. The branch creation drawer appears. Here, enter the Branch Name—such as 'Mumbai Central Warehouse' or 'Bengaluru Regional Office'—along with a unique Branch Code like 'MUM-01'. 
  
  Crucially, enter the Branch Address and Branch GSTIN if this location operates under a separate state registration. If the branch shares your corporate GSTIN, you can leave it blank to inherit company defaults. 
  
  Assigning transactions to specific branches enables branch-level inventory tracking and segmental Profit & Loss reporting. Click 'Save Branch'. The new branch appears in your active locations grid."

---

### Section 4: Document Numbering Sequences (05:30 – 07:15)
- **On-Screen**: Click on `Document Numbering` tab (`/settings?tab=numbering`).
- **Cursor Action**: Cursor highlights the sequences for Sales Invoices, Quotations, Bills, and Receipts.
- **Narration**:
  "Under Indian GST law, all tax invoices must possess a consecutive, non-repeating numbering sequence that can be alphanumeric and include special characters such as slashes or dashes.
  
  Click on the 'Document Numbering' tab. Here you see customizable sequences for each voucher type: Sales Invoices, Quotations, Sales Orders, Delivery Challans, Credit Notes, Purchase Orders, Bills, and Payment Receipts.
  
  Let us inspect the 'Sales Invoice' sequence. Click 'Edit'. You can configure:
  1. The Prefix: such as 'INV/2026-27/'
  2. The Starting Number: typically starting at '0001'
  3. The Suffix: optional departmental or branch suffix
  4. The Reset Frequency: set to 'Annual' so your sequence automatically resets to 0001 at the commencement of each new financial year on April 1st, or 'Never' for continuous numbering.
  
  Bill Aura provides an instant preview of your next generated number, like 'INV/2026-27/0001'. Once saved, every invoice issued by your team will automatically draw the next sequential number with zero risk of duplicate voucher errors."

---

### Section 5: Financial Year & Period Closing (07:15 – 08:30)
- **On-Screen**: Click on `Financial Year` tab (`/settings?tab=financial-year`).
- **Narration**:
  "Next, review your Financial Year settings. The standard accounting year for Indian entities runs from April 1st of the current calendar year to March 31st of the following year.
  
  Bill Aura automatically marks the active financial year. When your annual statutory audit concludes, authorized controllers can lock prior accounting periods. Locking a period prevents users from back-dating transactions, altering posted invoices, or modifying journal vouchers that have already been submitted to tax authorities."

---

### Section 6: Recovery & Troubleshooting (08:30 – 09:30)
- **On-Screen**: Intentionally enter an invalid GSTIN (e.g., 14 characters) to demonstrate live form validation error.
- **Callout Box**: `Validation Alert: GSTIN must be exactly 15 characters matching the format 22AAAAA0000A1Z5.`
- **Narration**:
  "If you ever enter an invalid GSTIN or mismatched PIN Code, Bill Aura highlights the offending field in red with a clear error prompt. The save button remains safely disabled until corrected, ensuring invalid tax data never enters your production database.
  
  If you need to change your company legal name or primary GSTIN later, you can update it here at any time. Existing historical invoices will maintain their original printed records, while all new documents immediately reflect your updated profile.
  
  In Chapter 3, we will explore the Executive Dashboard and learn how to interpret real-time business health KPIs."
