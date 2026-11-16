# BILL AURA — FORM VALIDATION & DATA CONTRACT AUDIT
**Audit Date:** November 16, 2026  
**Auditor:** Senior TypeScript & NestJS QA Engineer  
**Scope:** Complete Form Audit across 12 Modules (Customers, Vendors, Sales, Purchases, Expenses, Inventory, Banking, Accounting, HR & Payroll, CRM, Settings, Reports)

---

## 1. Executive Summary

This audit examined every input form across all Bill Aura frontend features against backend NestJS DTO validation rules (`class-validator`, `class-transformer`) and Prisma PostgreSQL database schema constraints.

### Core Systemic Vulnerabilities Found
1. **Empty String Foreign Key Injection (`P2003` Risk):**
   131 frontend state fields across forms initialize optional Foreign Key IDs to empty string `""` (e.g. `bankAccountId: ''`, `taxId: ''`, `productId: ''`, `customerId: ''`).
   In TypeScript/JavaScript, `""` is truthy for `@IsOptional()` in `class-validator` unless accompanied by `@ValidateIf` or custom sanitizers. When passed to Prisma, PostgreSQL triggers `P2003: Foreign key constraint failed`.
2. **Date Format Divergence:**
   Frontend date pickers produce `YYYY-MM-DD` strings, whereas some backend DTOs use `@IsDateString()` (ISO-8601 full timestamp) while others use `new Date(dto.date)` without timezone normalization.
3. **Number Conversions:**
   HTML `<input type="number">` binds to string values in uncontrolled React inputs unless explicitly cast using `Number(e.target.value)` or `valueAsNumber`. Uncast strings fail `@IsNumber()` in NestJS validation pipes.

---

## 2. Module-by-Module Form Audit

### 2.1 CRM & Business Partners (`BusinessPartnerForm.tsx`)
- **Fields:**
  - `companyName`: String, optional.
  - `displayName`: String, required.
  - `email`: String, optional (`@IsEmail()`).
  - `phone`: String, optional.
  - `gstin`: String, optional. Validated via regex `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`.
  - `pan`: String, auto-extracted from GSTIN characters 3-12.
  - `customerType` / `businessPartnerType`: Enum (`CUSTOMER`, `VENDOR`, `CUSTOMER_VENDOR`).
  - `gstRegistrationStatus`: Form submitted `CONSUMER`, which broke backend until patched.
  - `taxPreference`: Form submitted `"Tax Exempt"` -> `"TAX_EXEMPT"`, which broke database until mapped to `EXEMPT`.
  - `openingBalance`: Numeric. Form sends `openingBalance: 0` with `openingBalanceType: 'NONE' | 'DEBIT_BALANCE' | 'CREDIT_BALANCE'`.
  - `creditLimit`: Numeric, optional.
- **Vulnerabilities:**
  - If a user deletes the PAN field manually after typing GSTIN, empty string `""` is sent; backend requires `null` to avoid unique constraint collision if PAN has an index.

---

### 2.2 Sales Documents (`SalesDocumentForm.tsx`, `CreditNoteForm.tsx`, `QuotationForm.tsx`)
- **Fields in `SalesDocumentForm.tsx`:**
  - `customerId`: String, required foreign key to `BusinessPartner`. Initialized to `""`.
  - `invoiceNo`: String, optional (auto-generated if omitted).
  - `salesAccountId`: String, optional foreign key to `Account`. Initialized to `""`.
  - `placeOfSupply`: String, required.
  - `date`: Date string `YYYY-MM-DD`.
  - `dueDate`: Date string `YYYY-MM-DD`.
  - `items`: Array of line items:
    - `productId`: String, optional foreign key to `Product`. Initialized to `""`.
    - `description`: String.
    - `qty`: Number, min 0.001.
    - `rate`: Number, min 0.
    - `taxPercent`: Number (0, 5, 12, 18, 28).
    - `discount`: Number, default 0.
    - `unit`: String.
- **Cross-Layer Inconsistencies:**
  - In `CreditNoteForm.tsx` line 87 & 96: `productId: ''` and `taxId: ''`. If a custom line item is added without selecting a catalog product, `productId: ''` is sent. In `invoices.service.ts` line 1287, this is guarded with `if (item.productId)`, but in other sales endpoints it triggers Prisma validation errors.
  - `docType`: `PROFORMA` sent instead of `PROFORMA_INVOICE`.
  - `invoiceType`: Form registers `'B2B' | 'B2C' | 'NO_TAX'`, which are tax modes, not standard `InvoiceType` enum values.

