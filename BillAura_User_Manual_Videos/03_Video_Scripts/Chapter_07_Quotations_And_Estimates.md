# Bill Aura ERP Video Script — Chapter 07: Quotations, Estimates & Conversion

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 7: Quotations, Estimates, Pricing Calculations & 1-Click Conversion
- **Module ID**: `MOD-07-QUOTES`
- **Estimated Runtime**: 09:40
- **Prerequisites**: Customers and Items configured.
- **Target Audience**: Sales executives, estimators, billing specialists, business developers.

---

## Instructional Sequence

### Section 1: Introduction (00:00 – 01:15)
- **On-Screen**: Navigate to `/quotations` via sidebar `Sales > Quotes`.
- **Narration**:
  "Welcome back to Bill Aura ERP. Before a commercial sale is finalized, customers require formal pricing proposals, terms of delivery, and estimated tax breakdowns.
  
  In this chapter, you will learn how to create professional sales quotations, configure line item discounts and GST taxes, generate branded PDF proposals, manage the quote approval lifecycle, and execute 1-click conversion into confirmed Sales Orders and Tax Invoices."

---

### Section 2: Explaining the Quotations List (`/quotations`) (01:15 – 02:30)
- **On-Screen**: View `/quotations`. Explain columns: Quote Number, Customer Name, Quote Date, Expiry Date, Amount, Status (`Draft`, `Sent`, `Accepted`, `Declined`, `Invoiced`).
- **Narration**:
  "The Quotations register provides full visibility over your sales pipeline. 
  
  Notice the status badges:
  - 'Draft': Proposal being prepared internally.
  - 'Sent': Quote emailed to the client.
  - 'Accepted': Client confirmed agreement.
  - 'Invoiced': Quote successfully converted into an active sales invoice.
  
  Let us now create a formal quotation for our client, Apex Solutions."

---

### Section 3: Drafting a New Quotation (`/quotations/new`) (02:30 – 06:15)
- **On-Screen**: Click `+ New Quote`. Form loads at `/quotations/new`.
- **Cursor Action**:
  1. Customer: Select `Apex Solutions LLP`.
  2. Quote #: `QT-2026-0001` (auto-generated).
  3. Quote Date: Today.
  4. Expiry Date: Set to 15 days from today.
  5. Line Item 1: `Precision Ball Bearing 6204`, Qty: `20`, Rate: `₹ 450.00`, Discount: `5%`.
  6. Line Item 2: `Annual Machine Maintenance`, Qty: `4 HRS`, Rate: `₹ 2,500.00`.
- **Narration**:
  "Click '+ New Quote'.
  
  In the Customer selector, type 'Apex' and select 'Apex Solutions LLP'. Notice that their billing address, GSTIN, and default payment terms populate automatically.
  
  The Quote Number defaults to 'QT-2026-0001'. In 'Expiry Date', choose a validity cutoff—for example, fifteen days from today. This protects your margins against material price fluctuations.
  
  **Adding Line Items**
  Now, look at the line item grid:
  In the first row, select our product 'Precision Ball Bearing 6204'. 
  Set Quantity to '20' PCS. The standard rate of ₹ 450.00 populates automatically.
  In the 'Discount' column, let us apply a 5% customer discount. Notice that the taxable amount recalculates immediately to ₹ 8,550.00.
  
  Click '+ Add Line Item' to add our service offering:
  Select 'Annual Machine Maintenance'. Set Quantity to '4' Hours at ₹ 2,500.00 per hour.
  
  **Tax & Total Summary Calculation**
  Scroll to the summary pane on the right:
  Subtotal: ₹ 18,550.00.
  Notice the GST Tax Breakdown: because Apex Solutions is in Maharashtra and our company is registered in Maharashtra, Bill Aura applies Intra-state taxation:
  - 9% CGST: ₹ 1,669.50
  - 9% SGST: ₹ 1,669.50
  Total Quotation Value: ₹ 21,889.00.
  
  Under 'Terms & Conditions', standard payment and warranty clauses appear automatically from your master settings.
  
  Click 'Save as Draft' or 'Save and Send'."

---

### Section 4: Quote Detail View & PDF Preview (`/quotations/:id`) (06:15 – 07:45)
- **On-Screen**: Detail view loads. Cursor clicks 'View PDF'.
- **Narration**:
  "On the Quotation Details page, click 'View PDF'. 
  
  A clean, branded PDF document appears displaying your corporate logo, full company contact details, the customer's billing address, GSTIN numbers, itemized tables with HSN/SAC codes, and authorized signature lines.
  
  You can click 'Download PDF' to save the file locally or click 'Email' to dispatch the quotation directly to the client's inbox with a single click."

---

### Section 5: 1-Click Conversion to Sales Order or Invoice (07:45 – 09:40)
- **On-Screen**: Click 'Convert' dropdown at top right. Select 'Convert to Invoice'.
- **Cursor Action**: System redirects seamlessly to `/invoices/new` with all customer data, line items, discounts, and tax rates prefilled.
- **Narration**:
  "Once your client accepts the quotation, you do not need to re-type a single character.
  
  Click the 'Convert' action menu at the top right. You can choose:
  - 'Convert to Sales Order': if you manage production or staged delivery.
  - 'Convert to Invoice': for immediate billing.
  
  Click 'Convert to Invoice'. Notice what just happened: Bill Aura automatically opened the Tax Invoice creation form with Apex Solutions selected, both line items transferred with exact quantities, rates, and discounts intact, and taxes fully calculated.
  
  The original quotation status is updated to 'Invoiced', ensuring complete sales pipeline traceability.
  
  In Chapter 8, we will explore Sales Orders and Delivery Challans."
