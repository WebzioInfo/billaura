# Bill Aura ERP Video Script — Chapter 21: Chart of Accounts & General Ledger Inquiry

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 21: Chart of Accounts Hierarchy & General Ledger Inquiry
- **Module ID**: `MOD-21-COA`
- **Estimated Runtime**: 11:45
- **Prerequisites**: Baseline transactions posted to ledgers.
- **Target Audience**: Chartered accountants, chief accountants, financial controllers, auditors.

---

## Instructional Sequence

### Section 1: Introduction & The Five Accounting Pillars (00:00 – 01:45)
- **On-Screen**: Navigate to `/chart-of-accounts` via sidebar `Accountant > Chart of Accounts`.
- **Narration**:
  "Welcome back to Bill Aura ERP. Every billing transaction, receipt, bill, payroll run, and stock adjustment we have executed ultimately flows into one central structural framework: the **Chart of Accounts**.
  
  In this session, you will learn how the Chart of Accounts is organized across the five fundamental accounting groups—Assets, Liabilities, Equity, Revenue, and Expenses—how to add custom sub-accounts, how account codes function, and how to conduct forensic drill-downs in the General Ledger Inquiry module."

---

### Section 2: Navigating the Chart of Accounts Tree (`/chart-of-accounts`) (01:45 – 04:30)
- **On-Screen**: View `/chart-of-accounts`. Expand the tree nodes for Assets, Liabilities, Equity, Revenue, Expenses.
- **Cursor Action**: Expand `Assets` > `Current Assets` > `Cash and Bank`. Hover over `HDFC Bank Current Account`.
- **Narration**:
  "The Chart of Accounts presents a hierarchical view of all financial ledgers.
  
  Look at the top five primary roots:
  1. **Assets (Code 1000-1999)**: Resources owned by your business that generate future economic value. Expanding Assets reveals Current Assets (Bank Accounts, Cash, Accounts Receivable, Inventory) and Non-Current Assets (Furniture, Machinery, Computer Equipment).
  2. **Liabilities (Code 2000-2999)**: Debts and financial obligations owed to outside parties. Expanding Liabilities reveals Accounts Payable to vendors, Statutory Taxes Payable (GST, TDS, PF, ESI), and Bank Loans.
  3. **Equity (Code 3000-3999)**: The net worth of the business belonging to owners and shareholders, including Capital Accounts, Drawings, and Retained Earnings.
  4. **Revenue / Income (Code 4000-4999)**: Gross sales of goods, service fees, export income, and other non-operating revenues.
  5. **Expenses (Code 5000-5999)**: Costs incurred in business operations, split cleanly into Cost of Goods Sold (Direct Costs) and Administrative/Operating Expenses (Rent, Salaries, Utilities, Depreciation)."

---

### Section 3: Creating a Custom Ledger Account (04:30 – 06:45)
- **On-Screen**: Click gold `+ Add New Account` button at top right. Modal drawer opens.
- **Cursor Action**: Step-by-step entry:
  1. Account Type: `Expense`.
  2. Parent Account: `Operating Expenses`.
  3. Account Name: `Digital Marketing & Social Media Ads`.
  4. Account Code: `5210`.
  5. Description: `Expenditure on Google Ads, Meta Ads, and digital campaigns`.
- **Narration**:
  "Let us create a specialized sub-account for digital advertising expenses.
  
  Click '+ Add New Account'.
  
  In the **Account Type** dropdown, select 'Expense'.
  
  In the **Parent Account** selector, choose 'Operating Expenses'. By assigning a parent, this new account will automatically roll up under your Operating Expenses subtotal on all Profit & Loss statements.
  
  In 'Account Name', type 'Digital Marketing & Social Media Ads'.
  
  In 'Account Code', enter '5210'.
  
  Enter a brief description for your accounting team: 'Expenditure on Google Ads, Meta Ads, and digital campaigns'.
  
  Click 'Save Account'.
  Notice that our new account '5210 - Digital Marketing' appears immediately in the Chart of Accounts tree under Operating Expenses. When entering bills or petty cash vouchers, your team can now allocate expenditures specifically to this ledger."

---

### Section 4: General Ledger Inquiry & Forensic Drill-Down (`/accounting/ledger`) (06:45 – 10:15)
- **On-Screen**: Navigate to `/accounting/ledger`.
- **Cursor Action**: In the Account Search selector, choose `HDFC Bank Current Account`. Set Date Range: `This Month`.
- **Narration**:
  "Now let us examine the **General Ledger Inquiry** module. Click 'Accountant' and select 'Ledger Inquiry' (or click 'View Ledger' on any account in the Chart of Accounts).
  
  In the Account Selector, choose 'HDFC Bank Current Account'. 
  Set the date filter to 'This Month'.
  
  Observe the ledger statement:
  - **Opening Balance**: The starting balance at the beginning of the period.
  - **Transaction Columns**: Date, Voucher Type (Invoice, Payment, Contra, Journal), Voucher Number, Reference / UTR Number, Party Name, Debit, Credit, and Running Balance.
  
  Notice our transactions from earlier chapters:
  - The payment of ₹ 26,226.00 received from Apex Solutions appears as a Debit to the bank, increasing the running balance.
  - The Contra cash withdrawal of ₹ 25,000.00 appears as a Credit, decreasing the running balance.
  
  Look at the voucher number links: clicking 'REC-2026-0001' directly opens that payment receipt in a workspace tab for immediate verification.
  
  At the top right, click 'Export to Excel' or 'Download PDF' to generate an auditor-ready ledger statement for your chartered accountant."

---

### Section 5: Account Protection & System Rules (10:15 – 11:45)
- **On-Screen**: Hover over a system-reserved account like 'Accounts Receivable' or 'Output CGST Payable'. Show that the 'Delete' option is disabled.
- **Narration**:
  "Bill Aura enforces strict accounting integrity:
  System-critical control accounts—such as Accounts Receivable, Accounts Payable, Retained Earnings, and Statutory GST accounts—are system-locked. They cannot be deleted or reclassified, ensuring your automated billing calculations never break.
  
  Furthermore, user-created accounts with posted financial transactions cannot be deleted; they can only be marked 'Inactive' to preserve historical audit compliance.
  
  In Chapter 22, we will master Manual Journal Entries and double-entry adjustments."
