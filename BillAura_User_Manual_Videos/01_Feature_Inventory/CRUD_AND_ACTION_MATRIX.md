# Bill Aura ERP — CRUD & Action Matrix

This matrix documents the operational Create, Read, Update, Delete, Export, Import, Print, and Status-Transition actions available across every core business entity.

| Business Entity | Primary Route | Create Action | Read / List Action | Update / Edit Action | Delete / Void Action | Export / Print Action | Status Transitions Supported |
|---|---|---|---|---|---|---|---|
| **Products & Items** | `/products` | `+ New Item` modal / `/products/new` | Infinite-scroll/paginated table with category filters | Inline edit / `/products/:id/edit` | Soft delete with dependency check | Excel/CSV export | Active, Inactive, Discontinued |
| **Units of Measure** | `/units` | `+ Add Unit` dialog | Master grid with conversion factors | Edit unit name & symbol | Prevented if items reference unit | Standard display | Active |
| **Categories** | `/categories` | `+ Add Category` | Hierarchical tree view | Rename / reassign parent | Prevented if child items exist | Export catalog | Active |
| **Customers** | `/customers` | `+ New Customer` / Quick Create | Searchable data grid with balances | Full profile edit form | Soft delete (prevented if open invoices) | PDF customer statement, Excel | Active, Inactive, Blacklisted |
| **Customer Segments**| `/customer-segments` | `+ New Segment` | Segment tag list | Edit rules & discount % | Delete segment tag | N/A | Active |
| **Quotations** | `/quotations` | `+ New Quote` | List with status pills & expiry dates | Edit draft quote | Void / Delete draft | Download PDF, Email to customer | Draft -> Sent -> Accepted / Declined -> Invoiced |
| **Sales Orders** | `/sales-orders` | `+ New Order` / Convert from Quote | Order queue with fulfillment status | Edit unfulfilled order | Cancel order | Printable sales order | Draft -> Confirmed -> Partially Shipped -> Fulfilled -> Invoiced -> Cancelled |
| **Delivery Challans** | `/delivery-challans`| `+ New Challan` | Dispatch register with vehicle # | Edit dispatch details | Cancel before delivery | Dispatch note print | Draft -> Dispatched -> Delivered |
| **Sales Invoices** | `/invoices` | `+ New Invoice` / Quick Create | Searchable invoice ledger with aging | Edit draft invoice | Cancel / Void (issues credit reversal) | Branded PDF, Thermal print, WhatsApp | Draft -> Issued -> Partially Paid -> Paid -> Overdue -> Void |
| **Receipts** | `/receipts` | `+ New Receipt` / Record Payment | Receipts journal with payment mode | Re-allocate open invoices | Delete un-cleared receipt (re-opens bills) | Printable receipt voucher | Draft -> Recorded -> Cleared |
| **Credit Notes** | `/credit-notes` | `+ New Credit Note` | Returns ledger with reason codes | Edit draft credit note | Void credit note | Credit Note PDF | Open -> Applied to Invoice -> Refunded |
| **Vendors** | `/vendors` | `+ New Vendor` | Supplier directory with payables | Edit profile & bank details | Soft delete (prevented if open POs/bills)| Vendor statement PDF | Active, Inactive |
| **Purchase Orders** | `/purchase-orders` | `+ New PO` | PO ledger with delivery dates | Edit open PO | Cancel PO | Purchase order PDF | Draft -> Issued -> Billed -> Cancelled |
| **Purchase Bills** | `/bills` | `+ New Bill` | Unpaid bills with due dates | Edit un-cleared bill | Void bill (reverses stock & AP) | Bill summary PDF | Open -> Partially Paid -> Paid -> Overdue |
| **Payments Made** | `/vendor-payments`| `+ Record Payment` | Disbursals log with cheque refs | Edit payment allocation | Void payment (re-opens bills) | Payment remittance advice | Recorded -> Cleared |
| **Vendor Credits** | `/debit-notes` | `+ New Vendor Credit`| Debit notes list | Edit debit note | Void debit note | Debit note print | Available -> Applied -> Refunded |
| **Expenses** | `/expenses` | `+ Add Expense` | Expense tracker with category breakdown | Edit expense voucher | Delete expense voucher | Expense report export | Incurred -> Paid |
| **Bank Accounts** | `/settings?tab=bank-accounts` | `+ Add Account` | Accounts grid with IFSC & balances | Edit account info & opening balance | Prevented if transactions exist | Account statement | Active |
| **Bank Transactions**| `/bank-transactions` | Deposit / Transfer modal | Comprehensive statement log | Categorize / link voucher | Delete un-reconciled line | Statement CSV export | Un-reconciled -> Matched -> Reconciled |
| **Chart of Accounts**| `/chart-of-accounts`| `+ Add Account` | Five-level hierarchy tree | Edit account description & code | Prevented if journal entries exist | COA structure export | Active |
| **Manual Journals** | `/journal-entries` | `+ New Journal` | Journal vouchers with debit/credit | Edit unposted journal | Reverse journal voucher | Journal print voucher | Draft -> Published -> Reversed |
| **Employees** | `/employees` | `+ Add Employee` | Employee directory with salary status | Edit employee profile & salary structure| Deactivate employee | Staff list export | Active, On Leave, Terminated |
| **Payroll Runs** | `/payroll` | `+ Generate Payroll`| Monthly payroll cycles | Review & adjust salary line items | Cancel draft payroll run | Bulk Payslip PDF, Bank transfer sheet | Draft -> Approved -> Processed -> Paid |
| **Attendance** | `/attendance` | Mark daily attendance | Monthly attendance grid | Modify daily status & clock times | Clear attendance day | Attendance register export | Present, Absent, Half-Day, Paid Leave |
| **Users & Roles** | `/settings?tab=users` | `+ Invite User` | User management grid with roles | Update assigned permissions & branches | Revoke user access | User list | Invited, Active, Suspended |
| **Reports** | `/reports` | N/A (Analytical engine)| 30+ interactive report viewers | Adjust date ranges & filters | N/A | Export to Excel (.xlsx), CSV, PDF | Real-time computation |
