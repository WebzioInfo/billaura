# Bill Aura ERP — Screen Recording Director & Production Guide

This master director's guide specifies the visual choreography, zoom timings, mouse tracking, focus highlights, and on-screen callouts for each chapter in the Bill Aura Video Manual Series.

---

## 1. Global Recording Setup Checklist
- **Display Resolution**: 1920 × 1080 (1080p Full HD)
- **Browser State**: Clean profile with zero bookmark bar clutter, dark navy Bill Aura theme active, UI zoom at 100%.
- **Cursor Highlight**: Circular spotlight (`#F59E0B` at 30% opacity, 36px radius) with gentle click ripple animation.
- **Audio Sample Rate**: 48.0 kHz, 24-bit PCM mono voiceover.
- **Aspect Ratio**: 16:9 widescreen.

---

## 2. Chapter-by-Chapter Shot & Director Plans

### Chapter 01: Workspace Layout & Top Header
| Shot ID | Timecode | Screen / Element | Camera Framing | Mouse & Interaction Path | On-Screen Banner / Callout |
|---|---|---|---|---|---|
| **01-A** | 00:00 - 01:15 | Dashboard Overview | Wide 100% | Slow pan from top header to left sidebar | "Bill Aura Enterprise Workspace" |
| **01-B** | 01:15 - 03:00 | Header Search & Quick Create | Zoom 125% to Header | Cursor hovers on Search Scope, clicks Quick Create `+` | "Global Quick Actions: Invoice, Customer, Bill" |
| **01-C** | 03:00 - 04:30 | Org Switcher & Notifications | Zoom 130% top right | Click Org dropdown, then hover over Notification Bell | "Multi-Tenant Company & Branch Isolation" |
| **01-D** | 04:30 - 05:45 | Workspace Tab Bar | Zoom 125% sub-header | Open 'Items', 'Invoices', 'Customers' in separate tabs | "Multi-Document Tabs: Work without losing state" |
| **01-E** | 05:45 - 06:45 | Sidebar Collapse Rail | Zoom 110% left rail | Click collapse icon; show floating flyouts on hover | "Collapsible Icon Rail for Maximum Data View" |
| **01-F** | 06:45 - 07:45 | Command Palette | Center Focus | Press `Ctrl + /`, type 'New Invoice' | "Keyboard Shortcut: Ctrl + / (Command Palette)" |

### Chapter 02: Company Setup & Statutory Master
| Shot ID | Timecode | Screen / Element | Camera Framing | Mouse & Interaction Path | On-Screen Banner / Callout |
|---|---|---|---|---|---|
| **02-A** | 00:00 - 01:20 | `/settings?tab=company` | Wide 100% | Enter Settings from header gear icon | "System Settings: Company Master" |
| **02-B** | 01:20 - 03:45 | GSTIN & Logo Upload | Zoom 130% form | Enter 15-digit GSTIN, click Upload Logo | "Automatic State Code & Tax Rule Extraction" |
| **02-C** | 03:45 - 05:30 | `/settings?tab=branches` | Medium 115% | Click '+ Add Branch', fill branch code & address | "Multi-Branch & Regional Warehouse Tracking" |
| **02-D** | 05:30 - 07:15 | `/settings?tab=numbering` | Zoom 125% table | Click 'Edit' on Invoice sequence; set prefix `INV/2026/` | "Statutory Sequential Numbering Rules" |
| **02-E** | 07:15 - 09:30 | Validation Test | Zoom 135% input | Type 14-char GSTIN; show instant validation alert | "Strict Indian GST Format Validation" |

### Chapter 04: Items, Units & HSN Configuration
| Shot ID | Timecode | Screen / Element | Camera Framing | Mouse & Interaction Path | On-Screen Banner / Callout |
|---|---|---|---|---|---|
| **04-A** | 00:00 - 03:00 | `/units` | Zoom 120% modal | Click '+ Add Unit', fill Unit Code & UQC code | "Standard GST UQC Units of Measure" |
| **04-B** | 03:00 - 08:30 | `/products/new` (Goods) | Zoom 125% form | Fill Item Name, HSN `8482`, 18% GST, Opening Stock | "Mandatory HSN Code & Opening Stock Valuation" |
| **04-C** | 08:30 - 09:45 | `/products/new` (Service) | Zoom 125% toggle | Switch to Service; enter SAC `9987`, Rate ₹2,500 | "Services: Zero Stock Tracking Applied" |
| **04-D** | 09:45 - 11:20 | `/products` list | Wide 100% table | Demonstrate search filter, category filter, 3-dot menu | "Instant Catalog Search & Status Controls" |

