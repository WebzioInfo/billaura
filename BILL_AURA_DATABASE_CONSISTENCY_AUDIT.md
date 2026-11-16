# BILL AURA — DATABASE & PRISMA CONSISTENCY AUDIT
**Audit Date:** November 16, 2026  
**Auditor:** Principal PostgreSQL Database Architect  
**Scope:** Prisma Schema (`schema.prisma`), PostgreSQL Database Engine, 60 Enums, 85 Models, Constraints & Indexes

---

## 1. Executive Summary

This audit inspected the PostgreSQL relational data layer and Prisma ORM configuration across all Bill Aura modules.

### The Single Greatest Architectural Defect: The Soft-Delete Unique Collision Flaw
In PostgreSQL, a standard unique constraint or unique index created via Prisma:
```prisma
@@unique([companyId, documentNo])
```
enforces uniqueness across **EVERY ROW IN THE TABLE**, including soft-deleted rows where `deletedAt IS NOT NULL`.

Prisma schema does not support partial unique indexes (e.g. `CREATE UNIQUE INDEX ... WHERE "deletedAt" IS NULL`).

Consequently, whenever a tenant deletes an entity (e.g. `Invoice`, `Purchase`, `TransactionPayment`, `Brand`, `ProductCategory`, `Department`, `Employee`, `Expense`), the document number or code remains locked in PostgreSQL. Any subsequent attempt to recreate, restore, or reallocate that document number crashes the application with:
`P2002: Unique constraint failed on the fields: (companyId, documentNo)`.

This exact failure triggered the production crash on `TransactionPayment.paymentNo = "PAYMENT-00005"`.

---

## 2. Comprehensive Inventory of Affected Models (48 Models)

The following 48 database models possess both a `deletedAt DateTime?` soft-delete column AND unconditional unique constraints:

| Model | Unique Constraint | Impact When Soft-Deleted |
|---|---|---|
| `TransactionPayment` | `@@unique([companyId, paymentNo])` | Blocks reuse of payment sequence numbers (PROD REPRODUCED) |
| `Invoice` | `@@unique([companyId, invoiceNo])` | Cannot recreate or reuse invoice numbers |
| `Purchase` | `@@unique([companyId, purchaseNo])` | Cannot recreate purchase bills |
| `Quotation` | `@@unique([companyId, quotationNo])` | Cannot reuse quote numbers |
| `DeliveryNote` | `@@unique([companyId, noteNo])` | Cannot reuse delivery challan numbers |
| `PurchaseOrder` | `@@unique([companyId, orderNo])` | Cannot reuse PO numbers |
| `SalesOrder` | `@@unique([companyId, orderNo])` | Cannot reuse sales order numbers |
| `GoodsReceipt` | `@@unique([companyId, receiptNo])` | Cannot reuse GRN numbers |
| `Expense` | `@@unique([companyId, expenseNo])` | Cannot reuse expense sequence numbers |
| `Receipt` | `@@unique([companyId, receiptNo])` | Cannot reuse customer receipt numbers |
| `Employee` | `@@unique([companyId, employeeCode])` | Cannot rehire or recreate employee with same code |
| `Attendance` | `@@unique([employeeId, date])` | Deleting attendance blocks re-recording for that date |
| `SalarySlip` | `@@unique([employeeId, startDate, endDate])` | Deleting slip blocks regenerating payroll |
| `Department` | `@@unique([companyId, name])` | Deleting department blocks recreating with same name |
| `Designation` | `@@unique([companyId, name])` | Deleting designation blocks recreating with same name |
| `Shift` | `@@unique([companyId, name])` | Deleting shift blocks recreating with same name |
| `EmploymentType` | `@@unique([companyId, code])` | Deleting employment type locks code forever |
| `LeaveType` | `@@unique([companyId, code])` | Deleting leave type locks code forever |
| `SalaryComponent` | `@@unique([companyId, code])` | Deleting salary component locks code forever |
| `Warehouse` | `@@unique([companyId, name])` | Deleting warehouse locks warehouse name |
| `Brand` | `@@unique([companyId, brandCode])`, `brandName` | Deleting brand locks code and name |
| `ProductCategory` | `@@unique([companyId, categoryName])` | Deleting category locks name |
| `Unit` | `@@unique([companyId, code])` | Deleting unit locks code |
| `Account` | `@@unique([companyId, name])` | Deleting ledger account locks account name |
| `ExpenseCategory` | `@@unique([companyId, name])` | Deleting expense category locks name |
| `IncomeCategory` | `@@unique([companyId, name])` | Deleting income category locks name |
| `CustomerSegment` | `@@unique([companyId, name])` | Deleting segment locks name |
| `CustomerDepartment`| `@@unique([companyId, name])` | Deleting customer department locks name |
| `Stock` | `@@unique([companyId, productId, warehouseId])` | Deleting stock ledger breaks re-addition |
| `BillOfMaterial` | `@@unique([companyId, productId])` | Deleting BOM locks product BOM creation |
| `ProductionOrder` | `@@unique([companyId, orderNo])` | Deleting production order locks sequence |
| `SalesReturn` | `@@unique([companyId, returnNumber])` | Deleting sales return locks sequence |
| `PurchaseReturn` | `@@unique([companyId, returnNumber])` | Deleting purchase return locks sequence |
| `EmployeeAdvance` | `@@unique([companyId, advanceNumber])` | Deleting advance locks sequence |
| `InternalTransfer` | `@@unique([companyId, transferNumber])`| Deleting transfer locks sequence |
| `OtherIncome` | `@@unique([companyId, incomeNo])` | Deleting other income locks sequence |
| `InventoryBatch` | `@@unique([companyId, productId, batchNo])`| Deleting batch locks batch number |
| `InventorySerial` | `@@unique([companyId, productId, serialNo])`| Deleting serial locks serial number |
| `HolidayCalendar` | `@@unique([companyId, date, name])` | Deleting holiday locks date and name |
| `UnitConversion` | `@@unique([companyId, fromUnitId, toUnitId])`| Deleting conversion locks unit pair |
| `HistoricalInvoice`| `@@unique([companyId, invoiceNo])` | Deleting historical invoice locks number |

