import { PdfDocumentData, PdfTaxBreakupItem, PdfLineItem } from './pdf-document.types';

export function numberToWordsIndian(num: number): string {
  if (isNaN(num) || num === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertTwoDigits = (n: number): string => {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  };

  const convertThreeDigits = (n: number): string => {
    let str = '';
    if (Math.floor(n / 100) > 0) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
    }
    const rem = n % 100;
    if (rem > 0) {
      str += convertTwoDigits(rem);
    }
    return str.trim();
  };

  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let result = '';

  const crore = Math.floor(integerPart / 10000000);
  let rem = integerPart % 10000000;
  const lakh = Math.floor(rem / 100000);
  rem = rem % 100000;
  const thousand = Math.floor(rem / 1000);
  rem = rem % 1000;

  if (crore > 0) result += convertTwoDigits(crore) + ' Crore ';
  if (lakh > 0) result += convertTwoDigits(lakh) + ' Lakh ';
  if (thousand > 0) result += convertTwoDigits(thousand) + ' Thousand ';
  if (rem > 0) result += convertThreeDigits(rem) + ' ';

  result = result.trim() + ' Rupees';

  if (decimalPart > 0) {
    result += ' and ' + convertTwoDigits(decimalPart) + ' Paise';
  }

  return result + ' Only';
}

