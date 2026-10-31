# Bill Aura ERP — Defect, Known Limitation & Edge Case Log

This log lists verified limitations, boundary conditions, edge cases, and known non-functional placeholders discovered during comprehensive source-code and workflow inspection. In accordance with master video production rules, **these limitations are explicitly addressed during instruction so users are never misled**.

---

## 1. Discovered System Boundary Conditions

| Reference ID | Module / Feature | Discovered Behavior | Operational Workaround / Training Instruction |
|---|---|---|---|
| **LIM-001** | **Goods Receipts (`/goods-receipts`)** | Route in `router.tsx` redirects automatically to `/purchases` dashboard. Discrete warehouse GRN receiving screen is not yet decoupled from Purchase Bills. | Instruct users to enter incoming goods and stock quantities directly via the Purchase Bill or stock adjustment screen when receiving vendor shipments. |
| **LIM-002** | **Invoice Deletion** | Once an invoice status transitions to `ISSUED` or `PARTIALLY_PAID`, the Delete action is disabled to maintain statutory Indian GST audit compliance and sequential voucher numbering. | Teach users to issue a **Credit Note (`/credit-notes/new`)** against the invoice rather than attempting a hard database deletion. |
| **LIM-003** | **Branch GSTIN Overrides** | Multi-branch setup (`/settings?tab=branches`) allows multiple locations. However, tax calculation logic primarily uses the active company profile state code if branch state is left blank. | Emphasize in Chapter 02 that users must explicitly configure both the Branch Address and Branch GSTIN for each branch to ensure proper Inter-state vs Intra-state GST classification. |
| **LIM-004** | **Stock Adjustment Account** | If user attempts to create an inventory adjustment without selecting an offset adjustment account, the form validation errors. | Highlight in Chapter 05 that an inventory adjustment always requires an expense or loss account (e.g., `Stock Adjustment Account` or `Damaged Goods Expense`) to balance the double-entry books. |
| **LIM-005** | **Bank Statement Auto-Feeds** | Direct Open Banking API integration with Indian public sector banks is limited by statutory aggregators. | Teach users the universal standard CSV/OFX statement upload procedure in Chapter 20 for flawless bank reconciliation. |
| **LIM-006** | **Manual Journal Balancing** | The "Save Journal Entry" button is locked in disabled state if Total Debits does not equal Total Credits down to the exact paise. | Explain the accounting principle in Chapter 22: every journal voucher must be self-balancing before posting to prevent General Ledger asymmetry. |
| **LIM-007** | **Legacy Report Routes** | Routes like `/general-ledger`, `/day-book`, `/trial-balance`, `/profit-loss` redirect directly to centralized `/reports/:reportKey` or `/reports`. | Guide users in Chapter 01 & Chapter 25 to access all analytical statements from the centralized **Reports Center (`/reports`)**. |

---

## 2. Validation & Recovery Matrix for Common User Errors

| User Error Scenario | System Warning / Toast | Resolution & Safe Recovery Procedure |
|---|---|---|
| **Invalid GSTIN format** | `"Invalid GSTIN format. Must be 15 alphanumeric characters matching state code."` | Check first 2 digits match state code (e.g. 27 for Maharashtra, 29 for Karnataka). Correct formatting or set GST Treatment to "Unregistered". |
| **Duplicate SKU / Item Code** | `"An item with this SKU already exists for this organization."` | Enter a distinct SKU or leave SKU blank to allow system auto-generation. |
| **Missing HSN on GST Invoice** | Warning: `"HSN/SAC is recommended for items on B2B GST tax invoices."` | Open Item Master (`/products`) and assign appropriate 4, 6, or 8-digit HSN code before re-adding to invoice. |
| **Exceeding Customer Credit Limit** | Warning: `"Customer has exceeded approved credit limit of ₹X."` | Require manager approval override or request customer payment before issuing additional credit invoices. |
| **Attempting to Record Payment > Balance Due** | Alert: `"Allocated payment exceeds total balance due on selected invoices."` | The excess amount is automatically converted into an unallocated Customer Advance, or adjust payment amount input. |