---

## 3. Foreign Key Nullability Inconsistencies

### [DB-001] TransactionPayment Non-Nullable BankAccount ID
- **Schema Location:** `backend/prisma/schema.prisma` (Line 1269)
  ```prisma
  model TransactionPayment {
    id                String          @id @default(cuid())
    companyId         String
    businessPartnerId String
    bankAccountId     String          // NON-NULLABLE!
    bankAccount       BankAccount     @relation(fields: [bankAccountId], references: [id])
  ```
- **Architectural Conflict:**
  In financial accounting, payments can be made via **Cash** (physical drawer / petty cash), which is an `Account` or `CashAccount`, NOT a commercial `BankAccount`.
  Because `bankAccountId` is non-nullable, every cash transaction is forced to reference a dummy or shadow bank account record, violating database domain integrity.
- **Recommended Architectural Solution:**
  Make `bankAccountId String?` nullable, and add `cashAccountId String?` or `accountId String` representing the actual ledger account credited.

---

### [DB-002] Stock Model Missing Multi-Unit Decimal Precision
- **Schema Location:** `model Stock`
  ```prisma
  quantity Decimal @default(0) @db.Decimal(15, 2)
  ```
- **Conflict:**
  For businesses dealing in fractional units (e.g. kilograms, liters, grams, meters, fuel), a scale of `2` (`Decimal(15, 2)`) leads to truncation errors (e.g. 1.255 kg truncated to 1.25 kg).
  Financial currency amounts require `Decimal(15, 2)`, but physical inventory quantities require `Decimal(15, 4)` or `Decimal(15, 3)`.

---

### [DB-003] Missing Partial Unique Indexes in PostgreSQL
- **Problem:**
  Prisma `@@unique` compiles to standard PostgreSQL `UNIQUE CONSTRAINT`.
- **Authoritative Fix:**
  Execute PostgreSQL raw migration adding partial unique indexes:
  ```sql
  -- Example for Invoices:
  ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "invoices_companyId_invoiceNo_key";
  CREATE UNIQUE INDEX "invoices_company_invoice_no_active_idx" 
  ON "invoices" ("companyId", "invoiceNo") 
  WHERE "deletedAt" IS NULL;

  -- Example for Payments:
  ALTER TABLE "transaction_payments" DROP CONSTRAINT IF EXISTS "transaction_payments_companyId_paymentNo_key";
  CREATE UNIQUE INDEX "transaction_payments_company_payment_no_active_idx" 
  ON "transaction_payments" ("companyId", "paymentNo") 
  WHERE "deletedAt" IS NULL;
  ```
  This immediately eliminates sequence number collisions across soft-deleted records without needing manual string renaming hacks.

---

### [DB-004] Decimal vs Floating Point Arithmetic in ORM
- Prisma maps PostgreSQL `Decimal` to `Prisma.Decimal` (Decimal.js object).
- In multiple services (`invoices.service.ts`, `purchases.service.ts`, `purchase-payments.service.ts`), numbers are converted via `Number(record.amount)`.
- If precision beyond 2 decimal places is used without standard banking rounding (`Math.round(x * 100) / 100`), IEEE 754 floating point inaccuracies (e.g. `0.1 + 0.2 = 0.30000000000000004`) cause general ledger journal entries to fail balance verification (`Total Debits !== Total Credits`).
