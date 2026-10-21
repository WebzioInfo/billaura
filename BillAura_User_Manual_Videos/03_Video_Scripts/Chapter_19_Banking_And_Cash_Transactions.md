# Bill Aura ERP Video Script — Chapter 19: Banking, Cash Accounts & Contra Transfers

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 19: Banking Overview, Cash Accounts, Contra Transfers & Transaction Categorization
- **Module ID**: `MOD-19-BANKING`
- **Estimated Runtime**: 10:30
- **Prerequisites**: Bank accounts configured in Settings (`/settings?tab=bank-accounts`).
- **Target Audience**: Treasury managers, accountants, cashiers, business owners.

---

## Instructional Sequence

### Section 1: Introduction (00:00 – 01:15)
- **On-Screen**: Navigate to `/banking` via sidebar `Banking > Banking`.
- **Narration**:
  "Welcome back to Bill Aura ERP. Maintaining absolute control over your liquid funds across multiple commercial bank accounts, credit card facilities, and physical petty cash registers is crucial to financial stability.
  
  In this chapter, you will learn how to monitor bank and cash balances, log manual bank deposits and withdrawals, execute balanced inter-account Contra transfers, and manage daily cashbook operations."

---

### Section 2: Explaining the Banking Dashboard (`/banking`) (01:15 – 03:00)
- **On-Screen**: View `/banking`. Explain layout: Bank Account cards (HDFC Current Account, ICICI Tax Account, Petty Cash Register), Total Cash in Hand, Un-cleared Transactions counter, and Statement Balance vs Book Balance.
- **Narration**:
  "The Banking Dashboard displays individual cards for each registered financial account.
  
  Look at the 'HDFC Bank Current Account' card:
  - 'Book Balance': Represents the balance according to all recorded sales receipts, vendor payments, and journal vouchers in Bill Aura.
  - 'Un-cleared Transactions': Counts transactions entered into Bill Aura that have not yet appeared on your bank statement (such as cheques deposited in transit).
  
  Below your bank accounts, notice the **Cash in Hand** card, which tracks your office petty cash box. Let us now record an inter-account fund transfer."

---

### Section 3: Inter-Account Contra Transfers (`/bank-transactions`) (03:00 – 06:15)
- **On-Screen**: Click 'Transfer Funds' button at the top of `/banking`. Modal opens.
- **Cursor Action**: Step-by-step entry:
  1. Transfer Type: `Bank to Cash (Cash Withdrawal)`.
  2. From Account: `HDFC Bank Current Account`.
  3. To Account: `Petty Cash Register`.
  4. Amount: `₹ 25,000.00`.
  5. Date: Today.
  6. Reference / Cheque #: `CHQ-440192`.
  7. Description: `Self cash withdrawal for weekly office petty expenses`.
- **Narration**:
  "In accounting terminology, a **Contra Entry** represents the movement of money between two cash or bank accounts belonging to the same entity—meaning total business wealth is neither increased nor decreased.
  
  Click the 'Transfer Funds' button.
  
  In the 'From Account' dropdown, select 'HDFC Bank Current Account'. 
  Notice its current book balance displays right below the field.
  
  In the 'To Account' dropdown, select 'Petty Cash Register'.
  
  In the 'Amount' field, enter '₹ 25,000.00'.
  
  Enter the cheque or ATM reference number: 'CHQ-440192', and add a clear description: 'Self cash withdrawal for weekly office petty expenses'.
  
  Click 'Execute Transfer'. 
  
  Watch both account cards on the dashboard update immediately:
  - HDFC Bank balance has decreased by exactly ₹ 25,000.00.
  - Petty Cash balance has increased by exactly ₹ 25,000.00.
  
  A double-entry Contra voucher has been posted automatically, debiting Cash and crediting Bank."

---

### Section 4: Bank Deposits & Miscellaneous Transactions (06:15 – 08:30)
- **On-Screen**: Click 'Add Transaction' > 'Direct Deposit / Other Income'.
- **Narration**:
  "What about bank transactions that are not direct customer invoice receipts—such as bank interest credited, loan disbursements, or scrap sales?
  
  Click 'Add Transaction' and select 'Direct Deposit'.
  Select the destination account (e.g., HDFC Bank), enter the received amount (say ₹ 1,250.00), and in the 'Category / Ledger' dropdown, select 'Bank Interest Income'.
  
  Bill Aura debits your bank ledger and credits your Other Income account without requiring an invoice. 
  
  Similarly, for bank service charges, merchant UPI gateway fees, or loan interest deductions, select 'Direct Withdrawal', enter the amount, and link the appropriate 'Bank Charges Expense' ledger account."

---

### Section 5: Transaction Register & Search (08:30 – 10:30)
- **On-Screen**: Navigate to `/bank-transactions`. Show full transactions register with search, date filters, and export.
- **Narration**:
  "Navigate to 'Bank Transactions' on the sidebar.
  
  Here you have a consolidated register of all inflows and outflows across all accounts. You can filter by specific account, search by reference or UTR number, and verify transaction statuses.
  
  In Chapter 20, we will learn how to match these transactions against bank statements in the Reconciliation Center."
