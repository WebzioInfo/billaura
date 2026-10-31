# Bill Aura ERP — Verification Report & Test Data Suite

## 1. Verification Strategy & Test Environment
To ensure that all training videos demonstrate genuine, functional workflows, a sanitized testing profile has been established matching standard Indian business parameters.

### Sanitized Demonstration Organization:
- **Company Name**: Aura Enterprises Pvt. Ltd.
- **Legal Name**: Aura Enterprises Private Limited
- **GSTIN**: `27AABCA1234F1Z8` (Maharashtra, State Code 27)
- **PAN**: `AABCA1234F`
- **Default Currency**: INR (₹ - Indian Rupee)
- **Registered Address**: Plot No. 45, Hinjewadi Phase 1, Pune, Maharashtra - 411057
- **Primary Bank**: HDFC Bank Ltd., Hinjewadi Branch (A/C: `50200012345678`, IFSC: `HDFC0001234`)
- **Financial Year**: April 1 to March 31

---

## 2. Standardized Demonstration Test Data Set

### A. Customers Test Data
| Identifier | Customer Name | GST Treatment | GSTIN / PAN | State & Code | Opening Balance | Credit Limit |
|---|---|---|---|---|---|---|
| `CUST-001` | Apex Solutions LLP | Regular Business | `27AAACA9876E1Z5` | Maharashtra (27) | ₹ 0.00 | ₹ 2,50,000 |
| `CUST-002` | Bharat Technologies | Regular Business | `24BBBCT5555G1Z2` | Gujarat (24 - Inter-state) | ₹ 15,400.00 | ₹ 5,00,000 |
| `CUST-003` | Rahul Sharma (Retail) | Consumer / Unregistered | N/A | Maharashtra (27) | ₹ 0.00 | ₹ 25,000 |

### B. Vendors Test Data
| Identifier | Vendor Name | Category / Goods | GSTIN | State | MSME Status | Bank Account |
|---|---|---|---|---|---|---|
| `VEND-001` | Delta Packaging Works | Packing Material | `27AABCD4321H1Z9` | Maharashtra (27) | Micro Enterprise | ICICI Bank (`000205012345`) |
| `VEND-002` | Supreme Hardware Corp | Raw Materials | `29AACCS7777K1Z4` | Karnataka (29 - Inter-state) | Small Enterprise | SBI (`30123456789`) |
| `VEND-003` | Pune Office Supplies | Stationery & General | Unregistered | Maharashtra (27) | Non-MSME | Cash on Delivery |

### C. Products & Services Catalog Data
| Item Code | Item Description | Type | Unit | HSN/SAC | Sale Price | Cost Price | GST Rate | Opening Qty |
|---|---|---|---|---|---|---|---|---|
| `ITEM-001`| Precision Ball Bearing 6204 | Goods | PCS | 8482 | ₹ 450.00 | ₹ 280.00 | 18% | 250 PCS |
| `ITEM-002`| Heavy Duty V-Belt B-52 | Goods | PCS | 4010 | ₹ 620.00 | ₹ 390.00 | 18% | 120 PCS |
| `ITEM-003`| Industrial Machine Lubricant 5L| Goods | CAN | 2710 | ₹ 1,850.00 | ₹ 1,200.00 | 18% | 40 CANS |
| `SERV-001`| Annual Machine Maintenance | Service | HRS | 9987 | ₹ 2,500.00 | ₹ 0.00 | 18% | N/A |
| `SERV-002`| Technical Consulting & Audit | Service | DAY | 9983 | ₹ 12,000.00 | ₹ 0.00 | 18% | N/A |

---

## 3. Workflow Verification Results

| Module / Workflow | Execution Sequence | Input Test Data | Expected Outcome | Actual Result | Verification Status |
|---|---|---|---|---|---|
| **WF-01: Customer Onboarding** | Navigate to `/customers/new` -> Enter details -> Submit | `Apex Solutions LLP` with GSTIN `27AAACA9876E1Z5` | Record saved, GSTIN verified, state code 27 populated | Customer created, visible in `/customers` list and quick search | **VERIFIED & WORKING** |
| **WF-02: Intra-State Tax Invoice** | Create invoice for `Apex Solutions LLP` -> Select `ITEM-001` (10 pcs @ ₹450) -> Save & Issue | Qty: 10, Rate: ₹450, Subtotal: ₹4,500 | 9% CGST (₹405) + 9% SGST (₹405), Total: ₹5,310. AR debited ₹5,310, Sales credited ₹4,500, Tax credited ₹810 | Correct GST split, invoice issued, status changed to `ISSUED` | **VERIFIED & WORKING** |
| **WF-03: Inter-State Tax Invoice** | Create invoice for `Bharat Technologies` -> Select `ITEM-002` (5 pcs @ ₹620) | Qty: 5, Rate: ₹620, Subtotal: ₹3,100 | 18% IGST (₹558), Total: ₹3,658. Automatic inter-state detection | Place of supply correctly defaulted to Gujarat (24), IGST applied | **VERIFIED & WORKING** |
| **WF-04: Payment Received** | Navigate to `/invoices/:id/payment` -> Enter ₹5,310 -> Select HDFC Bank | Amount: ₹5,310, Mode: NEFT | Invoice balance reduced to ₹0.00, status changed to `PAID`. HDFC Bank debited, AR credited | Invoice marked PAID, receipt voucher generated with voucher # | **VERIFIED & WORKING** |
| **WF-05: Quotation to Invoice** | Create Quote -> Accept -> Click `Convert to Invoice` | Quote for `ITEM-003` | All line items, rates, discounts, and customer mapped to new invoice draft | Redirected to `/invoices/new` with prefilled quote data | **VERIFIED & WORKING** |
| **WF-06: Stock Adjustment** | Navigate to `/inventory/adjustments/new` -> Select `ITEM-001` -> Deduct 5 pcs | Reason: `Damaged in transit` | Quantity on hand decremented from 240 to 235. Stock adjustment ledger debited | Stock ledger adjusted, real-time audit log created | **VERIFIED & WORKING** |
| **WF-07: Vendor Bill & ITC** | Navigate to `/bills/new` -> Select `Delta Packaging` -> Add packaging material | Bill # `DP-8841`, Amount ₹8,500 + 18% GST | AP credited ₹10,030, Expense debited ₹8,500, ITC debited ₹1,530 | Bill created, reflects in Payables KPI and Vendor Ledger | **VERIFIED & WORKING** |
| **WF-08: Double-Entry Journal** | Navigate to `/journal-entries/new` -> Enter Depreciation entry | Debit Depreciation ₹15,000, Credit Accumulated Depr ₹15,000 | System allows save only when Debits == Credits | Balanced voucher posted to General Ledger | **VERIFIED & WORKING** |
| **WF-09: Financial Statements** | Open `/reports/profit-and-loss` & `/reports/balance-sheet` | Active financial period | P&L computes gross profit, operating profit, and net profit dynamically. Balance Sheet balances Assets = Liabilities + Equity | Live dynamic figures matched ledger balances | **VERIFIED & WORKING** |
| **WF-10: Multi-Document Tabs** | Open 4 tabs in Workspace layout -> Switch tabs | Invoices, Customers, Items, P&L | Each tab preserves active scroll, search filters, and draft state | Instant switching with zero page reloads or memory leaks | **VERIFIED & WORKING** |
