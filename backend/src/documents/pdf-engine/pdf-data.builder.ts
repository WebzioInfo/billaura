import { PdfDocumentData } from './pdf-document.types';

export class PdfDataBuilder {
  static fromInvoiceModel(invoice: any, company: any): PdfDocumentData {
    const docType = invoice.invoiceType || 'TAX_INVOICE';
    const gstBreakup: any = invoice.gstBreakup || {};
    const logoSrc = company?.settings?.logoBase64 || company?.logo || null;

    const grandTotal = Number(invoice.grandTotal || 0);
    const amountPaid = Number(invoice.amountPaid || 0);
    const balanceDue = Math.max(0, grandTotal - amountPaid);

    return {
      company: {
        name: company?.companyName || 'Bill Aura ERP',
        address: company?.address || '',
        gstin: company?.gstin || '',
        pan: company?.pan || '',
        email: company?.email || '',
        phone: company?.phone || '',
        logoUrl: logoSrc || undefined,
        bankDetails: company?.settings?.invoiceSettings?.bankDetails || company?.bankDetails || undefined,
        terms: company?.settings?.invoiceSettings?.terms || company?.terms || undefined,
      },
      customer: {
        name: invoice.businessPartner?.name || 'Customer',
        address: invoice.billingAddress || invoice.businessPartner?.address || '',
        gstin: invoice.businessPartner?.gstin || invoice.businessPartner?.gstNumber || '',
        email: invoice.businessPartner?.email || '',
        phone: invoice.businessPartner?.phone || '',
      },
      document: {
        title: docType.replace(/_/g, ' '),
        documentNo: invoice.invoiceNo || '-',
        date: invoice.date ? new Date(invoice.date).toLocaleDateString('en-IN') : '-',
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : undefined,
        status: invoice.status || 'SENT',
        docType,
        placeOfSupply: invoice.placeOfSupply || undefined,
        paymentMode: gstBreakup.paymentMode || undefined,
        paymentReference: gstBreakup.paymentReference || undefined,
        watermark: invoice.status === 'DRAFT' ? 'DRAFT' : undefined,
      },
      items: (invoice.items || []).map((item: any, idx: number) => ({
        index: idx + 1,
        description: item.description || item.product?.name || 'Item',
        hsn: item.hsn || item.product?.hsnCode || undefined,
        qty: Number(item.qty || 0),
        rate: Number(item.rate || 0),
        taxPercent: Number(item.taxPercent || 0),
        taxAmount: Number(item.taxAmount || 0),
        total: Number(item.total || 0),
      })),
      totals: {
        subTotal: Number(invoice.subTotal || 0),
        taxTotal: Number(invoice.taxTotal || 0),
        cgstAmount: Number(invoice.cgstAmount || 0),
        sgstAmount: Number(invoice.sgstAmount || 0),
        igstAmount: Number(invoice.igstAmount || 0),
        cessAmount: Number(invoice.cessAmount || 0),
        grandTotal,
        amountPaid,
        balanceDue,
        currency: '₹',
      },
    };
  }

