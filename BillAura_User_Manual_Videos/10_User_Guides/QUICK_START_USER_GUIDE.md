# Bill Aura ERP — Quick Start Operational User Guide

## Welcome to Bill Aura
This quick-start operational handbook is designed to onboard new employees, billing operators, and accountants within thirty minutes.

---

## 1. Daily Login & Workspace Orientation
1. Navigate to your Bill Aura instance URL (e.g. `https://billaura.webziointernational.in` or local dev `http://localhost:5173`).
2. Enter your authorized business email and password.
3. Upon login, your active **Company** and **Branch** are displayed in the top header.
4. If you belong to multiple entities, verify you are in the correct company before keying in data by checking the organization switcher in the header.

---

## 2. Five Everyday Keyboard Shortcuts
| Shortcut | Action | Where it works |
|---|---|---|
| `Ctrl + /` (or `Cmd + /`) | Open Command Palette | Everywhere |
| `Alt + N` | Create New Record in current module | List views |
| `Esc` | Close active modal / flyout | Modals and drawers |
| `Ctrl + Enter` | Submit / Save active form | Forms |
| `Ctrl + P` | Open Printable Voucher View | Invoice / Receipt Details |

---

## 3. Creating a Customer in 60 Seconds
1. Click the gold **`+` (Quick Create)** button in the top header.
2. Select **Customer**.
3. Choose **Business** (B2B) or **Individual** (B2C).
4. Enter Customer Name (e.g., `Apex Solutions LLP`).
5. Enter their 15-digit **GSTIN**. Bill Aura automatically verifies the state code and fills the State.
6. Enter Billing Address and PIN Code.
7. Click **Save Customer**.

---

## 4. Issuing a Tax Invoice in 4 Steps
1. Click **`+` (Quick Create) > Invoice** (or navigate to `Sales > Invoices > + New Invoice`).
2. Select your customer from the dropdown. Verify Place of Supply.
3. In the line items table:
   - Select the product or service.
   - Enter Quantity and verify Rate.
   - Verify HSN code and GST tax slab (e.g. 18%).
4. Review the auto round-off and click **Save and Issue**.
5. Click **Print / PDF** to download or email the invoice with the embedded UPI payment QR code.

---

## 5. Recording Customer Payment (Receipt)
1. Go to `Sales > Invoices` and locate the unpaid invoice.
2. Click **Record Payment** (or `Sales > Payments Received > + New Payment Received`).
3. Select your deposit bank account (e.g. `HDFC Bank Current Account`).
4. Enter the amount received and bank UTR reference number.
5. Click **Auto-Allocate** to match against open invoices.
6. Click **Save and Record Payment**. The invoice automatically turns green (**PAID**).

---

## 6. Entering a Vendor Bill & Claiming GST Credit
1. Click **`+` (Quick Create) > Bill** (or `Purchases > Bills > + New Bill`).
2. Select the vendor and enter their paper invoice number in **Vendor Invoice Ref**.
3. Verify **ITC Eligibility** is set to `Eligible for ITC`.
4. Add the purchased materials or expense lines.
5. Click **Save Bill**. The purchase increases your inventory and books your Input Tax Credit asset!

---

## 7. Checking Your Daily Profit & Cash Position
1. Return to the **Dashboard** (`/dashboard`).
2. Review **Receivables** (money owed to you) and **Payables** (money you owe).
3. Check **Cash & Bank Balances** for available liquidity.
4. For detailed analytical statements, go to **Reports (`/reports`)** and open **Profit and Loss** or **Balance Sheet**.
