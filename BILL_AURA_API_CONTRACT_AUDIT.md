# BILL AURA — API CONTRACT & ENDPOINT AUDIT
**Audit Date:** November 16, 2026  
**Auditor:** Principal Software Architect  
**Scope:** 441 Backend Endpoints across 33 Controllers vs 538 Frontend API Invocations

---

## 1. Executive Summary

A comprehensive automated scan comparing all backend NestJS `@Controller` routes against all Axios `apiClient` invocations in the frontend revealed **31 critical API contract mismatches**.

These mismatches fall into four primary categories:
1. **Missing Endpoints (404 Not Found):** Frontend features call routes that do not exist in any backend controller.
2. **HTTP Verb Incompatibilities:** Frontend calls `PUT` where the backend expects `PATCH`, or calls `DELETE` where only specific query parameters are supported.
3. **Route Prefix Typos:** Frontend calls `/crm/vendors` instead of `/vendors`, `/accounting/accounts` instead of `/accounts`, `/invoices` instead of `/sales/invoices`, or `/api/reports/...` causing `/api/api/...` double-prefixing.
4. **Response Serialization Mismatches:** Backend returns `{ success: true, data: { items: [], total: 0 } }` while frontend expects `{ items: [] }` or a direct array `[]`.

---

## 2. Exhaustive API Contract Discrepancy Register

### [API-001] Missing User Creation Endpoint
- **Frontend Caller:** `frontend/src/features/users/UserForm.tsx` (Line 123)
  ```typescript
  await apiClient.post('/users/enterprise-create', values);
  ```
- **Backend Controller:** `backend/src/users/users.controller.ts`
  - Controller routes: `GET /users`, `POST /users/invite`, `PUT /users/:id/role`, `DELETE /users/:id`.
- **Status:** CONFIRMED BUG
- **Impact:** User creation through the standard `UserForm` crashes with `404 Cannot POST /users/enterprise-create`.

---

### [API-002] CRM Customer Update Verb Mismatch
- **Frontend Caller:** `frontend/src/features/crm/api/crm.api.ts` (Line 8)
  ```typescript
  updateCustomer: (id: string, data: any) => api.put<Customer>(`/customers/${id}`, data)
  ```
- **Backend Controller:** `backend/src/crm/customers.controller.ts` (Line 68)
  ```typescript
  @Patch(":id")
  async update(@Param("id") id: string, @Body() data: any)
  ```
- **Status:** CONFIRMED BUG
- **Impact:** Any component invoking `CrmApi.updateCustomer()` receives `404 Cannot PUT /customers/:id`. (Note: `BusinessPartnerForm.tsx` bypassed this by calling `apiClient.patch` directly, but the API service contract remains broken).

---

### [API-003] CRM Lead Update Verb Mismatch
- **Frontend Caller:** `frontend/src/features/crm/api/crm.api.ts` (Line 13)
  ```typescript
  updateLead: (id: string, data: any) => api.put<Lead>(`/crm/leads/${id}`, data)
  ```
- **Backend Controller:** `backend/src/crm/leads.controller.ts` (Line 40)
  ```typescript
  @Patch(":id")
  async update(@Param("id") id: string, @Body() updateLeadDto: UpdateLeadDto)
  ```
- **Status:** CONFIRMED BUG
- **Impact:** Calling `CrmApi.updateLead()` throws `404 Cannot PUT /crm/leads/:id`.

---

### [API-004] Route Prefix Mismatch: Vendors
- **Frontend Caller:** `frontend/src/features/crm/VendorsList.tsx` (Line 12)
  ```typescript
  const res = await apiClient.get('/crm/vendors');
  ```
- **Backend Controller:** `backend/src/purchases/vendors.controller.ts` (Line 21)
  - Controller is mapped to `@Controller("vendors")`. Route is `GET /vendors`.
- **Status:** CONFIRMED BUG
- **Impact:** `VendorsList` table fails to load with `404 Cannot GET /crm/vendors`.

---

### [API-005] Route Prefix Mismatch: Customer Invoices
- **Frontend Caller:** `frontend/src/features/crm/CustomerProfile.tsx` (Line 95)
  ```typescript
  const res = await apiClient.get('/invoices', { params: { customerId: id, limit: 50 } });
  ```
