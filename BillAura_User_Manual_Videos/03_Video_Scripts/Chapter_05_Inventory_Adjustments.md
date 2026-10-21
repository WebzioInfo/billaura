# Bill Aura ERP Video Script — Chapter 05: Inventory Operations & Stock Adjustments

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 5: Inventory Adjustments, Stock Valuation & Reason Codes
- **Module ID**: `MOD-05-INV-ADJ`
- **Estimated Runtime**: 08:45
- **Prerequisites**: Items configured with inventory tracking enabled.
- **Target Audience**: Warehouse supervisors, storekeepers, inventory controllers, cost accountants.

---

## Instructional Sequence

### Section 1: Introduction & Real-World Use Cases (00:00 – 01:30)
- **On-Screen**: Navigate to `/inventory` via sidebar `Inventory > Inventory Adjustments`.
- **Narration**:
  "Welcome back to Bill Aura ERP. In real-world business operations, warehouse stock counts frequently diverge from recorded computer balances due to shipping damage, routine breakage, annual physical stocktake reconciliations, theft, or vendor packing discrepancies.
  
  In this session, you will learn how to use the Inventory Adjustments module in Bill Aura to execute quantity and value adjustments, apply standard statutory reason codes, offset stock variance into the correct General Ledger adjustment account, and review complete stock movement audit trails."

---

### Section 2: Explaining the Adjustments Register (`/inventory`) (01:30 – 02:45)
- **On-Screen**: View `/inventory`. Explain table headers: Adjustment Number, Date, Reason, Adjusted Items, Net Quantity, Net Value, Status.
- **Narration**:
  "The Inventory Adjustments list maintains an immutable audit log of every stock alteration made outside of regular sales invoices or purchase bills.
  
  Notice the columns: Adjustment Number, Adjustment Date, Reason Code, Total Value Impact, and Adjusted By. You can search by reference number or filter by reason. Let us now record a stock adjustment."

---

### Section 3: Creating a Quantity Stock Adjustment (`/inventory/adjustments/new`) (02:45 – 06:15)
- **On-Screen**: Click `+ New Adjustment`. Form loads.
- **Cursor Action**: Follow the exact form sequence:
  1. Mode: Quantity Adjustment
  2. Reference #: auto-filled `ADJ-2026-0001`
  3. Date: Today
  4. Account: `Stock Adjustment Expense`
  5. Reason: `Damaged Goods`
  6. Line items: Select `BEAR-6204`, current stock shows `250`, enter new quantity `245` (or adjustment `-5`).
- **Narration**:
  "Click the gold '+ New Adjustment' button.
  
  At the top, select the **Adjustment Mode**: 'Quantity Adjustment' or 'Value Adjustment'. We select 'Quantity Adjustment'.
  
  The Reference Number defaults to 'ADJ-2026-0001'. The Adjustment Date defaults to today's date.
  
  Next is a critical accounting field: the **Adjustment Account**. When you decrease or increase inventory, double-entry bookkeeping requires an offsetting ledger entry. We select 'Stock Adjustment Expense' (or 'Inventory Shrinkage Loss').
  
  Under **Reason**, click the dropdown. Bill Aura provides standard operational reasons:
  - 'Stock on hand check' (for routine physical audits)
  - 'Damaged goods'
  - 'Inventory revaluation'
  - 'Stock write-off'
  - 'Theft / Shrinkage'
  We select 'Damaged goods'.
  
  Now look at the Item Selection grid below. In the Item search box, type 'Bearing' and select our 'Precision Ball Bearing 6204'. Notice what Bill Aura does immediately: it displays the current computer stock on hand: '250 PCS', along with its unit cost of ₹ 280.00.
  
  In the 'New Quantity' column, type '245' (or enter '-5' in the Adjusted Quantity column). 
  
  Notice the calculation summary at the bottom: 
  Quantity Adjusted: -5 PCS. 
  Total Inventory Value Reduced: -₹ 1,400.00.
  
  In the Description field, enter audit notes: '5 pieces damaged during forklift transit in Warehouse Bay 3'. 
  
  Click the 'Save Adjustment' button. The adjustment is processed and posted."

---

### Section 4: Verifying the Outcome & Downstream Effects (06:15 – 07:30)
- **On-Screen**: Navigate back to `/products`. Inspect `Precision Ball Bearing 6204`.
- **Narration**:
  "Let us verify the exact downstream effects of this action:
  
  1. Open your Items list (`/products`). Notice the stock for 'Precision Ball Bearing 6204' has immediately updated from 250 PCS to exactly 245 PCS.
  2. Next, check your Balance Sheet under Current Assets. The Merchandise Inventory value has reduced by exactly ₹ 1,400.00.
  3. Finally, in your Profit & Loss statement under Operating Expenses, the 'Stock Adjustment Expense' account shows a debit of ₹ 1,400.00. 
  
  The double-entry books remain perfectly balanced with zero manual journal bookkeeping required."

---

### Section 5: Value Adjustments & Recovery (07:30 – 08:45)
- **On-Screen**: Briefly show 'Value Adjustment' mode for revaluing inventory without changing physical counts.
- **Narration**:
  "What if the physical count is correct, but the inventory value has depreciated or been revalued? 
  
  In that situation, choose 'Value Adjustment' mode. Here, the quantity remains unchanged, while you input the revised total valuation. Bill Aura updates your inventory asset value and books the difference to your Revaluation Reserve or Inventory Loss account.
  
  **Important Rule**: Once an adjustment is saved and posted to financial ledgers, it cannot be arbitrarily edited to prevent audit tampering. If you made an error, simply post a compensating adjustment with the reverse quantity and reference the original adjustment number in the notes.
  
  In Chapter 6, we will master the CRM and Customers module."
