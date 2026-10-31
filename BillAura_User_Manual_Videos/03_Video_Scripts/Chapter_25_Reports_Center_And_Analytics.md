# Bill Aura ERP Video Script — Chapter 25: Reports Center, Financial Statements & Analytical Exports

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 25: Comprehensive Reports Center, Financial Statements & Custom Analytics
- **Module ID**: `MOD-25-REPORTS`
- **Estimated Runtime**: 13:45
- **Prerequisites**: Full operational transactions across sales, purchases, banking, and accounting.
- **Target Audience**: CFOs, chartered accountants, financial analysts, business owners, investors.

---

## Instructional Sequence

### Section 1: Introduction (00:00 – 01:30)
- **On-Screen**: Navigate to `/reports` via sidebar `Reports`. `ReportsCenter.tsx` loads.
- **Narration**:
  "Welcome back to Bill Aura ERP. Timely, accurate financial statements and operational reports are what transform raw transactional data into high-value strategic decision-making.
  
  In this masterclass session, you will explore the centralized **Reports Center** in Bill Aura—housing over thirty enterprise-grade analytical reports categorized into Business Overview, Sales, Receivables, Payables, Purchases & Expenses, Banking, Taxes, Accountant, and Departmental. You will learn how to configure date periods, toggle Accrual versus Cash accounting basis, generate prior-period comparisons, and export audit-ready statements to Excel and PDF."

---

### Section 2: Explaining the Reports Center Layout (`/reports`) (01:30 – 03:30)
- **On-Screen**: View `/reports`. Explain two-column layout: Left sidebar categories, Center search bar, Right report catalog cards with Star Favorites and Last Visited timestamps.
- **Cursor Action**: Click 'Star' icon to toggle favorites. Type 'Aging' in the search bar.
- **Narration**:
  "The Reports Center is organized into an intuitive two-column workspace:
  
  On the left panel, notice the primary report folders:
  - All Reports & Favorites
  - Business Overview
  - Sales & Receivables
  - Payables & Purchases
  - Banking & Accountant
  - Taxes & Departmental
  
  In the center header, notice the real-time search box. Typing 'Profit' or 'Aging' filters the 30+ reports instantly.
  
  Look at the individual report cards: each card displays the report title, a concise executive description, and a gold star icon. Clicking the star pins that report to your 'Favorite Reports' folder for 1-click access. Notice also the 'Last Visited' timestamp that tracks when you or your team last audited each statement."

---

### Section 3: Profit and Loss Statement (`/reports/profit-and-loss`) (03:30 – 07:00)
- **On-Screen**: Click on 'Profit and Loss' report card. `ReportViewer.tsx` loads `/reports/profit-and-loss`.
- **Cursor Action**: Step through filters:
  1. Date Range: `This Financial Year`.
  2. Accounting Basis: Toggle between `Accrual Basis` and `Cash Basis`.
  3. Compare With: Select `Previous Year`.
- **Narration**:
  "Click on 'Profit and Loss'. The interactive Report Viewer loads.
  
  **1. Operating Controls Bar**
  At the top, examine the control ribbon:
  - **Date Range**: Select 'This Financial Year' (April 1 to March 31).
  - **Accounting Basis (Accrual vs. Cash)**: 
    Under *Accrual Basis*, revenue is recognized when invoices are issued, and expenses when bills are incurred—regardless of cash receipt. Under *Cash Basis*, revenue and expenses are recognized strictly when cash actually changes hands. Bill Aura recalculates the entire statement dynamically when toggling between bases.
  - **Compare With**: Select 'Previous Year'. Bill Aura adds comparative columns showing previous period figures and the percentage growth variance.
  
  **2. Analyzing the Statement Structure**
  Scroll through the statement:
  - **Operating Revenue**: Total goods sales and professional services billed.
  - **Cost of Goods Sold (COGS)**: Opening stock plus purchases minus closing inventory.
  - **Gross Profit**: Operating Revenue minus COGS, along with your Gross Margin percentage.
  - **Operating Expenses**: Administrative expenses, digital marketing, salaries, rent, and depreciation.
  - **Operating Income (EBITDA)**: Operating profitability before interest and taxes.
  - **Other Income & Expenses**: Bank interest credited, scrap sales, financing costs.
  - **Net Profit**: The final bottom-line profitability of your business enterprise!"

---

### Section 4: Balance Sheet & Cash Flow Statement (07:00 – 10:15)
- **On-Screen**: Return to `/reports` and open 'Balance Sheet' (`/reports/balance-sheet`).
- **Narration**:
  "Next, let us open the **Balance Sheet**.
  
  Unlike the P&L which measures performance over an accounting period, the Balance Sheet is a snapshot of financial health 'As of a specific date'.
  
  Notice the control reads 'As of Date: 31st March 2027'.
  
  Scroll through the balance sheet:
  - **Assets**: Current Assets (Cash & Bank, Accounts Receivable, Inventory) and Fixed Assets (Machinery, Computers, Vehicles).
  - **Liabilities**: Current Liabilities (Accounts Payable, Output GST Payable, TDS Payable) and Long-Term Loans.
  - **Equity**: Owner's Capital, Drawings, and current-period Net Profit automatically rolled into Retained Earnings!
  
  Notice the fundamental accounting verification line at the bottom: 
  **Total Assets == Total Liabilities + Total Equity**. 
  The equation balances perfectly to the exact rupee."

---

### Section 5: Receivables & Payables Aging Reports (10:15 – 12:15)
- **On-Screen**: Open 'AR Aging Summary' (`/reports/ar-aging-summary`).
- **Cursor Action**: Show aging buckets: `Current`, `1-30 Days`, `31-60 Days`, `61-90 Days`, `90+ Days`.
- **Narration**:
  "Now inspect the **AR Aging Summary** under Receivables.
  
  This report is the collection manager's most vital tool. It organizes every customer's unpaid balance into chronological risk buckets:
  - Current (not yet due)
  - 1 to 30 days overdue
  - 31 to 60 days overdue
  - 61 to 90 days overdue
  - 90+ days overdue (bad debt risk)
  
  Clicking on any customer row reveals every overdue invoice number, date, and customer phone number for immediate collection follow-up. 
  
  The identical breakdown is available under Payables for **AP Aging Summary**, ensuring you manage supplier liabilities strategically."

---

### Section 6: Exporting Audit-Ready Statements & Summary (12:15 – 13:45)
- **On-Screen**: Click 'Export' dropdown in the top right ribbon of the report viewer. Show options: `Export to Excel (.xlsx)`, `Export to CSV`, `Print / PDF`.
- **Narration**:
  "At the top right of every report viewer is the **Export** menu:
  - **Export to Excel (.xlsx)**: Generates a cleanly formatted spreadsheet complete with freeze panes, currency formatting, and formula subtotals.
  - **Download PDF**: Produces a print-ready, branded formal statement suitable for board meetings, bank loan applications, or statutory auditor reviews.
  
  In Chapter 26, we will explore the People & HR module, including employee masters and automated payroll generation."
