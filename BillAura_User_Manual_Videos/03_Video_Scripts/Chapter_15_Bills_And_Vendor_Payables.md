# Bill Aura ERP Video Script — Chapter 15: Purchase Bills, Input Tax Credit (ITC) & Payables

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 15: Vendor Bills, Input Tax Credit (ITC), RCM & Accounts Payable
- **Module ID**: `MOD-15-BILLS`
- **Estimated Runtime**: 12:45
- **Prerequisites**: Vendors, Items/Expenses, and Chart of Accounts.
- **Target Audience**: Accounts payable officers, procurement managers, tax accountants, business owners.

---

## Instructional Sequence

### Section 1: Introduction (00:00 – 01:25)
- **On-Screen**: Navigate to `/bills` via sidebar `Purchases > Bills`.
- **Narration**:
  "Welcome back to Bill Aura ERP. Managing supplier expenditures, verifying incoming vendor invoices, and correctly claiming statutory Input Tax Credit (ITC) under GST is vital to protecting your bottom-line profitability and cash flow.
  
  In this chapter, you will learn how to enter purchase bills received from suppliers, manage bill dates and credit terms, classify Input Tax Credit eligibility under Section 16 and 17(5) of the GST Act, handle Reverse Charge Mechanism (RCM) transactions, and track your Accounts Payable obligations."

---

### Section 2: Explaining the Bills Register (`/bills`) (01:25 – 02:45)
- **On-Screen**: View `/bills`. Explain columns: Bill #, Vendor Name, Vendor Invoice Ref, Bill Date, Due Date, Total Amount, Balance Due, Status (`Open`, `Partially Paid`, `Paid`, `Overdue`).
- **Narration**:
  "The Bills register is your central accounts payable ledger.
  
  Notice the columns:
  - 'Bill Number': Your internal sequential voucher number (e.g. `BILL-2026-0001`).
  - 'Vendor Invoice Ref': The vendor's actual physical tax invoice number.
  - 'Due Date': The date payment must be disbursed to preserve vendor credit standing.
  - 'Balance Due': The remaining unpaid liability.
  
  Notice the aging indicators that flag bills due within seven days or bills currently overdue. Let us now record a vendor bill."

---

### Section 3: Recording a Purchase Bill (`/bills/new`) (02:45 – 07:45)
- **On-Screen**: Click gold `+ New Bill` button. `BillForm.tsx` loads.
- **Cursor Action**: Step-by-step entry:
  1. Vendor: Select `Delta Packaging Works`.
  2. Bill #: `BILL-2026-0001` (internal).
  3. Vendor Invoice Number: `DP-8841` (vendor's paper invoice #).
  4. Bill Date: `15th October 2026`.
  5. Due Date: Defaults to `14th November 2026` (Net 30 terms).
  6. ITC Eligibility: `Eligible for ITC`.
  7. RCM Toggle: `OFF`.
  8. Line Item: Select `Heavy Duty V-Belt B-52` (Qty: 50 PCS, Rate: ₹390.00).
  9. Expense Line: Select `Packaging & Forwarding Expense` (Amount: ₹1,500.00 + 18% GST).
- **Narration**:
  "Click '+ New Bill'.
  
  **1. Vendor & Header Details**
  In the 'Vendor' selector, choose 'Delta Packaging Works'. 
  Their registered office address, GSTIN ('27AABCD4321H1Z9'), and default payment terms populate automatically.
  
  In the 'Vendor Invoice Number' field, enter the invoice number printed on the supplier's actual document: 'DP-8841'. This is crucial for matching in GSTR-2B statutory reconciliations.
  
  Enter the 'Bill Date' as shown on the supplier's invoice. In 'Payment Terms', choose 'Net 30'. The payment due date calculates automatically.
  
  **2. Statutory ITC & Reverse Charge (RCM)**
  Now look at two critical Indian GST controls:
  
  First is **ITC Eligibility (Input Tax Credit)**:
  - 'Eligible for ITC': Select this for regular business purchases where tax paid can offset your sales tax liabilities.
  - 'Ineligible under Section 17(5)': Select this for blocked credits—such as corporate gifts, motor vehicles, or personal dining—ensuring the tax amount is added directly to expense cost rather than claimed as a tax credit.
  - We select 'Eligible for ITC'.
  
  Second is the **Reverse Charge (RCM)** toggle:
  If purchasing from an unregistered supplier or specific notified goods/services (such as freight from Goods Transport Agencies), toggle RCM to ON. This instructs Bill Aura to book tax liability under reverse charge. For regular GST suppliers, leave RCM OFF.
  
  **3. Adding Purchase Lines & Expense Allocations**
  Bill Aura allows you to combine inventory items and direct expense items on the same bill:
  
  - *Line 1 (Inventory)*: Select 'Heavy Duty V-Belt B-52'. Quantity '50' PCS at purchase cost of ₹ 390.00. Taxable total: ₹ 19,500.00. Tax slab: 18% GST.
  - *Line 2 (Direct Expense)*: Click '+ Add Expense Line'. Select 'Packaging & Freight Expense'. Amount: ₹ 1,500.00 at 18% GST.
  
  **4. Calculation Summary**
  Look at the bill total:
  - Total Taxable Value: ₹ 21,000.00
  - Input CGST (9%): ₹ 1,890.00
  - Input SGST (9%): ₹ 1,890.00
  - Total Bill Amount: ₹ 24,780.00.
  
  Click 'Save Bill'. The bill is posted into your accounts payable ledger."

---

### Section 4: General Ledger & Tax Accounting Impact (07:45 – 10:15)
- **On-Screen**: Open Ledger Inquiry (`/accounting/ledger`) in a separate workspace tab.
- **Callout Box**:
  ```
  Double-Entry Accounting Journal for Purchase Bill BILL-2026-0001:
  Debit:  Merchandise Inventory (50 V-Belts)       ₹ 19,500.00
  Debit:  Packaging & Freight Expense              ₹  1,500.00
  Debit:  Input CGST Credit (Current Asset)        ₹  1,890.00
  Debit:  Input SGST Credit (Current Asset)        ₹  1,890.00
  Credit: Accounts Payable - Delta Packaging       ₹ 24,780.00
  ```
- **Narration**:
  "Let us inspect the accounting and inventory impact:
  
  1. Merchandise Inventory asset increased by ₹ 19,500.00, and warehouse physical stock increased by 50 pieces.
  2. Operating Expenses increased by ₹ 1,500.00.
  3. Input Tax Credit accounts were debited with ₹ 3,780.00 total. When you calculate your monthly GST payment to the government, this ₹ 3,780.00 will directly reduce your cash tax liability!
  4. Accounts Payable (Delta Packaging) was credited with ₹ 24,780.00, appearing immediately under Total Payables on your dashboard."

---

### Section 5: Disbursing Vendor Payments (`/vendor-payments/new`) (10:15 – 12:45)
- **On-Screen**: Return to Bill Details. Click 'Record Payment'.
- **Narration**:
  "When your accounts team is ready to pay Delta Packaging:
  
  Click 'Record Payment' directly from the bill (or navigate to `Purchases > Payments Made`).
  
  Select your payment date, choose 'Paid From: HDFC Bank Current Account', select Payment Mode 'NEFT', and enter the bank UTR number.
  
  Click 'Save Payment'. The bill status updates to 'PAID', your bank ledger is credited, and your Accounts Payable balance to Delta Packaging is cleared to zero.
  
  In Chapter 16, we explore multi-bill vendor disbursals and remittance advice notes."
