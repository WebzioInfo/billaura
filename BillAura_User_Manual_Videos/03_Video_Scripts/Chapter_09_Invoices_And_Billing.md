# Bill Aura ERP Video Script — Chapter 09: Sales Invoicing, GST Taxes & Invoice Lifecycle

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 9: Complete Sales Invoicing, GST Breakdown, Lifecycle & Printing
- **Module ID**: `MOD-09-INVOICES`
- **Estimated Runtime**: 14:30
- **Prerequisites**: Customers, Items, and Tax configuration.
- **Target Audience**: Billing executives, accountants, business owners, audit controllers.

---

## Instructional Sequence

### Section 1: Introduction (00:00 – 01:30)
- **On-Screen**: Navigate to `/invoices` via sidebar `Sales > Invoices`.
- **Narration**:
  "Welcome back to Bill Aura ERP. Sales Invoicing is the revenue engine of your business. In an Indian statutory context, a sales invoice is not merely a payment request—it is a legally binding tax document that establishes your GST output liability, decrements inventory stock, populates your GSTR-1 return, and establishes your Accounts Receivable ledger balance.
  
  In this masterclass chapter, you will learn how to create tax invoices from scratch, master multi-tier line item calculations, handle discounts and round-offs, verify intra-state versus inter-state GST splits, navigate the invoice status lifecycle, and produce print-ready GST invoices complete with dynamic payment QR codes and bank details."

---

### Section 2: Explaining the Invoices Ledger (`/invoices`) (01:30 – 03:00)
- **On-Screen**: View `/invoices`. Explain table columns: Invoice Number, Date, Customer Name, Due Date, Total Amount, Balance Due, Payment Status (`Draft`, `Issued`, `Partially Paid`, `Paid`, `Overdue`, `Void`).
- **Cursor Action**: Cursor highlights filter tabs across the top: `All`, `Unpaid`, `Overdue`, `Paid`.
- **Narration**:
  "The Invoices register provides a comprehensive view of all billed transactions.
  
  Across the top, status filter tabs allow you to isolate invoices needing collection:
  - 'Unpaid': Invoices delivered to clients awaiting settlement.
  - 'Overdue': Invoices where the payment due date has elapsed without full clearance.
  - 'Paid': Invoices fully settled.
  
  Look at the table columns: Invoice Number, Issue Date, Customer Name, Due Date, Total Invoiced Value, and Balance Due. 
  
  Notice the color-coded status badges: Green for Paid, Amber for Issued/Unpaid, and Red for Overdue. Clicking any row opens the full invoice control panel."

---

### Section 3: Creating a Comprehensive Tax Invoice (`/invoices/new`) (03:00 – 08:30)
- **On-Screen**: Click gold `+ New Invoice` button. `SalesDocumentForm.tsx` loads.
- **Cursor Action**: Step-by-step walkthrough of every form region:
  1. Header: Customer selector (`Apex Solutions LLP`), Invoice # (`INV-2026-0001`), Invoice Date, Due Date, Payment Terms.
  2. Place of Supply dropdown: Defaults to `27 - Maharashtra`.
  3. Items Grid: Line 1: `Precision Ball Bearing 6204` (Qty: 25, Rate: ₹450, Disc: 2%), Line 2: `Heavy Duty V-Belt B-52` (Qty: 10, Rate: ₹620), Line 3: `Annual Machine Maintenance` (Qty: 2 HRS, Rate: ₹2,500).
  4. Calculation Summary: Subtotal, Line Discounts, CGST (9%), SGST (9%), Round-off (+/- paise), Grand Total.
  5. Payment QR Code toggle and Bank Details selector.
- **Narration**:
  "Let us create an enterprise tax invoice. Click '+ New Invoice'.
  
  **1. Customer & Header Configuration**
  In the 'Customer' field, select 'Apex Solutions LLP'. 
  Their registered billing address, shipping address, and 15-digit GSTIN appear immediately.
  
  The Invoice Number auto-generates according to your document numbering rule: 'INV-2026-0001'.
  
  The 'Invoice Date' defaults to today. In 'Payment Terms', select 'Net 30'. Notice that the 'Due Date' automatically advances thirty days into the future.
  
  Look at the **Place of Supply** dropdown. This is a critical statutory tax field. Because Apex Solutions is registered in Maharashtra (State Code 27) and our company is registered in Maharashtra, the Place of Supply defaults to '27 - Maharashtra'. This instructs Bill Aura to apply Central GST (CGST) and State GST (SGST). If the customer were in another state, integrated GST (IGST) would be selected automatically.
  
  **2. Adding Line Items**
  Now, let us populate the line items:
  
  - *Row 1*: Select 'Precision Ball Bearing 6204'. HSN code 8482 populates automatically. Set Quantity to '25' PCS at ₹ 450.00. In the Discount field, enter '2%'. The taxable line total calculates to ₹ 11,025.00.
  - *Row 2*: Click '+ Add Row'. Select 'Heavy Duty V-Belt B-52'. HSN 4010. Quantity '10' PCS at ₹ 620.00. Line total: ₹ 6,200.00.
  - *Row 3*: Click '+ Add Row'. Select our service offering, 'Annual Machine Maintenance'. SAC code 9987. Quantity '2' Hours at ₹ 2,500.00. Line total: ₹ 5,000.00.
  
  **3. Tax Computation & Round-Off**
  Look at the financial calculation panel on the right:
  - Total Taxable Value: ₹ 22,225.00
  - CGST at 9%: ₹ 2,000.25
  - SGST at 9%: ₹ 2,000.25
  - Total Tax Liability: ₹ 4,000.50
  
  Notice the **Auto Round-Off** feature. The unrounded sum is ₹ 26,225.50. Bill Aura adds a Round-off adjustment of +₹ 0.50 to bring the final invoice amount to an exact ₹ 26,226.00. This ensures clean banking settlement without fractional paise issues.
  
  **4. Payment QR Code & Bank Accounts**
  Under 'Payment Instructions', toggle 'Display Dynamic UPI QR Code' to ON. Select your active corporate bank account (HDFC Bank Current Account). The system embeds your IFSC, Account Number, and UPI VPA onto the printed invoice.
  
  **5. Saving the Invoice**
  At the bottom, you have two options:
  - 'Save as Draft': saves the invoice for internal review without booking revenue or altering inventory.
  - 'Save and Issue': finalizes the invoice, locks the sequence number, decrements warehouse stock, and posts debits and credits to the General Ledger.
  
  Click 'Save and Issue'."

