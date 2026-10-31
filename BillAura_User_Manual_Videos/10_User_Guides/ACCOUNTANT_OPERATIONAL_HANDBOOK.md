# Bill Aura ERP — Accountant & Controller Operational Handbook

## Introduction
This handbook provides senior accountants, chief financial officers, and chartered accountants with standard operating procedures for operating, reconciling, and auditing corporate books in Bill Aura ERP.

---

## 1. Accounting Architecture & Principles
Bill Aura adheres strictly to standard Indian GAAP and double-entry accrual bookkeeping:
- **Assets = Liabilities + Equity** is validated on every posted transaction.
- **Debits == Credits** is strictly enforced on all manual journals, payment allocations, and inventory adjustments.
- **Voucher Sequences** are tamper-proof and sequential per financial year.

---

## 2. Month-End Financial Close Checklist
Perform the following steps at the conclusion of each calendar month:

### Step 1: Sales & Revenue Audit
1. Open `Reports > Sales Register`.
2. Confirm all dispatched goods have corresponding issued invoices.
3. Review any invoices remaining in `DRAFT` status and either approve or cancel them.
4. Verify unallocated customer advances in `Reports > Customer Balances Summary`.

### Step 2: Purchases & Accounts Payable Audit
1. Open `Reports > Purchase Register`.
2. Ensure all incoming vendor tax invoices for the month have been entered under `Purchases > Bills`.
3. Verify that Input Tax Credit eligibility is correctly segregated between eligible and ineligible (Section 17(5)) lines.

### Step 3: Bank Reconciliation
1. Navigate to `Banking > Reconciliation Center`.
2. Upload the official bank statement for each bank account.
3. Match every statement withdrawal and deposit against Bill Aura vouchers.
4. Investigate un-cleared cheques and bank charges.
5. Confirm that **Statement Balance == Reconciled Book Balance**.

### Step 4: Fixed Assets & Depreciation
1. Navigate to `Accountant > Manual Journals > + New Journal`.
2. Debit: `Depreciation Expense (5300)` for the monthly depreciation charge.
3. Credit: `Accumulated Depreciation (1650)` contra-asset account.
4. Save and publish the journal voucher.

### Step 5: Statutory GST Reconciliation
1. Open `Taxes > GSTR-1`. Reconcile B2B Table 4 against your Sales Register.
2. Open `Taxes > GSTR-3B`. Confirm eligible ITC matches GSTR-2B.
3. Compute Net GST Payable and record the electronic cash ledger payment voucher.

### Step 6: Period Lock
1. Once financial statements are reviewed and approved, navigate to `Settings > Financial Year`.
2. Lock the closed accounting month to prevent unauthorized back-dated entries.

---

## 3. Standard Double-Entry Accounting Matrix
| Commercial Event | Primary Debit Account | Primary Credit Account | Subsidiary Effect |
|---|---|---|---|
| **Issue Tax Invoice** | Accounts Receivable | Sales Revenue, Output Tax Payable | Decrements inventory asset, debits COGS |
| **Customer Payment Received** | Bank / Cash Account | Accounts Receivable | Clears invoice balance due |
| **Vendor Bill Entered** | Inventory Asset / Expense, Input Tax Credit | Accounts Payable | Increments warehouse physical stock |
| **Vendor Payment Disbursed**| Accounts Payable | Bank / Cash Account | Clears vendor bill liability |
| **Credit Note Issued** | Sales Returns, Output Tax Payable | Accounts Receivable / Customer Credit | Adjusts output tax liability downward |
| **Debit Note Issued** | Accounts Payable / Vendor Refund | Purchase Returns, Input Tax Credit | Adjusts input tax credit downward |
| **Stock Shrinkage / Loss** | Stock Adjustment Expense | Merchandise Inventory | Decrements inventory valuation |
| **Cash Withdrawal (Contra)** | Petty Cash Register | Bank Current Account | No impact on Net Income |
| **Payroll Processing** | Salaries & Wages Expense | Salaries Payable, PF/ESI/TDS Payable | Creates employee disbursals ledger |
| **Depreciation Posting** | Depreciation Expense | Accumulated Depreciation | Reduces net book value of fixed assets |
