# Bill Aura ERP Video Script — Chapter 01: Workspace Layout, Global Header & Navigation

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 1: Workspace Layout, Top Header & Lightning Navigation
- **Module ID**: `MOD-01-NAV`
- **Estimated Runtime**: 07:45
- **Prerequisites**: User credentials with active login session.
- **Target Audience**: Business owners, accountants, billing managers, system operators.

---

## Instructional Sequence

### Section 1: Introduction (00:00 – 01:15)
- **On-Screen**: Browser at Full HD (1920x1080) showing the Bill Aura Workspace Shell (`/dashboard`).
- **Camera Action**: Smooth pan over the top dark navy header, the multi-document tab bar, and the left collapsible navigation rail.
- **Narration**:
  "Welcome to Bill Aura, the comprehensive multi-tenant ERP and Billing SaaS platform designed specifically for modern growing businesses. In this inaugural training session, you will learn how to navigate the Bill Aura workspace with maximum speed and productivity. 
  
  Unlike conventional single-window accounting applications that force you to constantly close your work to check another figure, Bill Aura features a multi-document workspace tab engine, a high-productivity global header with instant search, and a responsive collapsible sidebar modeled after world-class enterprise software. Let us examine the layout and controls you will interact with every day."

---

### Section 2: Explaining the Top Application Header (01:15 – 03:00)
- **On-Screen**: Zoom in (120%) to the Dark Navy Header Bar (`AppHeader.tsx`).
- **Cursor Action**: Cursor hovers over the Search Scope selector, then the Search Input, then moves to the Quick Create (`+`) button.
- **Narration**:
  "At the very top of your screen is the Global Header. On the left is the Bill Aura emblem. Clicking this emblem from any module will instantly return you to your Executive Dashboard.
  
  Next, look at the central Search Bar. Notice this dropdown currently labeled 'All'. Clicking it reveals module filters: Invoices, Customers, Quotes, Sales Orders, Bills, Vendors, Items, and Banking. By selecting a specific module, your search queries are laser-focused on that record type. Typing a customer name, GSTIN, invoice number, or product SKU will immediately show relevant records without page reloads.
  
  Now look to the right side of the header. First is the gold Quick Create button marked with a plus sign. Clicking this button opens a structured menu divided into General, Sales, Purchases, and Accountant actions. Whether you are in the middle of reviewing a report or adjusting inventory, you can immediately initiate a New Invoice, New Customer, New Bill, or Manual Journal in a single click."

---

### Section 3: Recent History, Company Switcher & Notifications (03:00 – 04:30)
- **On-Screen**: Cursor moves to Recent History clock icon, then Company Switcher dropdown, then Notification bell.
- **Narration**:
  "Next to Quick Create is the Recent History clock icon. Clicking this displays the last ten transactions or records you inspected, allowing you to jump back to earlier work without searching.
  
  Beside it is the Organization and Branch Switcher. If your business operates multiple companies or geographical branches, this dropdown displays your currently active entity, your branch, and the active financial year. Switching entities here preserves your secure session while instantly isolating the selected company's database records.
  
  The Bell icon alerts you to important system events: invoices marked paid, low-stock warnings, approval requests, and statutory reminders. Unread alerts display a gold badge counter. Clicking any notification navigates directly to the underlying document."

--- Section 4: Multi-Document Workspace Tabs (04:30 – 05:45)
- **On-Screen**: Zoom in on `WorkspaceTabs.tsx` bar beneath the header. Click on 'Items' in the sidebar, then 'Invoices', showing tabs opening dynamically.
- **Narration**:
  "Directly beneath the header is one of Bill Aura's most powerful productivity features: the Workspace Tab Bar. 
  
  Watch as we click 'Items' on the sidebar. A new tab titled 'Items' opens. Now, let us open 'Customers'. A second tab appears. Next, we open 'Invoices'. Notice how all three tabs remain open simultaneously. 
  
  You can toggle between tabs effortlessly without losing your place, resetting your table filters, or discarding half-completed form entries. To close any open document, simply click the small 'X' on that tab. If you accidentally close a tab, your uncommitted changes remain preserved in local workspace memory."

---

### Section 5: The Zoho-Style Sidebar Rail & Menu (05:45 – 06:45)
- **On-Screen**: Left sidebar (`AppSidebar.tsx`). Click the collapse toggle button at the bottom of the sidebar.
- **Narration**:
  "On the left side is your primary navigation sidebar. It categorizes the entire ERP into ten core functional groups: Home, Items, Inventory, Sales, Purchases, Banking, Accountant, Reports, People & HR, and Documents.
  
  When you need maximum horizontal space for complex financial ledgers or large 20-column reports, click the double-chevron collapse button at the bottom of the sidebar. The menu collapses into a sleek icon rail. Hovering your cursor over any icon opens a floating flyout menu, giving you access to all sub-items without expanding the sidebar. Clicking the collapse button again expands the sidebar back to its full text view."

---

### Section 6: Recovery, Shortcuts & Summary (06:45 – 07:45)
- **On-Screen**: Press `Ctrl + /` to open the Command Palette (`CommandPalette.tsx`).
- **Callout Box**: `Keyboard Shortcut: Press Ctrl + / or Cmd + / to launch the Command Palette from anywhere.`
- **Narration**:
  "For power users who prefer the keyboard, press Control plus Slash (or Command plus Slash on macOS) at any time to open the Bill Aura Command Palette. Type any command—such as 'New Invoice', 'Open Balance Sheet', or 'Find Apex Solutions'—and press Enter to jump straight there.
  
  If you ever encounter an unexpected network disconnect, your workspace tabs and draft inputs are cached automatically. Simply refresh your browser, and Bill Aura will restore your exact workspace state.
  
  In Chapter 2, we will configure your organization settings, GSTIN profile, branches, and custom document numbering sequences."