---

### Section 4: Detailed Accounting & Inventory Ledger Impact (08:30 – 10:45)
- **On-Screen**: Open Ledger Inquiry (`/accounting/ledger`) in a separate workspace tab. Show the journal entry automatically created by the invoice.
- **Callout Box**: 
  ```
  Double-Entry Accounting Journal for INV-2026-0001:
  Debit:  Accounts Receivable (Apex Solutions)  ₹ 26,226.00
  Credit: Sales Revenue (Goods)                ₹ 17,225.00
  Credit: Sales Revenue (Services)             ₹  5,000.00
  Credit: Output CGST Payable                  ₹  2,000.25
  Credit: Output SGST Payable                  ₹  2,000.25
  Credit: Round-Off Reserve                    ₹      0.50
  ```
- **Narration**:
  "Let us inspect what happened behind the scenes the millisecond you clicked 'Save and Issue':
  
  First, in the General Ledger:
  - Accounts Receivable (Apex Solutions) was debited for the full gross amount: ₹ 26,226.00.
  - Sales Revenue was credited for the net taxable goods amount of ₹ 17,225.00.
  - Service Revenue was credited for ₹ 5,000.00.
  - Output CGST and SGST Payable accounts were credited with ₹ 2,000.25 each.
  
  Second, in Inventory:
  - Warehouse stock for Ball Bearings was decremented by 25 PCS.
  - V-Belts were decremented by 10 PCS.
  - Cost of Goods Sold was debited, and Merchandise Inventory asset was credited based on average unit cost.
  
  All of this occurred automatically with zero manual accounting intervention."

---

### Section 5: Invoice Print View, PDF & QR Codes (`/invoices/:id/print`) (10:45 – 12:45)
- **On-Screen**: Back on Invoice Details (`/invoices/:id`). Click 'Print / PDF'. `InvoicePrintView.tsx` loads.
- **Cursor Action**: Highlight Company Logo, Tax Invoice header, HSN Summary table, UPI QR code, Bank Details, and Authorized Signatory box.
- **Narration**:
  "Now click 'Print / PDF'. 
  
  The full print preview appears. Notice the professional typography, your corporate logo, the bold 'TAX INVOICE' heading, and the statutory tax matrix showing HSN codes, taxable amounts, and tax breakdowns.
  
  At the bottom left, notice the generated dynamic UPI QR code. A customer scanning this QR code with any UPI banking app (Google Pay, PhonePe, Paytm, or BHIM) will have the exact invoice total of ₹ 26,226.00 and invoice reference pre-filled, facilitating instant digital payment.
  
  You can click 'Print' for physical printing, 'Download PDF' for local filing, or click 'Send via WhatsApp / Email' to dispatch the invoice link directly to the buyer's billing contact."

---

### Section 6: Recovery, Voiding & Statutory Compliance (12:45 – 14:30)
- **On-Screen**: Return to `/invoices/:id`. Show the 'Actions' menu.
- **Narration**:
  "What if you discover an error after issuing an invoice?
  
  Under Indian GST law, once an invoice is issued and transmitted, you must never simply delete the record from your database, as missing sequence numbers trigger audit red flags.
  
  Instead, Bill Aura follows strict compliance protocols:
  If an invoice is unpaid and issued in error, click 'Actions' and select 'Void Invoice'. The system reverses the accounting entries, restores inventory to stock, and stamps the invoice as VOID while preserving the audit record.
  
  If the invoice has already been sent to the customer or uploaded to the GST portal, the legally required correction is to issue a **Credit Note**, which we will cover thoroughly in Chapter 12.
  
  In Chapter 10, we will learn how to configure automated Recurring Invoices for subscription billing."
