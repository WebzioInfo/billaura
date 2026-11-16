# BILL AURA — GLOBAL ENUM MISMATCH REGISTER
**Audit Date:** November 16, 2026  
**Auditor:** Principal Software Architect & QA Engineer  
**Scope:** PostgreSQL, Prisma Schema, Backend DTOs, Frontend Types, Form Inputs (Select/Radio)

---

## 1. Executive Summary

This register catalogs every enum and categorical value in Bill Aura across the 5 layers:
1. PostgreSQL Database Constraints / Enum Types
2. Prisma Schema (`backend/prisma/schema.prisma`) - 60 Enums defined
3. Backend TypeScript DTOs & Validation Pipes (`backend/src/**/dto/*.ts`)
4. Frontend TypeScript Types (`frontend/src/**/types*.ts`)
5. Frontend Form Controls & Radios (`frontend/src/features/**/*.tsx`)

### Critical Finding
Multiple frontend forms submit descriptive string constants (e.g. `TAX_EXEMPT`, `NON_TAXABLE`, `CONSUMER`, `OVERSEAS`, `SALES_ORDER`, `PROFORMA`) that fail NestJS `ValidationPipe` (`@IsEnum(...)`) or cause Prisma runtime query failures against PostgreSQL enums.

---

## 2. Exhaustive Enum Discrepancy Matrix

### [ENUM-001] TaxPreference Mismatch (Inventory & Products)
- **Status:** CONFIRMED RUNTIME BUG
- **Prisma Enum Definition:**
  ```prisma
  enum TaxPreference {
    TAXABLE
    EXEMPT
    NIL_RATED
    ZERO_RATED
    NON_GST
    NOT_APPLICABLE
    COMPOSITION
    REVERSE_CHARGE
  }
  ```
- **Backend DTO:** `backend/src/inventory/dto/product.dto.ts`
  ```typescript
  @IsEnum(TaxPreference)
  @IsOptional()
  taxPreference?: TaxPreference;
  ```
- **Frontend Form:** `frontend/src/features/inventory/ProductForm.tsx` (Lines 474-478)
  ```tsx
  <select {...register('taxPreference')}>
    <option value="TAXABLE">Taxable</option>
    <option value="TAX_EXEMPT">Tax Exempt</option>
    <option value="NON_TAXABLE">Non-Taxable</option>
  </select>
  ```
- **Failure Mode:**
  When a user selects "Tax Exempt" or "Non-Taxable", the frontend sends `taxPreference: "TAX_EXEMPT"` or `"NON_TAXABLE"`. NestJS `ValidationPipe` throws `400 Bad Request: taxPreference must be one of the following values: TAXABLE, EXEMPT, NIL_RATED, ZERO_RATED, NON_GST, NOT_APPLICABLE, COMPOSITION, REVERSE_CHARGE`.
- **Required Resolution:**
  Frontend must submit `EXEMPT` and `NON_GST`. Backend DTO should include `@Transform` pre-normalizer to defensively map legacy values.

---

### [ENUM-002] TaxPreference Mismatch (Customer / Vendor Form)
- **Status:** CONFIRMED (Fixed in git commit `2590412`, needs contract documentation)
- **Prisma Enum:** `EXEMPT`
- **Frontend Form:** `frontend/src/features/crm/BusinessPartnerForm.tsx`
  - Radio buttons sent: `taxPreference: "Tax Exempt"` -> transformed to `"TAX_EXEMPT"`
- **Backend Service:** `backend/src/crm/customers.service.ts` & `vendors.service.ts`
  - Previously attempted to persist `"TAX_EXEMPT"` into Prisma `TaxPreference` field, triggering Prisma query engine 500 error.
- **Required Standard:**
  Centralized enum type `TaxPreference` shared between frontend and backend.

---

### [ENUM-003] GSTRegistrationStatus & GST Treatment Mismatch (CRM)
- **Status:** CONFIRMED RUNTIME BUG
- **Prisma Enum Definition:**
  ```prisma
  enum GSTRegistrationStatus {
    REGISTERED
    UNREGISTERED
    COMPOSITION
    SEZ
    EXPORT
  }
  ```
- **Frontend Form:** `frontend/src/features/crm/BusinessPartnerForm.tsx` (Lines 559-565)
  ```tsx
  <option value="REGISTERED">Registered Business - Regular</option>
  <option value="COMPOSITION">Registered Business - Composition</option>
  <option value="UNREGISTERED">Unregistered Business</option>
  <option value="CONSUMER">Consumer</option>
  <option value="OVERSEAS">Overseas</option>
  <option value="SEZ">Special Economic Zone</option>
  <option value="DEEMED_EXPORT">Deemed Export</option>
  ```
- **Backend DTO & Model:** `backend/src/crm/dto/customer.dto.ts` & `schema.prisma`
  - `gstRegistrationStatus` is of type `GSTRegistrationStatus`.
  - Values `CONSUMER`, `OVERSEAS`, `DEEMED_EXPORT` are NOT in the Prisma enum.
- **Failure Mode:**
  Submitting "Consumer" causes 500 error unless dynamically transformed to `UNREGISTERED` and mapped to `customerType: 'B2C'`. Submitting "Overseas" or "Deemed Export" similarly fails against database enum constraints.

---

### [ENUM-004] InvoiceType & Document Type Mismatch (Sales Document Form)
- **Status:** CONFIRMED RUNTIME RISK
- **Prisma Enum Definition:**
  ```prisma
  enum InvoiceType {
    TAX_INVOICE
    BILL_OF_SUPPLY
    RETAIL_INVOICE
    DEBIT_NOTE
    CREDIT_NOTE
    PROFORMA_INVOICE
    QUOTATION
    ESTIMATE
    DELIVERY_CHALLAN
    PURCHASE_INVOICE
    PURCHASE_RETURN
    FEE_RECEIPT
    PAYMENT_RECEIPT
    OTHER_RECEIPT
  }
  ```
