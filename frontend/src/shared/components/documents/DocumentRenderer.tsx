import React from 'react';
import { DocumentTemplate } from '@/features/settings/types/template';
import { SpreadsheetQuoteDocument } from './SpreadsheetQuoteDocument';

interface DocumentRendererProps {
  template: Partial<DocumentTemplate>;
  data?: any;
}

export function DocumentRenderer({ template, data = {} }: DocumentRendererProps) {
  const isSpreadsheet =
    template.theme === 'spreadsheet' ||
    template.name === 'Spreadsheet Template' ||
    template.docType === 'quote' ||
    template.type === 'quote';

  if (isSpreadsheet) {
    // If quote data isn't passed, prepare realistic preview sample data matching Reference 1
    const quoteData = data.quote || {
      quotationNo: data.quotationNo || data.invoiceNo || 'QT-000022',
      date: data.date || '2026-04-13',
      expiryDate: data.expiryDate || '2026-04-20',
      status: data.status || 'INVOICED',
      placeOfSupply: data.placeOfSupply || 'Kerala (32)',
      salesperson: data.salesperson || 'PAVITHRA',
      subTotal: 1035.0,
      cgstAmount: 93.15,
      sgstAmount: 93.15,
      igstAmount: 0,
      totalTaxAmount: 186.3,
      grandTotal: 1221.3,
      adjustment: 0,
      businessPartner: {
        name: data.customerName || 'AQUA ICELANDIC BEVERAGES INDIA PVT.LTD',
        address: 'DOOR NO 54/26\nKAYALAM,PERUVAYAL PO\nKOZHIKKODE\nKerala\n673661\nIndia',
        gstin: '32ARACA4412A1ZP',
        phone: '8037472527',
      },
      items: [
        {
          id: '1',
          description: 'GENESYS LS',
          hsn: '29213090',
          qty: 5,
          unit: 'Ltr',
          rate: 207.0,
          taxPercent: 18,
          taxAmount: 186.3,
          cgstAmount: 93.15,
          sgstAmount: 93.15,
          total: 1035.0,
        },
      ],
      gstBreakup: {
        salesperson: 'PAVITHRA',
        notes:
          'We Hope this offer is favorable to you and expect your valuable order at the earliest. please feel free to contact us on 7510510946,7510510947',
        termsConditions:
          'Transportation Charges extra.\nGoods once sold are not returnable or exchangeable.\nAny complaint or damages should be informed within four days after material received.',
      },
      company: data.company || {
        companyName: 'BIOFIX TECHNOLOGY LLP',
        address: 'MK BUILDING\nBYPASS ROAD KONDOTTY\nMALAPPURAM\nKerala 673638',
        gstin: '32ABDFB0485M1Z0',
        phone: '91-7510510947',
        email: 'biofixofficial@gmail.com',
        bankAccounts: [
          {
            accountName: 'BIOFIX TECHNOLOGY',
            accountNumber: '2510201002100',
            bankName: 'FEDERAL BANK',
            ifsc: 'FDRL0002510',
            branch: 'KONDOTTY',
          },
        ],
      },
    };

    return (
      <SpreadsheetQuoteDocument
        quote={quoteData}
        company={data.company || quoteData.company}
        template={template}
        showStatusRibbon={template.config?.showStatusRibbon !== false}
      />
    );
  }

  const colors = template.colors || {
    primary: '#408dfb',
    secondary: '#1e293b',
    text: '#333333',
    background: '#ffffff',
  };
  const typography = template.typography || {
    fontFamily: 'Inter',
    fontSize: '13px',
  };
  const layout = template.layout || {
    margins: '20px',
    paperSize: 'A4',
    orientation: 'PORTRAIT',
  };
  const elements = template.elements || {
    showLogo: true,
    showGstin: true,
    showPan: true,
    showBankDetails: true,
    showTerms: true,
    showSignature: true,
    showTaxBreakup: true,
    showHsn: true,
  };
  const logoSettings = template.logoSettings || {
    showLogo: true,
    useOrgLogo: true,
    position: 'left',
    width: 140,
  };
  const config = template.config || {};
  const columns = config.columns || {
    item: { visible: true, label: 'Item & Description' },
    hsn: { visible: true, label: 'HSN/SAC' },
    qty: { visible: true, label: 'Qty' },
    rate: { visible: true, label: 'Rate' },
    discount: { visible: true, label: 'Discount' },
    tax: { visible: true, label: 'Tax %' },
    amount: { visible: true, label: 'Amount' },
  };
  const totalsConfig = config.totals || {
    showSubTotal: true,
    showDiscount: true,
    showTaxBreakup: true,
    showRoundOff: true,
    showTotalInWords: true,
  };
  const footerConfig = config.footer || {
    showNotes: true,
    showTerms: true,
    showBankDetails: true,
    showSignature: true,
    showPoweredBy: false,
  };

  // Determine logo source
  const hasCustomLogo = !logoSettings.useOrgLogo && template.logoUrl;
  const logoUrl = hasCustomLogo
    ? template.logoUrl
    : (data.logoUrl || '/logo.png');

  const showLogo = logoSettings.showLogo !== false && elements.showLogo !== false;
  const logoPosition = logoSettings.position || 'left';
  const logoWidth = Math.min(240, Math.max(40, Number(logoSettings.width || 140)));

  // Realistic sample line items
  const items = [
    {
      item: 'Enterprise Cloud ERP Subscription (Annual)',
      hsn: '998313',
      qty: 1,
      rate: 80000,
      discount: 0,
      tax: 18,
      amount: 80000,
    },
    {
      item: 'Implementation & Data Migration Services',
      hsn: '998314',
      qty: 1,
      rate: 20000,
      discount: 0,
      tax: 18,
      amount: 20000,
    },
    {
      item: 'Dedicated SLA Support Add-on',
      hsn: '998315',
      qty: 1,
      rate: 10000,
      discount: 1000,
      tax: 18,
      amount: 9000,
    },
  ];

  const subTotal = 109000;
  const discountTotal = 1000;
  const taxableAmount = 108000;
  const cgstAmount = 9720;
  const sgstAmount = 9720;
  const grandTotal = 127440;

  return (
    <div
      className="bg-white mx-auto print:shadow-none shadow-sm relative overflow-hidden select-none transition-all"
      style={{
        width: layout.orientation === 'LANDSCAPE' ? '297mm' : '210mm',
        minHeight: layout.orientation === 'LANDSCAPE' ? '210mm' : '297mm',
        fontFamily: typography.fontFamily || 'Inter, sans-serif',
        fontSize: typography.fontSize || '13px',
        color: colors.text || '#333333',
        padding: layout.margins || '24px',
        backgroundColor: colors.background || '#ffffff',
      }}
    >
      {/* Centered Logo layout if position is center */}
      {showLogo && logoPosition === 'center' && (
        <div className="flex justify-center mb-4">
          <img
            src={logoUrl || '/logo.png'}
            alt="Logo"
            className="max-h-[80px] object-contain"
            style={{ width: `${logoWidth}px` }}
          />
        </div>
      )}

      {/* Header Container */}
      <div
        className="pb-4 border-b-2 flex justify-between items-start gap-6"
        style={{ borderColor: colors.primary || '#408dfb' }}
      >
        {/* Company Column */}
        <div className="flex-1">
          {showLogo && logoPosition === 'left' && (
            <div className="mb-3">
              <img
                src={logoUrl || '/logo.png'}
                alt="Logo"
                className="max-h-[80px] object-contain"
                style={{ width: `${logoWidth}px` }}
              />
            </div>
          )}
          <h2 className="text-[17px] font-bold text-[#1e293b] leading-tight">
            {data.companyName || 'Bill Aura ERP Pvt Ltd'}
          </h2>
          <div className="mt-1 text-[12px] text-[#475569] space-y-0.5 leading-snug">
            <p>123 Business Avenue, Tech Hub, Mumbai 400001</p>
            {elements.showGstin && (
              <p>
                <span className="font-semibold text-[#1e293b]">GSTIN: </span>27AABCB1234F1Z9
              </p>
            )}
            {elements.showPan && (
              <p>
                <span className="font-semibold text-[#1e293b]">PAN: </span>AABCB1234F
              </p>
            )}
            <p>Phone: +91 98765 43210 &bull; Email: accounts@billaura.com</p>
          </div>
        </div>

        {/* Right Document Meta / Right Logo Column */}
        <div className="text-right flex flex-col items-end">
          {showLogo && logoPosition === 'right' && (
            <div className="mb-3">
              <img
                src={logoUrl || '/logo.png'}
                alt="Logo"
                className="max-h-[80px] object-contain"
                style={{ width: `${logoWidth}px` }}
              />
            </div>
          )}
          <h1
            className="text-[20px] font-bold uppercase tracking-wide"
            style={{ color: colors.primary || '#408dfb' }}
          >
            {config.documentTitle || template.docType?.replace('_', ' ')?.toUpperCase() || 'TAX INVOICE'}
          </h1>
          <div className="mt-2 text-[12px] text-[#475569] space-y-1">
            <div>
              <span className="font-semibold text-[#1e293b]">{config.numberingLabel || 'Invoice#'}: </span>
              <span className="font-mono text-[#333333]">{data.invoiceNo || 'INV-2026-0042'}</span>
            </div>
            <div>
              <span className="font-semibold text-[#1e293b]">Date: </span>
              <span>{data.date || '16/10/2026'}</span>
            </div>
            {config.showDueDate !== false && (
              <div>
                <span className="font-semibold text-[#1e293b]">Due Date: </span>
                <span>31/10/2026</span>
              </div>
            )}
            {config.showPlaceOfSupply !== false && (
              <div>
                <span className="font-semibold text-[#1e293b]">Place of Supply: </span>
                <span>Maharashtra (27)</span>
              </div>
            )}
            {config.showPoNumber !== false && (
              <div>
                <span className="font-semibold text-[#1e293b]">P.O. / Ref#: </span>
                <span className="font-mono">PO-88491</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Party Details (Bill To / Ship To) */}
      {(config.showBillTo !== false || config.showShipTo !== false) && (
        <div className="mt-5 grid grid-cols-2 gap-6 text-[12px]">
          {config.showBillTo !== false && (
            <div className="bg-[#f8fafc] p-3 rounded-[4px] border border-[#e2e8f0]">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-1">
                Billed To
              </h3>
              <p className="font-bold text-[13px] text-[#1e293b]">
                {data.customerName || 'Global Enterprises Inc.'}
              </p>
              <p className="text-[#475569] mt-0.5">456 Corporate Towers, Nariman Point</p>
              <p className="text-[#475569]">Mumbai, Maharashtra 400021</p>
              <p className="text-[#475569] mt-1">
                <span className="font-semibold text-[#1e293b]">GSTIN: </span>27XYZDE9876K1Z3
              </p>
            </div>
          )}
          {config.showShipTo !== false && (
            <div className="bg-[#f8fafc] p-3 rounded-[4px] border border-[#e2e8f0]">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-1">
                Shipped To
              </h3>
              <p className="font-bold text-[13px] text-[#1e293b]">
                {data.customerName || 'Global Enterprises Inc.'}
              </p>
              <p className="text-[#475569] mt-0.5">Plot 12, MIDC Industrial Area</p>
              <p className="text-[#475569]">Navi Mumbai, Maharashtra 400705</p>
            </div>
          )}
        </div>
      )}

      {/* Line Items Table */}
      <div className="mt-5">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr
              className="border-b"
              style={{
                backgroundColor: config.tableHeaderBg || '#f8fafc',
                color: config.tableHeaderText || '#1e293b',
              }}
            >
              {columns.item?.visible !== false && (
                <th className="py-2 px-2.5 text-left font-semibold">
                  {columns.item?.label || 'Item & Description'}
                </th>
              )}
              {columns.hsn?.visible !== false && elements.showHsn && (
                <th className="py-2 px-2.5 text-left font-semibold">
                  {columns.hsn?.label || 'HSN/SAC'}
                </th>
              )}
              {columns.qty?.visible !== false && (
                <th className="py-2 px-2.5 text-right font-semibold">
                  {columns.qty?.label || 'Qty'}
                </th>
              )}
              {columns.rate?.visible !== false && (
                <th className="py-2 px-2.5 text-right font-semibold">
                  {columns.rate?.label || 'Rate'}
                </th>
              )}
              {columns.discount?.visible !== false && (
                <th className="py-2 px-2.5 text-right font-semibold">
                  {columns.discount?.label || 'Discount'}
                </th>
              )}
              {columns.tax?.visible !== false && (
                <th className="py-2 px-2.5 text-right font-semibold">
                  {columns.tax?.label || 'Tax %'}
                </th>
              )}
              {columns.amount?.visible !== false && (
                <th className="py-2 px-2.5 text-right font-semibold">
                  {columns.amount?.label || 'Amount'}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((row, idx) => (
              <tr key={idx} className="border-b border-[#f1f5f9]">
                {columns.item?.visible !== false && (
                  <td className="py-2.5 px-2.5 font-medium text-[#1e293b]">{row.item}</td>
                )}
                {columns.hsn?.visible !== false && elements.showHsn && (
                  <td className="py-2.5 px-2.5 text-[#64748b] font-mono text-[11px]">{row.hsn}</td>
                )}
                {columns.qty?.visible !== false && (
                  <td className="py-2.5 px-2.5 text-right text-[#333333]">{row.qty}</td>
                )}
                {columns.rate?.visible !== false && (
                  <td className="py-2.5 px-2.5 text-right text-[#333333]">
                    ₹{row.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                )}
                {columns.discount?.visible !== false && (
                  <td className="py-2.5 px-2.5 text-right text-[#64748b]">
                    {row.discount > 0 ? `₹${row.discount}` : '-'}
                  </td>
                )}
                {columns.tax?.visible !== false && (
                  <td className="py-2.5 px-2.5 text-right text-[#333333]">{row.tax}%</td>
                )}
                {columns.amount?.visible !== false && (
                  <td className="py-2.5 px-2.5 text-right font-medium text-[#1e293b]">
                    ₹{row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals & Notes Section */}
      <div className="mt-5 flex justify-between items-start gap-8">
        {/* Left Footer: Bank Details & Notes */}
        <div className="flex-1 space-y-4 text-[12px]">
          {footerConfig.showBankDetails !== false && elements.showBankDetails && (
            <div className="bg-[#f8fafc] p-3 rounded-[4px] border border-[#e2e8f0]">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-1.5">
                Bank Details
              </h4>
              <p className="text-[#333333]">Bank: HDFC Bank Ltd</p>
              <p className="text-[#333333]">Account Name: Bill Aura ERP Pvt Ltd</p>
              <p className="text-[#333333] font-mono">A/C No: 50200012345678</p>
              <p className="text-[#333333] font-mono">IFSC: HDFC0000123 &bull; Branch: Nariman Point</p>
            </div>
          )}

          {footerConfig.showNotes !== false && (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-1">
                Customer Notes
              </h4>
              <p className="text-[#475569] text-[12px]">
                {template.notes || 'Thank you for your business. Please contact us for any query.'}
              </p>
            </div>
          )}

          {totalsConfig.showTotalInWords !== false && (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-0.5">
                Total in Words
              </h4>
              <p className="font-medium text-[#1e293b] italic">
                One Lakh Twenty Seven Thousand Four Hundred and Forty Rupees Only
              </p>
            </div>
          )}
        </div>

        {/* Right Totals Breakdown */}
        <div className="w-[300px] text-[12px] space-y-1.5">
          {totalsConfig.showSubTotal !== false && (
            <div className="flex justify-between py-1 text-[#475569]">
              <span>Sub Total</span>
              <span className="font-medium text-[#1e293b]">
                ₹{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {totalsConfig.showDiscount !== false && (
            <div className="flex justify-between py-1 text-[#475569]">
              <span>Discount</span>
              <span className="text-[#dc2626]">
                -₹{discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}
          {totalsConfig.showTaxBreakup !== false && elements.showTaxBreakup && (
            <>
              <div className="flex justify-between py-1 text-[#475569] text-[11px]">
                <span>CGST (9%)</span>
                <span>₹{cgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between py-1 text-[#475569] text-[11px]">
                <span>SGST (9%)</span>
                <span>₹{sgstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </>
          )}
          {totalsConfig.showRoundOff !== false && (
            <div className="flex justify-between py-1 text-[#475569] text-[11px]">
              <span>Round Off</span>
              <span>₹0.00</span>
            </div>
          )}
          <div
            className="flex justify-between items-center py-2.5 mt-2 border-t-2 text-[15px] font-bold"
            style={{ borderColor: colors.primary || '#408dfb' }}
          >
            <span className="text-[#1e293b]">Grand Total</span>
            <span style={{ color: colors.primary || '#408dfb' }}>
              ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Terms & Signature Footer */}
      <div className="mt-8 pt-4 border-t border-[#e2e8f0] flex justify-between items-end gap-6 text-[12px]">
        {footerConfig.showTerms !== false && elements.showTerms && (
          <div className="flex-1 max-w-[65%]">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#64748b] mb-1">
              Terms & Conditions
            </h4>
            <p className="text-[#475569] text-[11px] whitespace-pre-line leading-relaxed">
              {template.terms ||
                '1. Payment due upon receipt.\n2. Goods once sold will not be taken back.\n3. Subject to local jurisdiction.'}
            </p>
          </div>
        )}

        {footerConfig.showSignature !== false && elements.showSignature && (
          <div className="w-[180px] text-center">
            {footerConfig.signatureUrl ? (
              <img
                src={footerConfig.signatureUrl}
                alt="Signature"
                className="h-12 mx-auto object-contain mb-1"
              />
            ) : (
              <div className="h-12 border-b border-dashed border-[#94a3b8] mb-1" />
            )}
            <p className="text-[11px] font-semibold text-[#1e293b]">Authorized Signatory</p>
          </div>
        )}
      </div>

      {footerConfig.showPoweredBy && (
        <div className="mt-6 pt-2 border-t border-[#f1f5f9] text-center text-[10px] text-[#94a3b8]">
          Powered by Bill Aura ERP
        </div>
      )}
    </div>
  );
}

export default DocumentRenderer;