---

### 2.3 Purchases & Payments (`BillForm.tsx`, `PaymentMadeForm.tsx`, `VendorCreditForm.tsx`)
- **Fields in `PaymentMadeForm.tsx`:**
  - `vendorId`: String, required foreign key.
  - `paymentNumber`: String, optional custom document sequence number.
  - `date`: Full ISO-8601 string `new Date(paymentDate).toISOString()`.
  - `amount`: Number, must be > 0.
  - `method`: `PaymentMethod` enum (`CASH`, `BANK_TRANSFER`, `CHEQUE`, etc.).
  - `bankAccountId`: String, optional foreign key to `BankAccount`. Initialized to `""`.
  - `allocations`: Array of `{ purchaseId: string, amount: number }`.
  - `tdsTaxId`: String, optional.
  - `tdsAmount`: Number, optional.
- **Identified Failure Point:**
  When `paymentMode === 'CASH'`, `bankAccountId` is empty (`""`). The backend service attempts to resolve a fallback cash account. However, `TransactionPayment.bankAccountId` in `schema.prisma` is non-nullable:
  ```prisma
  bankAccountId String
  bankAccount   BankAccount @relation(...)
  ```
  This forces the backend to find or dynamically auto-create a shadow `BankAccount` for Cash, which previously generated duplicate cash accounts on the banking dashboard.

---

### 2.4 Expenses (`ExpensesDashboard.tsx`, `ExpenseFormModal.tsx`)
- **Fields in `CreateExpenseDto`:**
  - `categoryId`: String, optional foreign key to `ExpenseCategory`.
  - `accountId` / `expenseAccountId`: String, optional foreign key to `Account`.
  - `paidFromType`: `PaidFromType` (`BANK`, `CASH`, `PETTY_CASH`, `EMPLOYEE`, `VENDOR`).
  - `bankAccountId` / `cashAccountId`: String, optional foreign keys.
  - `date`: ISO Date string.
  - `amount`: Number, required.
  - `taxAmount`: Number, optional.
  - `gstRate`: Number, optional.
  - `taxPreference`: `TaxPreference` enum.
- **Identified Failure Point:**
  In `ExpensesDashboard.tsx` line 214:
  `apiClient.get('/parties', { params: { type: 'VENDOR' } })`
  Endpoint `/parties` does not exist on the backend (404 Not Found), causing vendor lookup in the expense modal to fail silently.

---

### 2.5 Inventory & Stock (`ProductForm.tsx`, `InventoryAdjustmentForm.tsx`, `UpdateStockModal.tsx`)
- **Fields in `ProductForm.tsx`:**
  - `name`: String, required.
  - `sku`: String, optional.
  - `itemType`: `ItemType` enum (`RAW_MATERIAL`, `FINISHED_GOOD`, etc.).
  - `taxPreference`: Sends `TAX_EXEMPT` and `NON_TAXABLE` (violating `TaxPreference` enum).
  - `gstRate`: Number.
  - `salesPrice`: Number.
  - `purchasePrice`: Number.
  - `warehouseId`: String, optional foreign key.
- **Fields in `InventoryAdjustmentForm.tsx`:**
  - `mode`: `'QUANTITY' | 'VALUE'`.
  - `reason`: String.
  - `warehouseId`: String, required.
  - `rows`: Array of `{ productId, currentStock, quantityAdjusted, newQuantityOnHand }`.
- **Architectural Violation:**
  Lines 378-380 of `InventoryAdjustmentForm.tsx` store draft stock adjustments in browser `localStorage` (`billaura_adjustment_drafts`) rather than in a multi-tenant PostgreSQL table, risking cross-tenant data bleed on shared devices.

---

### 2.6 Accounting & Banking (`JournalVoucherForm.tsx`, `BankAccountFormModal.tsx`, `CapitalDashboard.tsx`)
- **Fields in `JournalVoucherForm.tsx`:**
  - `voucherNumber`: String.
  - `date`: ISO Date string.
  - `lines`: Array of `{ accountId: string, contactId: string, debit: number, credit: number, description: string }`.
  - Total Debits must strictly equal Total Credits (enforced both client-side and in `AccountingEngineService`).