- **Frontend Form:** `frontend/src/features/sales/SalesDocumentForm.tsx` (Lines 1801-1808, 1817-1819)
  ```tsx
  // Document Type Select:
  <option value="INVOICE">Tax Invoice (GST)</option>
  <option value="BILL_OF_SUPPLY">Bill of Supply (Non-GST)</option>
  <option value="QUOTATION">Quotation</option>
  <option value="SALES_ORDER">Sales Order</option>
  <option value="CREDIT_NOTE">Credit Note</option>
  <option value="DELIVERY_CHALLAN">Delivery Challan</option>
  <option value="PROFORMA">Proforma Invoice</option>

  // Tax Mode Select:
  <option value="B2B">B2B (Tax Invoice)</option>
  <option value="B2C">B2C (Retail Invoice)</option>
  <option value="NO_TAX">No Tax (Bill of Supply)</option>
  ```
- **Discrepancy:**
  - `SALES_ORDER` is NOT a valid `InvoiceType` (it belongs to the separate `SalesOrder` model).
  - `PROFORMA` does not match `PROFORMA_INVOICE`.
  - `B2B`, `B2C`, `NO_TAX` are sent in the `invoiceType` payload field, requiring custom normalization in `invoices.service.ts`. If called via direct API or other controllers, it throws invalid enum errors.

---

### [ENUM-005] StockAdjustmentType (Inventory Adjustments)
- **Status:** CONFIRMED ARCHITECTURAL DRIFT
- **Prisma Schema:** No `StockAdjustmentType` enum exists in Prisma schema. Prisma uses `StockMovementType`:
  ```prisma
  enum StockMovementType {
    PURCHASE
    SALE
    ADJUSTMENT
    RETURN
    OPENING_STOCK
  }
  ```
- **Backend DTO:** `backend/src/inventory/dto/stock-adjust.dto.ts`
  Defines an ad-hoc TypeScript enum:
  ```typescript
  export enum StockAdjustmentType {
    ADD = 'ADD',
    REMOVE = 'REMOVE',
    SET_ACTUAL = 'SET_ACTUAL',
  }
  ```
- **Frontend Component:** `frontend/src/features/inventory/components/UpdateStockModal.tsx`
  Sends `ADD`, `REMOVE`, `SET_ACTUAL`.
- **Database Mapping:**
  The backend service converts `ADD` / `REMOVE` into a signed `quantityChange` and logs a movement with `movementType: 'ADJUSTMENT'`. However, `StockAdjustmentType` is un-indexed and un-persisted as an enum in the database.

---

### [ENUM-006] CommissionStatus Discrepancy
- **Prisma Enum:**
  ```prisma
  enum CommissionStatus {
    PENDING
    APPROVED
    ON_HOLD
    REJECTED
    READY_FOR_PAYMENT
    PAID
    CANCELLED
  }
  ```
- **Frontend Settings:** `frontend/src/features/settings/pages/CommissionRulesSettings.tsx`
  Status filters and updates must strictly adhere to these 7 exact values.

---

### [ENUM-007] PaymentMethod vs PaidThroughAccount
- **Prisma Enum:**
  ```prisma
  enum PaymentMethod {
    CASH
    BANK_TRANSFER
    CREDIT_CARD
    UPI
    CHEQUE
    NEFT
    RTGS
    IMPS
    WALLET
  }
  ```
- **Frontend Form:** `PaymentMadeForm.tsx` & `ReceiptForm.tsx`
  - Modes offered: `CASH`, `BANK_TRANSFER`, `CHEQUE`, `CREDIT_CARD`, `UPI`.
  - Discrepancy: `Paid Through` account requires a valid `bankAccountId` foreign key even when `CASH` is selected, forcing creation of shadow `BankAccount` records for physical cash drawers.

---

### [ENUM-008] UserRole & System Role Definitions
- **Prisma Enum:**
  ```prisma
  enum UserRole {
    SUPER_ADMIN
    ADMIN
    ACCOUNTANT
    CUSTOM_ROLE
  }
  ```
- **Frontend Component:** `frontend/src/features/users/UsersList.tsx` (Line 290)
  ```tsx
  <option value="USER">User (Standard)</option>
  ```
- **Discrepancy:**
  `USER` is NOT a valid `UserRole` in Prisma. Attempting to assign `role: 'USER'` throws a Prisma enum validation failure. Standard users must use `CUSTOM_ROLE` with a `customRoleId`.

---

## 3. Summary of Discrepancies by Module

| Module | Field | Frontend Sends | Expected Prisma/DB Enum | Impact |
|---|---|---|---|---|
| Inventory | `taxPreference` | `TAX_EXEMPT` | `EXEMPT` | 400 Bad Request on Product create |
| Inventory | `taxPreference` | `NON_TAXABLE` | `NON_GST` | 400 Bad Request on Product create |
| CRM | `taxPreference` | `Tax Exempt` | `EXEMPT` | 500 DB Enum Crash |
| CRM | `gstTreatment` | `CONSUMER` | `UNREGISTERED` | 500 DB Enum Crash |
| CRM | `gstTreatment` | `OVERSEAS` | `EXPORT` | 500 DB Enum Crash |
| Sales | `docType` | `PROFORMA` | `PROFORMA_INVOICE` | Normalizer dependent |
| Sales | `docType` | `SALES_ORDER` | N/A (Separate Table) | Route / Service Confusion |
| Users | `role` | `USER` | `CUSTOM_ROLE` | Prisma validation failure |
| Income | `status` | `UNPAID` | `DRAFT` / `PENDING` | Missing enum value |