- **Backend Controller:** `backend/src/sales/invoices.controller.ts` (Line 32)
  - Controller is mapped to `@Controller("sales/invoices")`. Route is `GET /sales/invoices`.
- **Status:** CONFIRMED BUG
- **Impact:** Customer profile invoices tab always displays 404 error and cannot show billing history.

---

### [API-006] Route Prefix Mismatch: Accounting Accounts
- **Frontend Caller:** `frontend/src/features/accounting/CapitalDashboard.tsx` (Line 123)
  ```typescript
  const res = await api.get('/accounting/accounts');
  ```
- **Backend Controller:** `backend/src/accounting/accounts.controller.ts` (Line 19)
  - Controller is mapped to `@Controller("accounts")`. Route is `GET /accounts`.
- **Status:** CONFIRMED BUG
- **Impact:** Fallback equity calculations in `CapitalDashboard` fail with 404 error.

---

### [API-007] Route Prefix Mismatch: Employees Lookup
- **Frontend Caller:** `frontend/src/features/sales/CreditNoteForm.tsx` (Line 185)
  ```typescript
  const res = await apiClient.get('/employees', { params: { limit: 50 } });
  ```
- **Backend Controller:** `backend/src/hr/hr.controller.ts` (Line 23 & 28)
  - Controller is mapped to `@Controller("hr")`. Route is `GET /hr/employees`.
- **Status:** CONFIRMED BUG
- **Impact:** Salesperson selector in `CreditNoteForm` is permanently empty.

---

### [API-008] Non-Existent Parties Endpoint
- **Frontend Caller:** `frontend/src/features/expenses/ExpensesDashboard.tsx` (Line 214)
  ```typescript
  const res = await apiClient.get('/parties', { params: { type: 'VENDOR' } });
  ```
- **Backend State:** No `/parties` controller or route exists in the entire backend. Vendors are served via `GET /vendors`.
- **Status:** CONFIRMED BUG
- **Impact:** Vendor filtering in `ExpensesDashboard` fails on initial load.

---

### [API-009] Non-Existent Vendor Ledger Endpoint
- **Frontend Caller:** `frontend/src/features/vendors/VendorProfile.tsx` (Line 95)
  ```typescript
  await apiClient.get(`/vendors/${id}/ledger`);
  ```
- **Backend Controller:** `backend/src/purchases/vendors.controller.ts`
  - While `customers.controller.ts` has `@Get(":id/ledger")`, `vendors.controller.ts` does NOT have an equivalent endpoint.
- **Status:** CONFIRMED BUG
- **Impact:** Vendor ledger tab in `VendorProfile` returns 404 Not Found.

---

### [API-010] Double-Prefixed API Route in Profit & Loss
- **Frontend Caller:** `frontend/src/features/reports/ProfitLossDashboard.tsx` (Line 66)
  ```typescript
  return await apiClient.get('/api/reports/profit-loss', { params: { dateRange } });
  ```
- **Base URL:** `apiClient` defaults to baseURL `/api`.
- **Resulting Request:** `GET /api/api/reports/profit-loss`.
- **Status:** CONFIRMED BUG
- **Impact:** Secondary fallback for Profit & Loss report throws 404.

---

### [API-011] Non-Existent Mark-Sent Invoices Endpoint
- **Frontend Caller:** `InvoicesList.tsx` (Line 296) and `InvoiceDetailPane.tsx` (Line 173)
  ```typescript
  await apiClient.post(`/sales/invoices/${invoiceId}/mark-sent`);
  ```
- **Backend Controller:** `backend/src/sales/invoices.controller.ts`
  - No `mark-sent` sub-route exists. Status updates must go through `PUT /sales/invoices/:id` with `{ status: 'SENT' }`.
- **Status:** CONFIRMED BUG
- **Impact:** Always produces a 404 network error in browser console before hitting the fallback catch block.

---

### [API-012] Attendance Edit Route Incompatibility
- **Frontend Caller:** `frontend/src/features/hr/components/AttendanceFormModal.tsx` (Line 105)
  ```typescript
  await apiClient.patch(`/hr/attendances/${existingRecord.id}`, payload);
  ```
- **Backend Controller:** `backend/src/hr/hr.controller.ts`
  - Exposes `POST /hr/attendances` (record/upsert) and `POST /hr/attendances/status`. Does NOT expose `PATCH /hr/attendances/:id`.
