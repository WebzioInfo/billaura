export interface Company {
  id: string;
  companyName: string;
  legalName?: string;
  gstin?: string;
  pan?: string;
  email?: string;
  phone?: string;
  address?: string;
  state?: string;
  country?: string;
  currency: string;
  status: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  globalRole: string;
  isActive: boolean;
}

export interface Customer {
  id: string;
  companyId?: string;
  customerCode: string;
  name: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  customerType: string;
  tradeName?: string;
  outstandingAmount?: number;
  creditLimit?: number;
}

export interface Vendor {
  id: string;
  companyId?: string;
  vendorCode: string;
  name: string;
  gstin?: string;
  contactDetails?: string;
  payableBalance: number;
}

export interface Product {
  id: string;
  companyId?: string;
  sku?: string;
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  itemType?: string;
  taxRate?: number;
  taxType?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  customerId: string;
  date: string;
  grandTotal: number;
  amountPaid: number;
  status: string;
  customer?: Customer;
  items?: InvoiceItem[];
}

export interface InvoiceItem {
  id: string;
  productId: string;
  description?: string;
  qty: number;
  rate: number;
  taxAmount: number;
  total: number;
  product?: Product;
}

export interface Payment {
  id: string;
  paymentNo: string;
  customerId?: string;
  vendorId?: string;
  date: string;
  amount: number;
  method: string;
  reference?: string;
  customer?: Customer;
  vendor?: Vendor;
}

export interface BankAccount {
  id: string;
  name: string;
  currentBalance: number;
}

export interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  mobile?: string;
  email?: string;
  basicSalary: number;
  department?: Department;
  designation?: Designation;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
}

export interface Designation {
  id: string;
  name: string;
  description?: string;
}

export interface Attendance {
  id: string;
  date: string;
  status: string;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
  employee?: Employee;
}

export interface Lead {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  status: string;
  source: string;
  value?: number;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  designation?: string;
  customer?: Customer;
  vendor?: Vendor;
}

export interface CrmActivity {
  id: string;
  type: string;
  subject: string;
  description?: string;
  dueDate?: string;
  isCompleted: boolean;
  lead?: Lead;
  customer?: Customer;
}