function formatDateIndian(dateStr?: string | Date | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export class PdfDataBuilder {
  static fromInvoiceModel(invoice: any, company: any): PdfDocumentData {
    const docType = invoice.invoiceType || 'TAX_INVOICE';
    const gstBreakup: any = invoice.gstBreakup || {};
    const logoSrc = company?.settings?.logoBase64 || company?.logo || null;

    const grandTotal = Number(invoice.grandTotal || 0);
    const amountPaid = Number(invoice.amountPaid || 0);
    const balanceDue = Math.max(0, grandTotal - amountPaid);

    const cgstAmount = Number(invoice.cgstAmount || 0);
    const sgstAmount = Number(invoice.sgstAmount || 0);
    const igstAmount = Number(invoice.igstAmount || 0);
    const cessAmount = Number(invoice.cessAmount || 0);
    const sumGst = cgstAmount + sgstAmount + igstAmount + cessAmount;
    const taxTotal = Math.max(Number(invoice.taxTotal || 0), sumGst);

    // Default Bank Account resolution
    const bankAcct = (company?.bankAccounts && company.bankAccounts[0]) || null;
    const bankInfo = bankAcct
      ? {
          bankName: bankAcct.bankName || undefined,
          accountName: bankAcct.accountName || company?.companyName || undefined,
          accountNumber: bankAcct.accountNumber || undefined,
          ifsc: bankAcct.ifsc || undefined,
          upiId: bankAcct.upiId || undefined,
        }
      : undefined;

    const companyAddressParts = [
      company?.address,
      company?.state,
      company?.country,
      company?.pinCode,
    ].filter(Boolean);

    // Format Line Items
    const items: PdfLineItem[] = (invoice.items || []).map((item: any, idx: number) => {
      const qty = Number(item.qty || 0);
      const rate = Number(item.rate || 0);
      const taxAmount = Number(item.taxAmount || 0);
      const itemTotal = Number(item.total || 0);
      const taxPercent = Number(item.taxPercent || 0);
      const hsn = item.hsn || item.product?.hsnCode || item.product?.eInvoiceHsn || undefined;
      const unit = item.unit || item.product?.unit || 'NOS';

      return {
        index: idx + 1,
        description: item.description || item.product?.name || 'Item',
        hsn,
        qty,
        unit,
        rate,
        taxPercent,
        taxAmount,
        cgstAmount: Number(item.cgstAmount || 0),
        sgstAmount: Number(item.sgstAmount || 0),
        igstAmount: Number(item.igstAmount || 0),
        cessAmount: Number(item.cessAmount || 0),
        total: itemTotal,
      };
    });

    // Group Tax Breakup by HSN
    const hsnMap = new Map<string, PdfTaxBreakupItem>();
    for (const item of items) {
      const hsnKey = item.hsn || 'NON-GST';
      const taxable = item.qty * item.rate;
      const existing = hsnMap.get(hsnKey);

      const isInterstate = igstAmount > 0;
      const halfRate = item.taxPercent / 2;

      const itemCgst = item.cgstAmount || (!isInterstate ? (taxable * halfRate) / 100 : 0);
      const itemSgst = item.sgstAmount || (!isInterstate ? (taxable * halfRate) / 100 : 0);
      const itemIgst = item.igstAmount || (isInterstate ? (taxable * item.taxPercent) / 100 : 0);
      const itemCess = item.cessAmount || 0;

      if (!existing) {
        hsnMap.set(hsnKey, {
          hsn: hsnKey,
          taxableAmount: taxable,
          cgstRate: !isInterstate ? halfRate : 0,
          cgstAmount: itemCgst,
          sgstRate: !isInterstate ? halfRate : 0,
          sgstAmount: itemSgst,
          igstRate: isInterstate ? item.taxPercent : 0,
          igstAmount: itemIgst,
          cessAmount: itemCess,
          totalTax: itemCgst + itemSgst + itemIgst + itemCess,
        });
      } else {
        existing.taxableAmount += taxable;
        existing.cgstAmount += itemCgst;
        existing.sgstAmount += itemSgst;
        existing.igstAmount += itemIgst;
        existing.cessAmount += itemCess;
        existing.totalTax += itemCgst + itemSgst + itemIgst + itemCess;
      }
    }
    const taxBreakup = Array.from(hsnMap.values());

    return {
      company: {
        name: company?.companyName || company?.legalName || 'Bill Aura ERP',
        legalName: company?.legalName || undefined,
        address: companyAddressParts.join(', ') || company?.address || '',
        state: company?.state || undefined,
        gstin: company?.gstin || '',
        pan: company?.pan || '',
        email: company?.email || '',
        phone: company?.phone || '',
        logoUrl: logoSrc || undefined,
        bankDetails: company?.settings?.invoiceSettings?.bankDetails || company?.bankDetails || undefined,
        bankInfo,
        terms: gstBreakup.termsConditions || company?.settings?.invoiceSettings?.terms || company?.terms || undefined,
      },
      customer: {
        name: invoice.businessPartner?.name || invoice.businessPartner?.legalName || 'Customer',
        legalName: invoice.businessPartner?.legalName || undefined,
        address: invoice.billingAddress || invoice.businessPartner?.address || '',
        shippingAddress: invoice.shippingAddress || invoice.businessPartner?.shippingAddress || undefined,
        gstin: invoice.businessPartner?.gstin || invoice.businessPartner?.gstNumber || '',
        pan: invoice.businessPartner?.pan || undefined,
        state: invoice.customerStateCode || invoice.businessPartner?.state || undefined,
        email: invoice.businessPartner?.email || '',
        phone: invoice.businessPartner?.phone || '',
      },
      document: {
        title: docType === 'BILL_OF_SUPPLY' ? 'BILL OF SUPPLY' : 'TAX INVOICE',
        documentNo: invoice.invoiceNo || '-',
        date: formatDateIndian(invoice.date),
        dueDate: invoice.dueDate ? formatDateIndian(invoice.dueDate) : undefined,
        status: invoice.status || 'SENT',
        docType,
        placeOfSupply: invoice.placeOfSupply || undefined,
        reverseCharge: invoice.isRcm || false,
        paymentMode: gstBreakup.paymentMode || undefined,
        paymentReference: gstBreakup.paymentReference || undefined,
        watermark: invoice.status === 'DRAFT' ? 'DRAFT' : invoice.status === 'CANCELLED' ? 'CANCELLED' : undefined,
        notes: gstBreakup.notes || undefined,
        terms: gstBreakup.termsConditions || undefined,
      },
      items,
      totals: {
        subTotal: Number(invoice.subTotal || 0),
        taxTotal,
        cgstAmount: cgstAmount > 0 ? cgstAmount : undefined,
        sgstAmount: sgstAmount > 0 ? sgstAmount : undefined,
        igstAmount: igstAmount > 0 ? igstAmount : undefined,
        cessAmount: cessAmount > 0 ? cessAmount : undefined,
        grandTotal,
        amountPaid,
        balanceDue,
        amountInWords: numberToWordsIndian(grandTotal),
        currency: '₹',
      },
      taxBreakup: taxBreakup.length > 0 && taxTotal > 0 ? taxBreakup : undefined,
    };
  }

  static fromReceiptModel(receipt: any, company: any): PdfDocumentData {
    const logoSrc = company?.settings?.logoBase64 || company?.logo || null;
    const receiptAmount = Number(receipt.amount || 0);

    const items = (receipt.allocations || []).map((alloc: any, idx: number) => {
      const inv = alloc.invoice;
      const invNo = inv ? inv.invoiceNo : 'On Account';
      const invDate = inv && inv.date ? formatDateIndian(inv.date) : '';
      const invTotal = inv ? Number(inv.grandTotal || 0) : 0;
      const invPaid = inv ? Number(inv.amountPaid || 0) : 0;
      const invBalance = Math.max(0, invTotal - invPaid);

      return {
        index: idx + 1,
        description: inv
          ? `Payment against Invoice #${invNo} (${invDate}) - Total: ₹${invTotal.toFixed(2)}, Balance: ₹${invBalance.toFixed(2)}`
          : 'Payment Received on Account',
        hsn: invNo,
        qty: 1,
        rate: Number(alloc.amount || 0),
        taxPercent: 0,
        taxAmount: 0,
        total: Number(alloc.amount || 0),
      };
    });

    const payment = (receipt.payments || [])[0];
    const paymentMethod = payment?.paymentMethod || receipt.paymentMethod || 'BANK_TRANSFER';
    const paymentRef = payment?.referenceNo || receipt.referenceNo || '-';

    return {
      company: {
        name: company?.companyName || company?.legalName || 'Bill Aura ERP',
        address: company?.address || '',
        gstin: company?.gstin || '',
        pan: company?.pan || '',
        email: company?.email || '',
        phone: company?.phone || '',
        logoUrl: logoSrc || undefined,
        bankDetails: company?.settings?.invoiceSettings?.bankDetails || company?.bankDetails || undefined,
      },
      customer: {
        name: receipt.businessPartner?.name || 'Customer',
        address: receipt.businessPartner?.address || '',
        gstin: receipt.businessPartner?.gstin || '',
        email: receipt.businessPartner?.email || '',
        phone: receipt.businessPartner?.phone || '',
      },
      document: {
        title: 'PAYMENT RECEIPT',
        documentNo: receipt.receiptNo || '-',
        date: formatDateIndian(receipt.date),
        status: 'PAID',
        docType: 'PAYMENT_RECEIPT',
        paymentMode: paymentMethod,
        paymentReference: paymentRef,
      },
      items: items.length > 0 ? items : [
        {
          index: 1,
          description: 'Payment Received',
          qty: 1,
          rate: receiptAmount,
          taxPercent: 0,
          taxAmount: 0,
          total: receiptAmount,
        }
      ],
      totals: {
        subTotal: receiptAmount,
        taxTotal: 0,
        grandTotal: receiptAmount,
        amountPaid: receiptAmount,
        balanceDue: 0,
        amountInWords: numberToWordsIndian(receiptAmount),
        currency: '₹',
      },
    };
  }
}
