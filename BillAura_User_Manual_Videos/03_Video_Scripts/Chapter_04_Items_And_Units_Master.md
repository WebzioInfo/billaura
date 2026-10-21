# Bill Aura ERP Video Script — Chapter 04: Items, Services & Units of Measure Master

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 4: Items, Services, Categories, Units & HSN Configuration
- **Module ID**: `MOD-04-ITEMS`
- **Estimated Runtime**: 11:20
- **Prerequisites**: Company profile configured with GSTIN.
- **Target Audience**: Store managers, sales teams, procurement officers, accountants.

---

## Instructional Sequence

### Section 1: Introduction & Business Role (00:00 – 01:25)
- **On-Screen**: Navigate to `/products` via sidebar menu under `Items > Items`.
- **Narration**:
  "Welcome back to Bill Aura ERP. Every sales invoice, purchase order, quote, and inventory movement depends directly upon a well-structured item master catalog. 
  
  In Bill Aura, the Items module manages both physical inventory products (Goods) and professional consulting or labor offerings (Services). In this session, you will learn how to configure units of measure, establish product categories, configure HSN and SAC tax codes, define selling and purchase prices, and set up stock tracking with opening balances."

---

### Section 2: Units of Measure Master (`/units`) (01:25 – 03:00)
- **On-Screen**: Navigate to `/units` via sidebar (`Items > Units`). Click `+ Add Unit`.
- **Cursor Action**: Modal opens. Fill Unit Name: `Pieces`, Unit Code: `PCS`, UQC Code: `PCS-PIECES`, Decimal Places: `0`.
- **Narration**:
  "Before creating products, you must establish the units of measure your business trades in. Click 'Items' on the sidebar and select 'Units'.
  
  Here you see standard units such as Kilograms, Liters, Boxes, and Meters. Click '+ Add Unit'. 
  
  In the modal, enter the Unit Name, such as 'Pieces', and the Unit Code 'PCS'. Next is the UQC (Unique Quantity Code) dropdown. This is the standardized statutory unit code mandated by the GST portal for electronic e-Invoicing and e-Way bills. Select 'PCS-PIECES'.
  
  Set the Decimal Places. For discrete items like computers, motors, or shirts, set decimals to zero. For measured goods like steel rods in kilograms or fabrics in meters, set decimals to two or three places. Click 'Save Unit'. The unit is now active and ready for item assignment."

---

### Section 3: Categories & Brands (`/categories`, `/brands`) (03:00 – 04:15)
- **On-Screen**: Navigate to `/categories`. Click `+ Add Category`.
- **Narration**:
  "Next, review Categories. Categories allow you to group related items—such as 'Industrial Hardware', 'Packaging Material', or 'Electronics'—for segmented sales reporting and inventory valuation. 
  
  Click 'Add Category', enter the category title, assign a parent category if creating sub-categories, and save. Similarly, under the 'Brands' submenu, you can register manufacturer brand names to filter items across large enterprise inventories."

---

### Section 4: Creating a New Inventory Product (`/products/new`) (04:15 – 08:30)
- **On-Screen**: Navigate to `/products`. Click gold `+ New Item` button. Form loads at `/products/new`.
- **Cursor Action**: Detailed step-by-step entry across Basic Info, Tax Info, Sales Info, Purchase Info, and Inventory Tracking.
- **Narration**:
  "Now let us create a new physical product. Navigate to '/products' and click '+ New Item'. The product creation screen loads.
  
  **Step 1: Item Type & Name**
  Notice the toggle at the top: 'Goods' versus 'Service'. Select 'Goods'. 
  In the 'Item Name' field, type 'Precision Ball Bearing 6204'. 
  In the 'SKU' field, enter your unique internal inventory code, 'BEAR-6204'. If left blank, Bill Aura can auto-generate an SKU.
  In the 'Unit' dropdown, select the 'PCS' unit we created earlier.
  Assign Category to 'Industrial Hardware' and Brand to 'SKF'.
  
  **Step 2: HSN / SAC Code & Tax Slab**
  Under Indian GST law, all physical goods require an HSN (Harmonized System of Nomenclature) code. Enter '8482', which is the official HSN classification for ball and roller bearings.
  In the 'Tax Slab' dropdown, select '18% GST'. When you bill this item, Bill Aura will automatically calculate 9% CGST and 9% SGST for local buyers, or 18% IGST for out-of-state buyers.
  
  **Step 3: Sales & Purchase Pricing**
  Under 'Sales Information', enter the standard Selling Price: '₹ 450.00'. In the 'Sales Account' dropdown, leave the default mapped to 'Sales Revenue'.
  Under 'Purchase Information', enter your expected Cost Price: '₹ 280.00'. The 'Cost of Goods Sold' account is automatically linked.
  
  **Step 4: Inventory Tracking & Opening Balances**
  Enable the 'Track Inventory for this item' toggle switch.
  Set the 'Inventory Asset Account' to 'Merchandise Inventory'.
  In the 'Opening Stock' field, enter your starting quantity on hand, say '250' pieces.
  In the 'Opening Stock Rate' field, enter '₹ 280.00'. Notice that Bill Aura immediately calculates the total opening inventory valuation: ₹ 70,000.00. This amount will balance your opening balance sheet under Current Assets.
  Set the 'Reorder Point' to '50'. When warehouse stock dips below 50 pieces, your dashboard will flag a replenishment alert.
  
  Click the gold 'Save Item' button at the bottom. The item is saved, validated, and listed in your Items catalog."

---

### Section 5: Services & Non-Stock Items (08:30 – 09:45)
- **On-Screen**: Click `+ New Item` again. Switch toggle to `Service`.
- **Cursor Action**: Fill Item Name: `Annual Machine Maintenance`, SAC Code: `9987`, Unit: `HRS`, Rate: `₹ 2,500.00`.
- **Narration**:
  "Now observe how to register a Service offering. 
  
  Click '+ New Item' and switch the Item Type toggle to 'Service'. Notice what happened: the 'Inventory Tracking', 'Opening Stock', and 'Warehouse' fields disappeared instantly. Services cannot be held in physical stock or counted during warehouse audits.
  
  Enter the Service Name 'Annual Machine Maintenance'. For services, the statutory code is called SAC (Services Accounting Code). Enter '9987'. Select Unit as 'Hours' (HRS) or 'Days' (DAY). Enter the billing rate of ₹ 2,500 per hour and select 18% GST. Click 'Save Item'. 
  
  Now you have both inventory goods and billable services ready in your master database."

---

### Section 6: Table Controls, Search & Recovery (09:45 – 11:20)
- **On-Screen**: Back on `/products`. Demonstrate search, category filter, column sorting, and three-dot row action menu.
- **Narration**:
  "Back on the Items list, observe the search bar. Typing 'Bearing' filters the list in real-time. Use the tabs at the top to toggle between 'All', 'Goods', and 'Services'.
  
  Look at the three-dots action menu on the right of any item row. Clicking it gives you:
  - 'Edit': to update prices or tax rates.
  - 'View Details': to inspect stock movement history.
  - 'Adjust Stock': a shortcut to create an inventory adjustment.
  - 'Mark as Inactive': if an item is discontinued, deactivating it prevents sales reps from accidentally billing it while preserving all historical financial records.
  
  In Chapter 5, we will explore physical stock operations and how to execute Inventory Adjustments."