  static fromReceiptModel(receipt: any, company: any): PdfDocumentData {
    const logoSrc = company?.settings?.logoBase64 || company?.logo || null;
    const receiptAmount = Number(receipt.amount || 0);

    const items = (receipt.allocations || []).map((alloc: any, idx: number) => {
      const inv = alloc.invoice;
      const invNo = inv ? inv.invoiceNo : 'On Account';
      const invDate = inv && inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : '';
      const invTotal = inv ? Number(inv.grandTotal || 0) : 0;
      const invPaid = inv ? Number(inv.amountPaid || 0) : 0;
      const invBalance = Math.max(0, invTotal - invPaid);

      return {
        index: idx + 1,
        description: inv
          ? `Payment against Invoice #${invNo} (${invDate}) - Invoice Total: ₹${invTotal.toFixed(2)}, Balance Remaining: ₹${invBalance.toFixed(2)}`
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
    const paymentMethod = payment?.paymentMethod || 'BANK_TRANSFER';
    const paymentRef = payment?.referenceNo || payment?.transactionId || payment?.chequeNo || '-';

    return {
      company: {
        name: company?.companyName || 'Bill Aura ERP',
        address: company?.address || '',
        gstin: company?.gstin || '',
        pan: company?.pan || '',
        email: company?.email || '',
        phone: company?.phone || '',
        logoUrl: logoSrc || undefined,
        bankDetails: company?.settings?.invoiceSettings?.bankDetails || company?.bankDetails || undefined,
        terms: company?.settings?.invoiceSettings?.terms || company?.terms || undefined,
      },
      customer: {
        name: receipt.businessPartner?.name || 'Customer',
        address: receipt.businessPartner?.address || '',
        gstin: receipt.businessPartner?.gstin || receipt.businessPartner?.gstNumber || '',
        email: receipt.businessPartner?.email || '',
        phone: receipt.businessPartner?.phone || '',
      },
      document: {
        title: 'PAYMENT RECEIPT',
        documentNo: receipt.receiptNo || '-',
        date: receipt.date ? new Date(receipt.date).toLocaleDateString('en-IN') : '-',
        status: receipt.status || 'COMPLETED',
        docType: 'PAYMENT_RECEIPT',
        paymentMode: paymentMethod,
        paymentReference: paymentRef,
      },
      items: items.length > 0 ? items : [
        {
          index: 1,
          description: 'Payment Received on Account',
          hsn: '-',
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
        currency: '₹',
      },
    };
  }

  static fromStandardRequest(body: any, dbCompany: any): PdfDocumentData {
    const { company, customer, document, items, totals } = body;
    const logoSrc = dbCompany?.settings?.logoBase64 || dbCompany?.logo || company?.logo || null;

    const grandTotal = Number(totals?.grandTotal || 0);
    const amountPaid = Number(totals?.amountPaid || 0);
    const balanceDue = Number(totals?.balance || Math.max(0, grandTotal - amountPaid));

    return {
      company: {
        name: company?.name || dbCompany?.companyName || 'Bill Aura ERP',
        address: company?.address || dbCompany?.address || '',
        gstin: company?.gstin || dbCompany?.gstin || '',
        pan: company?.pan || dbCompany?.pan || '',
        email: company?.email || dbCompany?.email || '',
        phone: company?.phone || dbCompany?.phone || '',
        logoUrl: logoSrc || undefined,
        bankDetails: company?.bankDetails || dbCompany?.bankDetails || undefined,
        terms: company?.terms || dbCompany?.terms || undefined,
      },
      customer: {
        name: customer?.name || 'Customer',
        address: customer?.address || '',
        gstin: customer?.gstin || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
      },
      document: {
        title: document?.title || 'DOCUMENT',
        documentNo: document?.documentNo || '-',
        date: document?.date ? new Date(document.date).toLocaleDateString('en-IN') : '-',
        dueDate: document?.dueDate ? new Date(document.dueDate).toLocaleDateString('en-IN') : undefined,
        status: document?.status || 'SENT',
        reference: document?.reference || undefined,
      },
      items: (items || []).map((item: any, idx: number) => ({
        index: idx + 1,
        description: item.description || 'Item',
        hsn: item.hsn || undefined,
        qty: Number(item.qty || 0),
        rate: Number(item.rate || 0),
        taxPercent: Number(item.taxPercent || 0),
        taxAmount: Number(item.taxAmount || 0),
        total: Number(item.total || 0),
      })),
      totals: {
        subTotal: Number(totals?.subTotal || 0),
        taxTotal: Number(totals?.taxTotal || 0),
        cgstAmount: Number(totals?.cgstAmount || 0),
        sgstAmount: Number(totals?.sgstAmount || 0),
        igstAmount: Number(totals?.igstAmount || 0),
        grandTotal,
        amountPaid,
        balanceDue,
        currency: totals?.currency || '₹',
      },
    };
  }
}
