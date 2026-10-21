# Bill Aura ERP Video Script — Chapter 11: Payments Received, Receipts & Invoice Allocation

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 11: Payments Received, Bank Allocations, TDS & Customer Advances
- **Module ID**: `MOD-11-RECEIPTS`
- **Estimated Runtime**: 11:15
- **Prerequisites**: Sales Invoices issued to customers.
- **Target Audience**: Accounts receivable clerks, collection officers, financial accountants.

---

## Instructional Sequence

### Section 1: Introduction (00:00 – 01:15)
- **On-Screen**: Navigate to `/receipts` via sidebar `Sales > Payments Received`.
- **Narration**:
  "Welcome back to Bill Aura ERP. Issuing an invoice generates a receivable; collecting the payment converts that receivable into actual bank liquidity.
  
  In this chapter, you will learn how to record customer payments received, manage multi-invoice allocations, deduct statutory TDS (Tax Deducted at Source), handle bank transfer modes (NEFT, RTGS, IMPS, UPI, Cheques), and treat unallocated excess amounts as customer advances."

---

### Section 2: Explaining the Receipts Journal (`/receipts`) (01:15 – 02:30)
- **On-Screen**: View `/receipts`. Explain columns: Receipt #, Customer Name, Payment Date, Payment Mode, Deposit-To Account, Amount Received, Unused Amount, Status.
- **Narration**:
  "The Payments Received journal maintains a complete chronological record of all incoming funds. 
  
  Notice the 'Deposit-To Account' column: this shows exactly which bank account or cash ledger was debited for each receipt. 
  
  The 'Unused Amount' column highlights customer funds that have been collected but not yet matched against specific invoices, acting as client advances."

---

### Section 3: Recording Payment Against an Invoice (`/receipts/new`) (02:30 – 07:15)
- **On-Screen**: Click `+ New Payment Received` (or click 'Record Payment' directly from an open invoice). Form loads at `/receipts/new`.
- **Cursor Action**: Step-by-step entry:
  1. Customer: Select `Apex Solutions LLP`.
  2. Receipt #: `REC-2026-0001` (auto-sequence).
  3. Payment Date: Today.
  4. Payment Mode: `Bank Transfer / NEFT`.
  5. Deposit-To Account: `HDFC Bank Current Account`.
  6. Reference / UTR Number: `HDFCN26123456789`.
  7. Tax Deducted (TDS): Toggle on/off explanation.
  8. Unpaid Invoices Table: Shows `INV-2026-0001` with Balance Due `₹ 26,226.00`.
  9. Click 'Auto-Allocate' or enter `₹ 26,226.00`.
- **Narration**:
  "Click '+ New Payment Received'.
  
  In the 'Customer' field, select 'Apex Solutions LLP'. 
  Observe what happens instantly in the bottom table: Bill Aura automatically fetches all unpaid and partially paid invoices for Apex Solutions! Here is our invoice from Chapter 9: 'INV-2026-0001' with an original total of ₹ 26,226.00 and an outstanding balance due of ₹ 26,226.00.
  
  Now look at the payment header fields:
  - **Payment Date**: Defaults to today.
  - **Payment Mode**: Select 'Bank Transfer / NEFT' (options include Cash, Cheque, UPI, Credit Card).
  - **Deposit-To Account**: Select your operational bank ledger, 'HDFC Bank Current Account'.
  - **Reference / UTR Number**: Enter the bank transaction reference, 'HDFCN26123456789'. This UTR number is essential for subsequent bank reconciliation.
  
  **Statutory TDS (Tax Deducted at Source)**
  If your corporate client deducted 1% or 2% TDS under Section 194C or 194J of the Income Tax Act before remitting the net amount, check the 'Tax Deducted (TDS)' box. Bill Aura allows you to specify the TDS amount (say ₹ 500) and routes it to your 'TDS Receivable' asset account while still clearing the full invoice balance.
  
  In our example, the client has transferred the full gross amount. 
  In the 'Amount Received' field, enter '₹ 26,226.00'.
  
  Click the 'Auto-Allocate' button. The full ₹ 26,226.00 is mapped against Invoice INV-2026-0001, bringing its remaining balance due down to zero.
  
  Click 'Save and Record Payment'."

---

### Section 4: General Ledger Impact & Invoice Status Transition (07:15 – 09:15)
- **On-Screen**: View the updated invoice status. Navigate back to `/invoices`. Invoice `INV-2026-0001` now shows a green badge: `PAID`, with Balance Due `₹ 0.00`.
- **Callout Box**:
  ```
  Double-Entry Accounting Journal for Receipt REC-2026-0001:
  Debit:  HDFC Bank Current Account (Asset)       ₹ 26,226.00
  Credit: Accounts Receivable - Apex Solutions   ₹ 26,226.00
  ```
- **Narration**:
  "Let us inspect the financial result of this receipt:
  
  1. Open your Invoices register. Notice that invoice 'INV-2026-0001' has instantly transitioned from 'Issued' to a bright green badge: 'PAID'. Its balance due is exactly zero.
  2. In your General Ledger, HDFC Bank Current Account has been debited for ₹ 26,226.00, increasing your available cash balance.
  3. Accounts Receivable for Apex Solutions has been credited for ₹ 26,226.00, clearing their outstanding ledger balance.
  4. On your Executive Dashboard, 'Total Receivables' has decreased by ₹ 26,226.00, while 'Cash & Bank Balances' has increased by the identical sum."

---

### Section 5: Handling Customer Advances & Partial Payments (09:15 – 11:15)
- **On-Screen**: Demonstrate what happens when a customer pays more than the invoice total or pays without open invoices.
- **Narration**:
  "What happens if a customer sends an advance payment before an invoice is issued, or remits ₹ 30,000 when their open invoice is only ₹ 26,226?
  
  In Bill Aura, you never reject customer money. When you enter ₹ 30,000, the system allocates ₹ 26,226 to clear the open invoice. The remaining ₹ 3,774 is automatically classified as an **Unallocated Customer Advance** under Current Liabilities. 
  
  When you issue the next invoice to Apex Solutions next month, Bill Aura will display a notification: 'Customer has ₹ 3,774 in available credits. Click here to apply.' With one click, you can offset the advance against the new invoice.
  
  In Chapter 12, we will cover Credit Notes and sales returns."