### Chapter 09: Sales Invoicing & Billing
| Shot ID | Timecode | Screen / Element | Camera Framing | Mouse & Interaction Path | On-Screen Banner / Callout |
|---|---|---|---|---|---|
| **09-A** | 00:00 - 03:00 | `/invoices` register | Wide 100% table | Filter tabs: Unpaid vs Overdue vs Paid | "Invoice Aging & Status Lifecycle" |
| **09-B** | 03:00 - 08:30 | `/invoices/new` | Zoom 125% multi-step | Select Apex Solutions, add items, verify GST split | "Automatic Intra-State (CGST+SGST) vs Inter-State (IGST)" |
| **09-C** | 08:30 - 10:45 | Ledger Verification | Split 110% | Show AR debit, Sales credit, Tax credit in ledger | "Automated Double-Entry Accounting Posting" |
| **09-D** | 10:45 - 12:45 | `/invoices/:id/print` | Zoom 110% preview | Scroll print preview; highlight UPI QR code & bank info| "Print-Ready GST Tax Invoice with Dynamic UPI QR" |
| **09-E** | 12:45 - 14:30 | Actions Menu | Zoom 130% top right | Click 'Actions' > Explain Void vs Credit Note rules | "Statutory Rule: Never delete an issued tax invoice" |

### Chapter 11: Payments Received & Receipts
| Shot ID | Timecode | Screen / Element | Camera Framing | Mouse & Interaction Path | On-Screen Banner / Callout |
|---|---|---|---|---|---|
| **11-A** | 00:00 - 02:30 | `/receipts` register | Wide 100% table | Review receipt voucher columns and unused credits | "Customer Payments Journal & Unallocated Advances" |
| **11-B** | 02:30 - 07:15 | `/receipts/new` | Zoom 125% form | Select Apex Solutions, enter UTR, click Auto-Allocate | "Automatic Invoice Allocation & Bank Deposit Mapping" |
| **11-C** | 07:15 - 09:15 | Status Transition | Zoom 130% invoice | Invoice changes to PAID; show bank ledger debit | "Immediate Receivables Clearance in General Ledger" |
| **11-D** | 09:15 - 11:15 | Excess Payment Handling | Zoom 125% summary | Enter payment exceeding balance; show advance credit | "Customer Advances Managed as Current Liabilities" |

### Chapter 15: Purchase Bills & Vendor Payables
| Shot ID | Timecode | Screen / Element | Camera Framing | Mouse & Interaction Path | On-Screen Banner / Callout |
|---|---|---|---|---|---|
| **15-A** | 00:00 - 02:45 | `/bills` register | Wide 100% table | Review vendor bills, due dates, balance due | "Accounts Payable Management & Aging" |
| **15-B** | 02:45 - 07:45 | `/bills/new` | Zoom 125% form | Select Delta Packaging, enter bill #, classify ITC | "Input Tax Credit (ITC) Eligibility & RCM Rules" |
| **15-C** | 07:45 - 10:15 | General Ledger Impact | Split 110% | Show Inventory debit, Expense debit, ITC debit, AP credit| "Automated Tax Asset & Payables Booking" |
| **15-D** | 10:15 - 12:45 | Bill Settlement | Zoom 125% modal | Click 'Record Payment' > Disburse via HDFC Bank | "Vendor Disbursals with UTR Banking References" |

### Chapter 25: Reports Center & Financial Statements
| Shot ID | Timecode | Screen / Element | Camera Framing | Mouse & Interaction Path | On-Screen Banner / Callout |
|---|---|---|---|---|---|
| **25-A** | 00:00 - 03:30 | `/reports` catalog | Wide 100% | Navigate 9 report categories; search 'Aging', star favorite| "30+ Enterprise Financial & Operational Reports" |
| **25-B** | 03:30 - 07:00 | `/reports/profit-and-loss`| Zoom 115% viewer | Toggle Accrual vs Cash basis; compare with Prior Year | "Live Profit & Loss Statement with Dynamic Margins" |
| **25-C** | 07:00 - 10:15 | `/reports/balance-sheet` | Zoom 115% viewer | Scroll through Assets, Liabilities, Equity equation | "Verified Balance Sheet: Assets = Liabilities + Equity" |
| **25-D** | 10:15 - 12:15 | `/reports/ar-aging` | Zoom 120% viewer | Click into 30-day and 60-day customer buckets | "Aging Analysis for Strategic Debt Collection" |
| **25-E** | 12:15 - 13:45 | Export Controls | Zoom 135% top right | Click 'Export to Excel (.xlsx)' and 'Download PDF' | "Audit-Ready Formatted Excel & PDF Statement Exports" |

### Chapter 29: End-to-End Business Cycles
| Shot ID | Timecode | Screen / Element | Camera Framing | Mouse & Interaction Path | On-Screen Banner / Callout |
|---|---|---|---|---|---|
| **29-A** | 00:00 - 01:45 | Workflow Diagram | Split Graphic | Introduce Order-to-Cash and Procure-to-Pay cycles | "Fully Integrated End-to-End Business Automation" |
| **29-B** | 01:45 - 09:00 | Order-to-Cash Cycle | Smooth Pan | Quote -> Sales Order -> Delivery Challan -> Invoice -> Pay| "Order-to-Cash: Complete 5-Stage Execution" |
| **29-C** | 09:00 - 14:45 | Procure-to-Pay Cycle | Smooth Pan | Purchase Order -> Bill -> Payment Made -> Stock Update | "Procure-to-Pay: 3-Way Match & Stock Inflow" |
| **29-D** | 14:45 - 16:30 | Reconciled Audit | Wide 100% | Show Customer 360, Vendor 360, Dashboard all reconciled | "Flawless Multi-Module Synchronization & Integrity" |
