# BILL AURA — BUSINESS LOGIC CONSISTENCY AUDIT
**Audit Date:** November 16, 2026  
**Auditor:** Principal Financial Software Architect  
**Scope:** Core ERP Business Rules, Statutory GST Logic, Multi-Tenant Ledger Invariants, Inventory Accounting

---

## 1. Executive Summary

In a mission-critical Enterprise Resource Planning (ERP) platform, business logic must remain immutable and authoritative on the backend. Frontend calculations serve purely as interactive visual previews for the user.

This audit cross-examined the core financial algorithms across:
1. Statutory GST Engine (`gst-engine.util.ts`) vs Frontend Tax Previews.
2. Accounts Receivable (AR) vs Accounts Payable (AP) balance mutations.
3. Inventory movements vs Cost of Goods Sold (COGS) accounting.
4. Cash Drawer vs Commercial Bank account balance synchronization.
5. General Ledger Double-Entry Invariants ($\sum Debits \equiv \sum Credits$).

---

## 2. Core Business Rule Audits

### 2.1 Statutory GST & Tax Preference Evaluation
- **Authoritative Rule (Indian GST Act):**
  - If a supplier and recipient are in the same state: CGST (50%) + SGST (50%).
  - If a supplier and recipient are in different states: IGST (100%).
  - If `taxPreference` is `EXEMPT`, `NIL_RATED`, `NON_GST`, or `ZERO_RATED`: Tax Rate is 0%, Total Tax is ₹0.
  - If customer is `COMPOSITION`: Cannot charge tax to customer.
  - If transaction is `REVERSE_CHARGE` (RCM): Recipient pays GST directly to the government; tax is excluded from the invoice grand total payable by the customer.
- **Frontend Divergence in `SalesDocumentForm.tsx` (Lines 556-570):**
  - The frontend only checks document type:
    ```typescript
    const isNonGst = docType === 'BILL_OF_SUPPLY' || docType === 'EXEMPT_SUPPLY' || invoiceType === 'NO_TAX';
    ```
  - The frontend **fails to check** the customer's `taxPreference` or the line item's individual `taxPreference`!
  - If a user selects a customer whose profile is configured as "Tax Exempt", the frontend invoice table still calculates 18% GST and displays a taxable total.
  - When submitted, backend `invoices.service.ts` passes the payload to `GSTEngine.calculate()`, which zeroes out the tax.
  - **Discrepancy:** The invoice preview on screen does not match the invoice amount actually saved to the database.

---

### 2.2 Payment Allocation & Outstanding Balances
- **Business Rule:**
  - When an outbound payment (`TransactionPayment`) is recorded against a bill:
    1. Bill `amountPaid` increases by `allocAmt`.
    2. Bill `status` becomes `PAID` if `amountPaid >= grandTotal - 0.01`, else `PARTIAL`.
    3. Vendor `payableBalance` decreases by `allocAmt`.
    4. Bank/Cash ledger decreases by `totalPaidNum`.
    5. Any unallocated excess (`amount - totalAllocated`) is credited to `Vendor Advances` (Asset).
- **Recent Flaw Found in `purchase-payments.service.ts`:**
  - When paying in Cash, the service synced the `CashAccount` using this condition:
    ```typescript
    if (!cashAcc.accountId) {
      await tx.cashAccount.update({ data: { accountId: ledger.id } });
    } else if (cashAcc.accountId !== ledger.id) {
      await tx.cashAccount.update({ data: { currentBalance: { decrement: totalPaidNum } } });
    }
    ```
  - **Logical Inversion Bug:** When `cashAcc.accountId === ledger.id` (meaning the cash account was already properly linked to the ledger), it **skipped** decrementing the physical cash balance!
  - **Required Invariant:** `CashAccount.currentBalance` must decrement on cash payment whenever `isCashPayment === true`, regardless of whether `accountId` was already initialized.

---

### 2.3 General Ledger Double-Entry Invariant
- **Fundamental Rule:**
  For every posted transaction, $\sum Debits - \sum Credits = 0$.
- **Audit of `AccountingEngineService`:**
  - `AccountingEngineService.postTransaction()` correctly enforces:
    ```typescript
    const diff = Math.abs(totalDebit - totalCredit);
    if (diff > 0.01) {
      throw new BadRequestException(`Unbalanced journal entry: Debits (₹${totalDebit}) !== Credits (₹${totalCredit})`);
    }
    ```
  - However, in `JournalVoucherForm.tsx`, client-side line item calculations using floating point math can display balanced numbers (e.g. ₹100.00 vs ₹100.00) while submitting `100.004` vs `99.998`, causing sudden 400 Bad Request errors from the backend accounting engine.
  - **Required Fix:** Enforce `Math.round(val * 100) / 100` on both client and server before comparison.

---

### 2.4 Inventory Valuation: FIFO vs Weighted Average
- **Prisma Schema:** `enum ValuationMethod { AVERAGE, FIFO }` on `Product`.
- **Backend Inspection (`inventory.service.ts` & `stock-engine`):**
  - Currently, stock decreases on sales are calculated using **Weighted Average Cost**.
  - While `ValuationMethod.FIFO` is defined in the enum, the batch tracking FIFO queue is only partially wired for products with `hasBatchTracking: true`.
  - Non-batched products set to `FIFO` in settings default silently to Weighted Average.

---

### 2.5 Multi-Tenancy Data Isolation Guarantee
- **Rule:** No query may execute without `where: { companyId }`.
- **Audit Result:**
  All backend services (`InvoicesService`, `PurchasesService`, `PurchasePaymentsService`, `VendorsService`, `CustomersService`, `BankService`, `HrService`) strictly enforce `companyId` via `CompanyContext.getCompanyId()`.
- **Exception in Frontend:**
  `InventoryAdjustmentForm.tsx` (Lines 378-380) and `DocumentsList.tsx` (Lines 116) use global browser `localStorage` without tenant prefixes, violating tenant boundaries on shared client terminals.
