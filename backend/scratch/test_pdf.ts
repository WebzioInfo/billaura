import { ReactPdfEngineService } from '../src/documents/pdf-engine/react-pdf-engine.service';
import { PdfDocumentData } from '../src/documents/pdf-engine/pdf-document.types';

async function testPdf() {
  const service = new ReactPdfEngineService();
  const dummyData: PdfDocumentData = {
    document: {
      title: "TAX INVOICE",
      documentNo: "INV-2026-001",
      date: "30/09/2026",
      currency: "INR",
      subtotal: 1000,
      totalTax: 180,
      grandTotal: 1180,
      amountInWords: "One Thousand One Hundred Eighty Rupees Only",
      items: [
        {
          slNo: 1,
          name: "Consulting Services",
          hsn: "9983",
          qty: 1,
          rate: 1000,
          amount: 1000,
          taxRate: 18,
          taxAmount: 180
        }
      ]
    },
    company: {
      name: "BIOFIX TECHNOLOGY LLP",
      address: "KONDOTTY, MALAPPURAM",
      state: "Kerala",
      gstin: "32ABDFB4446M1ZG"
    },
    party: {
      name: "ACME CORP",
      address: "COCHIN, KERALA",
      gstin: "32AAAAA0000A1Z5"
    }
  };

  const buffer = await service.renderDocumentPdf(dummyData);
  console.log("PDF Buffer length:", buffer.length);
  console.log("PDF Header:", buffer.subarray(0, 5).toString());
  if (buffer.subarray(0, 5).toString() === "%PDF-") {
    console.log("SUCCESS: PDF starts with %PDF-!");
  } else {
    console.error("FAIL: PDF does not start with %PDF-!");
  }
}

testPdf().catch(console.error);