- **Status:** CONFIRMED BUG
- **Impact:** Editing single attendance records via the modal throws 404.

---

### [API-013] Asset Assignment Ghost API
- **Frontend Caller:** `frontend/src/features/hr/components/AssetAssignmentModal.tsx` (Line 28)
  ```typescript
  await api.post('/hr/assets/assign', { ... });
  ```
- **Backend Controller:** `backend/src/hr/hr.controller.ts`
  - No `/hr/assets` controller exists.
- **Status:** CONFIRMED ARCHITECTURAL DEFECT
- **Impact:** Catch block displays a fake success toast ("Asset assignment recorded locally"), masking that no record was saved to PostgreSQL.

---

### [API-014] Missing Update Commission Rule Route
- **Frontend Caller:** `frontend/src/features/settings/pages/CommissionRulesSettings.tsx` (Line 26)
  ```typescript
  await apiClient.put(`/commissions/rules/${payload.id}`, payload);
  ```
- **Backend Controller:** `backend/src/commissions/commissions.controller.ts`
  - Exposes `POST /commissions/rules` and `GET /commissions/rules`. Does NOT expose `PUT /commissions/rules/:id`.
- **Status:** CONFIRMED BUG
- **Impact:** Existing commission rules cannot be updated; updating throws 404.

---

### [API-015] Non-Existent Expense PDF Export Route
- **Frontend Caller:** `frontend/src/features/expenses/ExpensesDashboard.tsx` (Line 1040)
  ```typescript
  await apiClient.get(`/documents/expenses/${selectedExpense.id}/export`);
  ```
- **Backend Controller:** `backend/src/documents/documents.controller.ts`
  - Only exposes `/documents/attendance/export`, `/documents/table/export`, and `/documents/standard/export`.
- **Status:** CONFIRMED BUG
- **Impact:** Expense PDF export button fails with 404.

---

### [API-016] Non-Existent Document & Payslip Export Routes
- **Frontend Callers:**
  - `frontend/src/core/reporting/DocumentEngine.ts` (Line 39): `POST /documents/transaction/export`
  - `frontend/src/core/reporting/ReportEngine.ts` (Line 76): `POST /documents/payslip/export`
- **Backend State:** Neither route exists in `DocumentsController`.
- **Status:** CONFIRMED BUG
- **Impact:** Standardized document and payslip export routines in core reporting fail.

---

## 3. Summary of API Discrepancies by Controller

| Backend Controller | Expected Route | Frontend Called Route | Failure Type |
|---|---|---|---|
| `UsersController` | `POST /users/invite` | `POST /users/enterprise-create` | 404 Not Found |
| `CustomersController` | `PATCH /customers/:id` | `PUT /customers/:id` | 404 Method Mismatch |
| `LeadsController` | `PATCH /crm/leads/:id` | `PUT /crm/leads/:id` | 404 Method Mismatch |
| `VendorsController` | `GET /vendors` | `GET /crm/vendors` | 404 Route Prefix |
| `InvoicesController` | `GET /sales/invoices` | `GET /invoices` | 404 Route Prefix |
| `AccountsController` | `GET /accounts` | `GET /accounting/accounts` | 404 Route Prefix |
| `HrController` | `GET /hr/employees` | `GET /employees` | 404 Route Prefix |
| `HrController` | `POST /hr/attendances` | `PATCH /hr/attendances/:id` | 404 Not Found |
| `HrController` | N/A | `POST /hr/assets/assign` | 404 Fake Catch Block |
| `VendorsController` | N/A | `GET /vendors/:id/ledger` | 404 Not Found |
| `CommissionsController`| N/A | `PUT /commissions/rules/:id` | 404 Not Found |
| `DocumentsController` | `GET /documents/attendance/export` | `GET /reports/attendance/export` | 404 Route Prefix |
| `DocumentsController` | N/A | `GET /documents/expenses/:id/export` | 404 Not Found |
| `DocumentsController` | N/A | `POST /documents/transaction/export` | 404 Not Found |
| `DocumentsController` | N/A | `POST /documents/payslip/export` | 404 Not Found |
| `InvoicesController` | `PUT /sales/invoices/:id` | `POST /sales/invoices/:id/mark-sent` | 404 Dead Code |