- **Contract Mismatches:**
  - `CapitalDashboard.tsx` line 123 calls `api.get('/accounting/accounts')`, while the backend controller is mapped to `/accounts` (404 Not Found).

---

### 2.7 HR & Payroll (`EmployeeModal.tsx`, `AttendanceFormModal.tsx`, `AssetAssignmentModal.tsx`)
- **Fields in `EmployeeModal.tsx`:**
  - `employeeCode`: String, unique per company.
  - `name`: String, required.
  - `email`: String, optional.
  - `departmentId`, `designationId`, `branchId`: Optional foreign keys.
- **Contract Mismatches:**
  - `AttendanceFormModal.tsx` line 105 issues `PATCH /hr/attendances/:id`, which does not exist on the backend controller (404 Not Found).
  - `AssetAssignmentModal.tsx` line 28 issues `POST /hr/assets/assign`, which does not exist on the backend; the catch block simulates success with a local message.
  - `AttendanceReportWizard.tsx` line 34 issues `GET /reports/attendance/export`, whereas the backend controller exposes `/documents/attendance/export`.

---

### 2.8 Platform & User Administration (`UserForm.tsx`, `UsersList.tsx`)
- **Fields in `UserForm.tsx`:**
  - `name`: String, required.
  - `email`: String, required (`@IsEmail()`).
  - `role`: `UserRole` (`SUPER_ADMIN`, `ADMIN`, `ACCOUNTANT`, `CUSTOM_ROLE`).
  - `customRoleId`: String, required if `role === 'CUSTOM_ROLE'`.
- **Contract Mismatch:**
  `UserForm.tsx` line 123 calls `POST /users/enterprise-create`. This endpoint is completely absent from `UsersController`, causing user creation through this form to fail with 404.

---

## 3. Form Validation Defect Matrix

| Form File | Field | Issue Description | Layer of Failure |
|---|---|---|---|
| `ProductForm.tsx` | `taxPreference` | Sends `TAX_EXEMPT` / `NON_TAXABLE` | Backend DTO `@IsEnum(TaxPreference)` (400) |
| `BusinessPartnerForm.tsx` | `gstRegistrationStatus` | Sends `CONSUMER`, `OVERSEAS` | Prisma PostgreSQL Enum (500) |
| `BusinessPartnerForm.tsx` | `taxPreference` | Sends `Tax Exempt` | Prisma PostgreSQL Enum (500) |
| `UserForm.tsx` | Entire Form | Submits to `/users/enterprise-create` | Backend Route Not Found (404) |
| `ExpensesDashboard.tsx` | Vendor Filter | Queries `/parties?type=VENDOR` | Backend Route Not Found (404) |
| `CreditNoteForm.tsx` | Salesperson | Queries `/employees` instead of `/hr/employees` | Backend Route Not Found (404) |
| `CapitalDashboard.tsx` | Account Fallback | Queries `/accounting/accounts` instead of `/accounts` | Backend Route Not Found (404) |
| `CustomerProfile.tsx` | Invoices Tab | Queries `/invoices` instead of `/sales/invoices` | Backend Route Not Found (404) |
| `VendorsList.tsx` | Vendor Table | Queries `/crm/vendors` instead of `/vendors` | Backend Route Not Found (404) |
| `AttendanceFormModal.tsx` | Edit Attendance | Sends `PATCH /hr/attendances/:id` | Backend Route Not Found (404) |
| `AssetAssignmentModal.tsx` | Asset Assign | Sends `POST /hr/assets/assign` | Backend Route Not Found (404) |
| `CommissionRulesSettings.tsx` | Edit Rule | Sends `PUT /commissions/rules/:id` | Backend Route Not Found (404) |
| `ExpensesDashboard.tsx` | PDF Export | Calls `/documents/expenses/:id/export` | Backend Route Not Found (404) |
| `InventoryAdjustmentForm.tsx` | Drafts | Saves to un-tenanted `localStorage` | Multi-Tenancy Architecture Violation |
| `DocumentsList.tsx` | All Documents | Completely mock state in `localStorage` | SaaS Architecture Violation |
