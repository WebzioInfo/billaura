# Bill Aura ERP Video Script — Chapter 08: Sales Orders, Delivery Challans & Dispatch

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 8: Sales Orders, Fulfillment, Delivery Challans & Dispatch Notes
- **Module ID**: `MOD-08-SO-CHALLAN`
- **Estimated Runtime**: 09:10
- **Prerequisites**: Customers, Items, and Quotations.
- **Target Audience**: Order fulfillment specialists, dispatch managers, logistics coordinators, sales operations.

---

## Instructional Sequence

### Section 1: Introduction (00:00 – 01:15)
- **On-Screen**: Navigate to `/sales-orders` via sidebar `Sales > Sales Orders`.
- **Narration**:
  "Welcome back to Bill Aura ERP. For manufacturing, wholesale, and distribution enterprises, there is frequently a time gap between receiving a customer purchase order and dispatching the physical goods.
  
  In this chapter, you will learn how to create and track confirmed Sales Orders, monitor order fulfillment statuses, generate statutory Delivery Challans and dispatch notes with transporter details, and seamlessly convert fulfilled orders into final tax invoices."

---

### Section 2: Sales Orders Management (`/sales-orders`) (01:15 – 03:00)
- **On-Screen**: View `/sales-orders`. Explain columns: Order #, Customer Name, Reference (Customer PO #), Order Date, Expected Shipment Date, Order Value, Fulfillment Status (`Unfulfilled`, `Partially Shipped`, `Fulfilled`).
- **Narration**:
  "The Sales Orders screen serves as your order commitment queue. 
  
  When a buyer issues an official purchase order, entering it here as a Sales Order allows production and inventory teams to reserve stock without prematurely booking accounting revenue.
  
  Notice the 'Fulfillment Status' indicators: they let your dispatch team know which orders are ready for packing and transport."

---

### Section 3: Creating a Sales Order (`/sales-orders/new`) (03:00 – 05:00)
- **On-Screen**: Click `+ New Sales Order`. Form loads.
- **Cursor Action**: Fill Customer: `Bharat Technologies`, Customer PO Ref: `BT-PO-9912`, Delivery Date: 7 days later, Line items: `50 PCS` of `Heavy Duty V-Belt B-52` @ `₹ 620.00`.
- **Narration**:
  "Click '+ New Sales Order'.
  
  Select our customer 'Bharat Technologies'. Notice their billing and shipping address appear.
  
  In the 'Customer PO Reference' field, input the client's official purchase order number, 'BT-PO-9912'. This will be referenced on all subsequent shipping documents and final invoices.
  
  In 'Expected Delivery Date', select next Monday.
  
  Under Line Items, add 'Heavy Duty V-Belt B-52' with a quantity of 50 pieces at ₹ 620.00. 
  
  Notice that Bharat Technologies is an out-of-state customer located in Gujarat (State Code 24). Bill Aura automatically identifies this as an Inter-state transaction and applies 18% Integrated GST (IGST) instead of CGST and SGST.
  
  Click 'Save and Confirm'. The Sales Order is locked into the production queue."

---

### Section 4: Generating Delivery Challans / Dispatch Notes (`/delivery-challans/new`) (05:00 – 07:30)
- **On-Screen**: Open the Sales Order. Click 'Create Delivery Challan' action button. Form loads at `/delivery-challans/new`.
- **Cursor Action**: Explain Transport Details: Transporter Name (`VRL Logistics`), LR / Consignment Note Number, Vehicle Number (`MH-12-AB-9876`), Mode of Transport (`Road`).
- **Narration**:
  "When the warehouse packs the goods for dispatch, Indian GST Rule 55 mandates a formal Delivery Challan to accompany the shipment during transportation, especially when movement precedes invoice finalization or for job-work transfers.
  
  Click 'Create Delivery Challan' directly from the Sales Order.
  
  The items, quantities, and customer details transfer automatically. Now scroll to the **Transportation & Dispatch** section:
  1. **Mode of Transport**: Select 'Road' (or Rail, Air, Ship).
  2. **Vehicle Number**: Enter the registered transport vehicle number, such as 'MH-12-AB-9876'.
  3. **Transporter Name**: Enter 'VRL Logistics'.
  4. **LR / Consignment Note Number**: Enter the carrier's receipt number.
  
  Click 'Save and Print Challan'. 
  A three-copy Delivery Challan (Original for Consignee, Duplicate for Transporter, Triplicate for Consignor) is generated with full statutory details ready for driver handover."

---

### Section 5: Order Fulfillment & Invoicing (07:30 – 09:10)
- **On-Screen**: Check Sales Order status. It now shows 'Fulfilled'. Click 'Convert to Invoice'.
- **Narration**:
  "Back on the Sales Order, the fulfillment status now indicates 'Fulfilled'.
  
  With goods safely dispatched, your accounts department simply clicks 'Create Invoice'. The system generates the final commercial Tax Invoice referencing both the Sales Order number and the Delivery Challan number for complete audit cross-referencing.
  
  In Chapter 9, we examine the central module of the platform: Sales Invoicing and Billing."
