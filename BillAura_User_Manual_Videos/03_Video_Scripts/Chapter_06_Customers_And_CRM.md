# Bill Aura ERP Video Script — Chapter 06: Customers, CRM & Business Partner Management

## Metadata
- **Video Title**: Bill Aura ERP Mastery — Chapter 6: Customers, CRM Segments, GST Verification & Customer 360
- **Module ID**: `MOD-06-CRM-CUST`
- **Estimated Runtime**: 10:15
- **Prerequisites**: Company profile active.
- **Target Audience**: Sales managers, CRM executives, account managers, finance teams.

---

## Instructional Sequence

### Section 1: Introduction (00:00 – 01:20)
- **On-Screen**: Navigate to `/customers` via sidebar `Sales > Customers`.
- **Narration**:
  "Welcome back to Bill Aura ERP. Managing healthy customer relationships, enforcing credit terms, and maintaining pristine statutory tax profiles is the bedrock of every successful billing operation.
  
  In this chapter, you will learn how to onboard business (B2B) and individual (B2C) customers, validate Indian GSTIN numbers, configure billing and delivery addresses, establish credit limits and payment terms, manage customer segments and departments, and inspect the Customer 360 profile ledger."

---

### Section 2: Explaining the Customers Register (`/customers`) (01:20 – 02:40)
- **On-Screen**: Explain Customer directory layout: Search bar, Customer Type tabs (`All`, `B2B`, `B2C`), Columns: Customer Name, Company Name, Contact Details, Receivables Balance, Unused Credits, Status.
- **Narration**:
  "On the Customers screen, you see your full client roster. At the top, you can filter by Customer Type: view all clients, or filter exclusively for B2B Registered Businesses or B2C Consumers.
  
  Notice the 'Receivables Balance' column. This provides an instantaneous glance at what each client owes you. Beside it, 'Unused Credits' highlights customer advance payments or credit notes waiting to be offset. Clicking any customer row opens their complete 360-degree account profile."

---

### Section 3: Onboarding a New B2B Customer (`/customers/new`) (02:40 – 06:30)
- **On-Screen**: Click `+ New Customer`. Form loads at `/customers/new`.
- **Cursor Action**: 
  1. Select Customer Type: `Business`.
  2. Display Name: `Apex Solutions LLP`.
  3. Company Name: `Apex Solutions Limited Liability Partnership`.
  4. Primary Contact: `Mr. Rohan Verma`, Email: `rohan@apexsolutions.in`, Phone: `+91 98220 12345`.
  5. GST Treatment: `Registered Business - Regular`.
  6. GSTIN: `27AAACA9876E1Z5`. System detects State: `Maharashtra (27)`.
  7. Billing Address: `Unit 402, Cyber City, Magarpatta, Pune - 411028`.
  8. Click 'Copy to Shipping Address'.
  9. Payment Terms: `Net 30`. Credit Limit: `₹ 2,50,000`.
- **Narration**:
  "Click the gold '+ New Customer' button.
  
  **1. Basic Information**
  Select Customer Type as 'Business'. Enter the Display Name: 'Apex Solutions LLP'. This is the identifier used in searches and transaction dropdowns. In 'Company Name', input their full registered entity name.
  
  Enter the Primary Contact details: Salutation 'Mr.', First Name 'Rohan', Last Name 'Verma', official business email, and mobile phone number.
  
  **2. GST Treatment & Statutory Details**
  In the 'GST Treatment' dropdown, select 'Registered Business - Regular'. Notice the other options: 'Composition', 'Unregistered', 'Consumer', 'Overseas Export', and 'SEZ Developer'.
  
  Now, enter the 15-digit GSTIN: '27AAACA9876E1Z5'. 
  Observe what happens: Bill Aura instantly checks the structure, extracts the state code '27', and automatically assigns the Place of Supply to 'Maharashtra'. The 10-digit PAN 'AAACA9876E' is automatically extracted from characters 3 through 12.
  
  **3. Address Management**
  Under 'Billing Address', enter the registered office address: 'Unit 402, Cyber City, Magarpatta, Pune, Maharashtra - 411028'.
  If goods are shipped to the same facility, click the 'Copy billing address to shipping address' checkbox. If your client requires delivery to multiple warehouse locations or job sites, you can enter distinct shipping addresses.
  
  **4. Financial & Credit Terms**
  Set 'Currency' to INR.
  In 'Payment Terms', select 'Net 30'. When you issue an invoice to Apex Solutions on October 1st, Bill Aura will automatically set the payment due date to October 31st.
  In 'Credit Limit', set '₹ 2,50,000'. If total unpaid invoices exceed this ceiling, the system will flag an alert to prevent overextending credit.
  
  Click 'Save Customer'. The client is onboarded and active."

---

### Section 4: Customer Segments & Departments (06:30 – 07:45)
- **On-Screen**: Navigate to `/customer-segments` and `/customer-departments`.
- **Narration**:
  "Under Sales navigation, notice 'Customer Segments' and 'Customer Departments'.
  
  Segments let you classify clients into commercial tiers—such as 'Enterprise Tier', 'Wholesale Distributors', or 'Government Clients'. You can attach automatic volume discount percentages to segments.
  
  Departments allow large enterprise accounts to be broken down internally—for instance, billing specifically to Apex Solutions' 'IT Division' versus their 'Facility Management Department'—giving both you and your client segmented ledger clarity."

---

### Section 5: The Customer 360 Profile Ledger (`/customers/:id`) (07:45 – 09:15)
- **On-Screen**: Click on `Apex Solutions LLP` in the customer list. Profile view loads.
- **Narration**:
  "Clicking on Apex Solutions opens the Customer 360 Profile.
  
  Across the top banner, you see total sales revenue to date, total receivables outstanding, available credits, and average payment turnaround time.
  
  Below are tabbed registers:
  1. **Transactions Tab**: Lists every Quote, Sales Order, Invoice, and Payment Receipt linked to this customer.
  2. **Statement of Accounts**: A full running ledger showing historical debits, credits, and running balances with customizable date filters.
  3. **Address & Contacts Tab**: Displays multiple branch addresses and contact person phone directories.
  
  Notice the 'Actions' dropdown at the top right: with one click, you can create a New Invoice, Record Payment, Send Customer Statement via Email, or Download a PDF Statement."

---

### Section 6: Recovery & Summary (09:15 – 10:15)
- **On-Screen**: Show validation error if a duplicate GSTIN or missing mandatory address field is submitted.
- **Narration**:
  "Bill Aura prevents accidental duplicate client onboarding: if a teammate attempts to register a client with an existing active GSTIN, the system warns them immediately and displays the matching company record.
  
  In Chapter 7, we will create Quotations and learn how to convert estimates into confirmed sales."
