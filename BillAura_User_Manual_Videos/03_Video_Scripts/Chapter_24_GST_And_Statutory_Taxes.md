# Bill Aura ERP Video Script — Chapter 24: GST Compliance, GSTR-1 & GSTR-3B Reporting

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 24: GST Compliance, GSTR-1, GSTR-3B & Tax Liability Settlement
- **Module ID**: `MOD-24-GST`
- **Estimated Runtime**: 11:30
- **Prerequisites**: Sales invoices and purchase bills posted with GST rates.
- **Target Audience**: Tax accountants, chartered accountants, CFOs, business proprietors.

---

## Instructional Sequence

### Section 1: Introduction to Indian GST Architecture (00:00 – 01:30)
- **On-Screen**: Navigate to `/taxes` or `/gst` via sidebar. `TaxesDashboard.tsx` loads.
- **Narration**:
  "Welcome back to Bill Aura ERP. For Indian businesses, Goods and Services Tax (GST) compliance is not an optional task—it is an ongoing statutory requirement governed by strict monthly filing deadlines.
  
  In this chapter, you will learn how Bill Aura's GST engine automatically segregates your sales into statutory tables (B2B, B2C Large, B2C Small, Exports), compiles your outward supplies for GSTR-1, reconciles Input Tax Credit (ITC) for GSTR-3B, computes net tax payable to the government, and generates official JSON/Excel filing summaries."

---

### Section 2: Explaining the Taxes Dashboard (`/taxes`) (01:30 – 03:15)
- **On-Screen**: View `/taxes`. Explain top summary cards: Output Tax Liability, Eligible Input Tax Credit (ITC), Net GST Payable, Tax Filing Deadlines calendar.
- **Narration**:
  "The Taxes Dashboard provides an immediate statutory overview:
  
  Across the top cards:
  1. **Total Output Tax Collected**: The sum of all CGST, SGST, and IGST billed to your customers across sales invoices and debit notes.
  2. **Total Input Tax Credit (ITC)**: The tax paid to registered suppliers on purchase bills that is legally eligible to offset your output liability.
  3. **Net GST Payable**: Output Tax minus Input Tax Credit. If this number is positive, this is the exact cash tax amount required to be deposited in the Government Electronic Cash Ledger via Challan PMT-06. If negative, the excess ITC rolls forward as a credit asset!
  
  Beside the cards, the Filing Deadlines calendar tracks the 11th of the month for GSTR-1 and the 20th of the month for GSTR-3B."

---

### Section 3: GSTR-1 Outward Supplies Summary (03:15 – 06:45)
- **On-Screen**: Click on `GSTR-1` tab or report. Table breakdown displays: Table 4 (B2B Taxable Invoices), Table 5 (B2C Large), Table 7 (B2C Small), Table 9B (Credit/Debit Notes), Table 12 (HSN Summary).
- **Cursor Action**: Click on `Table 4 - B2B Invoices`. Show list of customer GSTINs, invoice numbers, taxable values, and tax splits.
- **Narration**:
  "Under Indian law, Form GSTR-1 is your monthly statement of outward supplies. Bill Aura automatically categorizes every invoice into the official GST portal tables:
  
  - **Table 4: B2B Invoices**: All taxable sales to registered businesses with valid GSTINs. Notice our invoice to Apex Solutions (`27AAACA9876E1Z5`) appears here with full invoice number, date, place of supply, taxable value, and CGST/SGST amounts.
  - **Table 7: B2C Small**: Retail sales to unregistered individuals within the state.
  - **Table 9B: Credit & Debit Notes**: Adjustments and sales returns issued during the tax period.
  - **Table 12: HSN Summary**: Mandated summary of all goods sold grouped by 4, 6, or 8-digit HSN codes, total quantities, taxable values, and tax rates.
  
  Look at the top right: click **'Export for GST Portal'**. Bill Aura generates the formatted Excel and JSON files ready for immediate upload to the GST offline tool or portal."

---

### Section 4: GSTR-3B Monthly Return Preparation (06:45 – 09:15)
- **On-Screen**: Click on `GSTR-3B` tab. Layout displays Table 3.1 (Tax on Outward Supplies), Table 4 (Eligible ITC).
- **Narration**:
  "Now inspect the **GSTR-3B Summary**. Unlike GSTR-1 which requires invoice-by-invoice data, GSTR-3B is a summary return where taxes are declared and paid.
  
  Look at **Table 3.1: Details of Outward Supplies**:
  - (a) Outward Taxable Supplies: Displays your total taxable turnover, total IGST, total CGST, and total SGST.
  - (b) Outward Taxable Supplies (Zero-rated / Exports).
  
  Now look at **Table 4: Eligible Input Tax Credit (ITC)**:
  - (A)(5) All Other ITC: Displays the total credit accrued from your purchase bills (such as the packaging materials and belts from Delta Packaging).
  - (B) Ineligible ITC under Section 17(5): Displays any blocked tax items entered during billing.
  
  Bill Aura performs the statutory offset rules: IGST credit is utilized first against IGST liability, then CGST, then SGST. CGST credit cannot be set off against SGST. The resulting Net Cash Payable column tells you exactly what to pay."

---

### Section 5: Statutory Audit Trail & Compliance Checklist (09:15 – 11:30)
- **On-Screen**: Show the Tax Ledger reports (`Output CGST Ledger`, `Input CGST Ledger`).
- **Narration**:
  "Underneath the tax dashboard, every figure is backed by real General Ledger tax accounts:
  - Output CGST Payable (Liability)
  - Output SGST Payable (Liability)
  - Output IGST Payable (Liability)
  - Input CGST Credit (Asset)
  - Input SGST Credit (Asset)
  - Input IGST Credit (Asset)
  
  When you pay the government via net banking at the end of the month, recording the tax payment voucher debits your Output Tax Liability and credits your Bank Account, closing the tax month cleanly with zero discrepancies.
  
  In Chapter 25, we will explore the comprehensive Reports Center and master 30+ financial statements."
