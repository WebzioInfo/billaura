import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, Download, Share2, ArrowLeft } from 'lucide-react';
import { InvoiceTemplate, InvoiceTemplateData } from './components/print/InvoiceTemplate';
import apiClient from '@/core/api';

export const InvoicePrintView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceTemplateData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await apiClient.get(`/sales/invoices/${id}`);
        const data = res.data?.data || res.data;

        // Transform backend data to InvoiceTemplateData
        const isIgst = data.items?.some((i: any) => i.igstAmount > 0) || false;

        const templateData: InvoiceTemplateData = {
          company: {
            name: data.company?.name || 'Your Company',
            address: data.company?.address || '123 Business St',
            gstin: data.company?.gstin || '',
            phone: data.company?.phone || '',
            email: data.company?.email || '',
            logo: data.company?.logo,
          },
          invoice: {
            invoiceNumber: data.invoiceNumber,
            invoiceDate: new Date(data.date).toLocaleDateString(),
            dueDate: data.dueDate ? new Date(data.dueDate).toLocaleDateString() : undefined,
            placeOfSupply: data.placeOfSupply,
            salesPerson: data.salesPerson?.name,
          },
          billing: {
            name: data.customer?.name || 'Walk-in Customer',
            address: data.customer?.billingAddress || '',
            gstin: data.customer?.gstin,
            phone: data.customer?.phone,
          },
          shipping: {
            name: data.customer?.name || 'Walk-in Customer',
            address: data.customer?.shippingAddress || data.customer?.billingAddress || '',
          },
          items: (data.items || []).map((item: any) => ({
            id: item.id || Math.random().toString(),
            name: item.product?.name || item.description || 'Item',
            description: item.description,
            hsn: item.product?.hsn || item.hsnCode || '',
            quantity: item.quantity,
            unit: item.product?.unit || 'Nos',
            rate: item.unitPrice,
            discount: item.discount,
            cgstPercent: item.cgstRate,
            cgstAmount: item.cgstAmount,
            sgstPercent: item.sgstRate,
            sgstAmount: item.sgstAmount,
            igstPercent: item.igstRate,
            igstAmount: item.igstAmount,
            total: item.totalAmount
          })),
          totals: {
            subtotal: data.subTotal || 0,
            cgstAmount: data.cgstTotal || 0,
            sgstAmount: data.sgstTotal || 0,
            igstAmount: data.igstTotal || 0,
            discount: data.discountAmount || 0,
            roundOff: data.roundOff || 0,
            grandTotal: data.totalAmount || 0,
            paidAmount: data.paidAmount || 0,
            balanceDue: (data.totalAmount || 0) - (data.paidAmount || 0)
          },
          isIgst,
          notes: data.notes || 'Thanks for your business.',
          termsAndConditions: data.termsAndConditions || 'Terms & Conditions apply.',
          qrData: data.qrCodeData || `upi://pay?pa=test@upi&pn=Test&am=${data.totalAmount}`,
          bankDetails: data.bankDetails
        };

        setInvoiceData(templateData);
      } catch (err) {
        console.error('Error fetching invoice', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Relying on browser print dialog for now as standard approach to save PDF with CSS.
    // If a library is added later, this is where it would be integrated.
    window.print();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading invoice...</div>;
  if (!invoiceData) return <div className="p-8 text-center text-red-500">Invoice not found</div>;

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Top action bar - Hidden during print */}
      <div className="no-print bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-[210mm] mx-auto px-4 py-3 flex justify-between items-center">
          <button
            onClick={() => navigate('/invoices')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft size={18} /> Back
          </button>

          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition"
            >
              <Printer size={16} /> Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
            >
              <Download size={16} /> Download PDF
            </button>
            <button
              className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition"
            >
              <Share2 size={16} /> Share
            </button>
          </div>
        </div>
      </div>

      {/* Invoice Render */}
      <div className="py-8 bg-gray-100">
        <InvoiceTemplate ref={printRef} data={invoiceData} />
      </div>
    </div>
  );
};
