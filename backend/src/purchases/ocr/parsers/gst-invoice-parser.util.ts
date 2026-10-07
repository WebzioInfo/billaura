import {
  BillExtractionResult,
  BillExtractionWarning,
  ExtractedLineItem,
  ExtractionField,
  RowClassification,
} from '../interfaces/bill-extractor.interface';

// State code to Indian state map
export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
};

export class GstInvoiceParser {
  /**
   * Parse extracted raw text into structured BillExtractionResult
   */
  static parse(
    rawText: string,
    ocrConfidence: number,
    meta: { fileName: string; secureUrl: string; cloudinaryPublicId: string; fileSize: number; mimeType: string }
  ): BillExtractionResult {
    const lines = rawText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const warnings: BillExtractionWarning[] = [];

    // 1. Extract GSTIN(s)
    const gstinRegex = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/gi;
    const gstinMatches: string[] = [];
    let match;
    while ((match = gstinRegex.exec(rawText)) !== null) {
      if (!gstinMatches.includes(match[1].toUpperCase())) {
        gstinMatches.push(match[1].toUpperCase());
      }
    }

    // Usually first GSTIN belongs to Seller/Vendor
    const vendorGstin = gstinMatches.length > 0 ? gstinMatches[0] : undefined;
    let vendorState = '';
    let vendorStateCode = '';
    if (vendorGstin) {
      vendorStateCode = vendorGstin.substring(0, 2);
      vendorState = GST_STATE_CODES[vendorStateCode] || '';
    }

    // 2. Extract Vendor Name
    const vendorName = this.extractVendorName(lines, vendorGstin);

    // 3. Extract Invoice Details
    const invoiceNumber = this.extractInvoiceNumber(rawText, lines);
    const invoiceDate = this.extractDate(rawText, ['invoice date', 'bill date', 'date of issue', 'dated', 'inv date', 'date:']);
    const dueDate = this.extractDate(rawText, ['due date', 'payment due', 'valid till', 'due by']);
    const poNumber = this.extractPattern(rawText, [
      /(?:po\s*(?:no|number|#)|purchase\s*order)[:\s]*([A-Za-z0-9\/-]+)/i,
      /(?:order\s*(?:no|number|#))[:\s]*([A-Za-z0-9\/-]+)/i,
    ]);
    const isRcm = /reverse\s*charge\s*[:\-]?\s*(yes|y\b)/i.test(rawText);

    // 4. Extract Vendor Address, Phone, Email
    const vendorEmail = this.extractPattern(rawText, [/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i]);
    const vendorPhone = this.extractPattern(rawText, [
      /(?:phone|mob(?:ile)?|tel|contact)[:\s]*((?:\+91[-\s]?)?[6-9]\d{9})/i,
      /\b((?:\+91[-\s]?)?[6-9]\d{9})\b/i,
    ]);
    const vendorAddress = this.extractVendorAddress(lines);

    // 5. Extract Totals & Taxes
    const subtotalVal = this.extractAmount(rawText, [
      /(?:sub\s*total|taxable\s*(?:value|amount)|net\s*amount|total\s*before\s*tax)[:\s]*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ]);
    const cgstVal = this.extractAmount(rawText, [
      /(?:cgst|central\s*gst)[^0-9\n]*[:\s]*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ]);
    const sgstVal = this.extractAmount(rawText, [
      /(?:sgst|utgst|state\s*gst)[^0-9\n]*[:\s]*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ]);
    const igstVal = this.extractAmount(rawText, [
      /(?:igst|integrated\s*gst)[^0-9\n]*[:\s]*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ]);
    const totalTaxVal = this.extractAmount(rawText, [
      /(?:total\s*tax|tax\s*amount|total\s*gst)[:\s]*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ]);
    const roundOffVal = this.extractAmount(rawText, [
      /(?:round\s*off|rounding)[:\s]*(?:₹|Rs\.?|INR)?\s*([-+]?[0-9,]+(?:\.[0-9]{1,2})?)/i,
    ]);
    const discountVal = this.extractAmount(rawText, [
      /(?:discount|total\s*discount)[:\s]*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ]);
    const grandTotalVal = this.extractAmount(rawText, [
      /(?:grand\s*total|invoice\s*total|total\s*amount|net\s*payable|bill\s*amount|total\s*value)[:\s]*(?:₹|Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ]);

    // 6. Extract Line Items
    const items = this.extractLineItems(lines);

    // 7. Calculate or reconcile totals
    const calculatedItemsSubtotal = items.reduce((acc, i) => acc + (i.rate.value * i.quantity.value - (i.rate.value * i.quantity.value * i.discount.value / 100)), 0);
    const calculatedTaxTotal = (cgstVal || 0) + (sgstVal || 0) + (igstVal || 0) || totalTaxVal || 0;
    const finalSubtotal = subtotalVal || calculatedItemsSubtotal || (grandTotalVal ? grandTotalVal - calculatedTaxTotal : 0);
    const finalGrandTotal = grandTotalVal || (finalSubtotal + calculatedTaxTotal + (roundOffVal || 0));

    // Check for mathematical consistency
    if (grandTotalVal && Math.abs(grandTotalVal - (finalSubtotal + calculatedTaxTotal + (roundOffVal || 0))) > 2) {
      warnings.push({
        field: 'grandTotal',
        code: 'TOTAL_MISMATCH',
        message: `OCR grand total (₹${grandTotalVal}) differs from computed sum (₹${Math.round(finalSubtotal + calculatedTaxTotal + (roundOffVal || 0))}). Please verify line items.`,
        severity: 'warning',
      });
    }

    if (igstVal && (cgstVal || sgstVal)) {
      warnings.push({
        field: 'taxes',
        code: 'TAX_MISMATCH',
        message: `Both IGST (₹${igstVal}) and CGST/SGST (₹${cgstVal}/${sgstVal}) detected. Standard GST rules require either Interstate (IGST) or Intrastate (CGST+SGST).`,
        severity: 'warning',
      });
    }

    if (!vendorGstin) {
      warnings.push({
        field: 'vendor.gstin',
        code: 'INVALID_GSTIN',
        message: 'No GSTIN found on document. Vendor will need manual verification.',
        severity: 'info',
      });
    }

    // Calculate overall confidence
    let confidenceScore = ocrConfidence || 0.85;
    if (vendorName) confidenceScore = Math.min(1.0, confidenceScore + 0.05);
    if (vendorGstin) confidenceScore = Math.min(1.0, confidenceScore + 0.05);
    if (invoiceNumber) confidenceScore = Math.min(1.0, confidenceScore + 0.05);
    if (grandTotalVal) confidenceScore = Math.min(1.0, confidenceScore + 0.05);
    if (items.length > 0) confidenceScore = Math.min(1.0, confidenceScore + 0.05);

    return {
      vendor: {
        name: {
          value: vendorName || 'Unknown Vendor',
          confidence: vendorName ? 0.9 : 0.4,
          source: 'ocr',
        },
        gstin: vendorGstin
          ? {
              value: vendorGstin,
              confidence: 0.98,
              source: 'ocr',
            }
          : undefined,
        address: vendorAddress
          ? {
              value: vendorAddress,
              confidence: 0.8,
              source: 'ocr',
            }
          : undefined,
        state: vendorState
          ? {
              value: vendorState,
              confidence: 0.95,
              source: 'calculated',
            }
          : undefined,
        stateCode: vendorStateCode
          ? {
              value: vendorStateCode,
              confidence: 0.95,
              source: 'calculated',
            }
          : undefined,
        phone: vendorPhone
          ? {
              value: vendorPhone,
              confidence: 0.85,
              source: 'ocr',
            }
          : undefined,
        email: vendorEmail
          ? {
              value: vendorEmail,
              confidence: 0.9,
              source: 'ocr',
            }
          : undefined,
      },
      invoice: {
        invoiceNumber: {
          value: invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
          confidence: invoiceNumber ? 0.95 : 0.4,
          source: 'ocr',
        },
        invoiceDate: {
          value: invoiceDate || new Date().toISOString().split('T')[0],
          confidence: invoiceDate ? 0.95 : 0.5,
          source: 'ocr',
        },
        dueDate: dueDate
          ? {
              value: dueDate,
              confidence: 0.9,
              source: 'ocr',
            }
          : undefined,
        purchaseOrderNumber: poNumber
          ? {
              value: poNumber,
              confidence: 0.85,
              source: 'ocr',
            }
          : undefined,
      },
      items,
      taxes: {
        cgst: {
          value: cgstVal || (igstVal ? 0 : calculatedTaxTotal / 2),
          confidence: cgstVal ? 0.95 : 0.7,
          source: cgstVal ? 'ocr' : 'calculated',
        },
        sgst: {
          value: sgstVal || (igstVal ? 0 : calculatedTaxTotal / 2),
          confidence: sgstVal ? 0.95 : 0.7,
          source: sgstVal ? 'ocr' : 'calculated',
        },
        igst: {
          value: igstVal || 0,
          confidence: igstVal ? 0.95 : 0.8,
          source: igstVal ? 'ocr' : 'calculated',
        },
        totalTax: {
          value: calculatedTaxTotal,
          confidence: calculatedTaxTotal > 0 ? 0.9 : 0.6,
          source: 'calculated',
        },
        isRcm: {
          value: isRcm,
          confidence: 0.9,
          source: 'ocr',
        },
      },
      totals: {
        subtotal: {
          value: Math.round(finalSubtotal * 100) / 100,
          confidence: subtotalVal ? 0.95 : 0.7,
          source: subtotalVal ? 'ocr' : 'calculated',
        },
        discount: {
          value: discountVal || 0,
          confidence: discountVal ? 0.9 : 0.8,
          source: 'ocr',
        },
        taxableAmount: {
          value: Math.round(finalSubtotal * 100) / 100,
          confidence: 0.85,
          source: 'calculated',
        },
        taxTotal: {
          value: Math.round(calculatedTaxTotal * 100) / 100,
          confidence: 0.9,
          source: 'calculated',
        },
        roundOff: {
          value: roundOffVal || 0,
          confidence: 0.9,
          source: 'ocr',
        },
        grandTotal: {
          value: Math.round(finalGrandTotal * 100) / 100,
          confidence: grandTotalVal ? 0.98 : 0.7,
          source: grandTotalVal ? 'ocr' : 'calculated',
        },
      },
      overallConfidence: Math.round(confidenceScore * 100) / 100,
      warnings,
      rawText,
      documentMeta: {
        fileName: meta.fileName,
        fileSize: meta.fileSize,
        mimeType: meta.mimeType,
        secureUrl: meta.secureUrl,
        cloudinaryPublicId: meta.cloudinaryPublicId,
      },
    };
  }

  private static extractVendorName(lines: string[], gstin?: string): string {
    // Look at first 10 non-empty lines
    for (let i = 0; i < Math.min(lines.length, 12); i++) {
      const line = lines[i];
      // Skip generic headers
      if (/^(tax\s*invoice|invoice|bill\s*of\s*supply|cash\s*memo|original\s*for\s*recipient|duplicate)/i.test(line)) {
        continue;
      }
      if (/^(billed\s*to|buyer|ship\s*to|consignee|customer)/i.test(line)) {
        break; // Passed seller header
      }
      if (line.length > 3 && !line.includes(':') && !/\b\d{10}\b/.test(line)) {
        // Strip company prefixes if any
        return line.replace(/^(m\/s\.?|messrs\.?)\s+/i, '').trim();
      }
    }
    return '';
  }

  private static extractVendorAddress(lines: string[]): string {
    const addressLines: string[] = [];
    for (let i = 1; i < Math.min(lines.length, 10); i++) {
      const line = lines[i];
      if (/\b\d{6}\b/.test(line) || /(road|street|nagar|plot|floor|building|complex|district|opp|near|pin)/i.test(line)) {
        addressLines.push(line);
      }
    }
    return addressLines.join(', ');
  }

  private static extractInvoiceNumber(rawText: string, lines: string[]): string {
    const match = rawText.match(
      /(?:invoice\s*(?:no|number|#)|bill\s*(?:no|number|#)|inv\s*(?:no|number|#)|tax\s*invoice\s*(?:no|number|#))[:\s]*([A-Za-z0-9\/-]+)/i
    );
    if (match && match[1] && match[1].length > 1) {
      return match[1].trim();
    }
    // Search line by line
    for (const line of lines) {
      const m = line.match(/(?:inv|bill|invoice)[^0-9a-z]*([a-z0-9\/-]{3,20})/i);
      if (m && m[1]) return m[1].trim();
    }
    return '';
  }

  private static extractDate(rawText: string, keywords: string[]): string {
    for (const kw of keywords) {
      const regex = new RegExp(
        `${kw}[:\\s]*([0-9]{1,2}[-\\/.][0-9]{1,2}[-\\/.][0-9]{2,4}|[0-9]{1,2}\\s+[A-Za-z]{3,9}\\s+[0-9]{2,4})`,
        'i'
      );
      const match = rawText.match(regex);
      if (match && match[1]) {
        const parsed = this.normalizeDateString(match[1].trim());
        if (parsed) return parsed;
      }
    }
    // General date regex fallback
    const fallbackMatch = rawText.match(/\b([0-3]?[0-9][-\/.][0-1]?[0-9][-\/.](?:20)?[0-9]{2})\b/);
    if (fallbackMatch && fallbackMatch[1]) {
      return this.normalizeDateString(fallbackMatch[1]) || '';
    }
    return '';
  }

  private static normalizeDateString(dateStr: string): string | null {
    try {
      // Split by -, /, or .
      const parts = dateStr.split(/[-\/.]/);
      if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);

        if (year < 100) year += 2000;
        // Swap if parts[0] is year
        if (day > 1000) {
          const temp = day;
          day = year;
          year = temp;
        }

        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2050) {
          const dStr = day.toString().padStart(2, '0');
          const mStr = month.toString().padStart(2, '0');
          return `${year}-${mStr}-${dStr}`;
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) {}
    return null;
  }

  private static extractPattern(rawText: string, regexList: RegExp[]): string {
    for (const reg of regexList) {
      const m = rawText.match(reg);
      if (m && m[1]) return m[1].trim();
    }
    return '';
  }

  private static extractAmount(rawText: string, regexList: RegExp[]): number | undefined {
    for (const reg of regexList) {
      const m = rawText.match(reg);
      if (m && m[1]) {
        const clean = m[1].replace(/,/g, '');
        const val = parseFloat(clean);
        if (!isNaN(val)) return val;
      }
    }
    return undefined;
  }

  private static extractLineItems(lines: string[]): ExtractedLineItem[] {
    const items: ExtractedLineItem[] = [];

    // Helper: Classify a line
    const classifyLine = (line: string): RowClassification => {
      const lower = line.toLowerCase().trim();
      if (/^(?:cgst|sgst|igst|gst|tax|output\s*gst|vat)\b/i.test(lower) || /\bgst\s*[-:]?\s*\d+%/i.test(lower)) {
        return 'TAX';
      }
      if (/^(?:sub\s*total|subtotal|taxable\s*(?:value|amount)|basic\s*amount)/i.test(lower)) {
        return 'SUBTOTAL';
      }
      if (/^(?:grand\s*total|total\s*(?:amount|payable|value)?|net\s*(?:amount|payable)|round\s*off|balance)/i.test(lower)) {
        return 'TOTAL';
      }
      if (/^(?:discount|less\s*:?|rebate)/i.test(lower)) {
        return 'DISCOUNT';
      }
      if (/^(?:shipping|freight|delivery|transport|courier|packing|handling)/i.test(lower)) {
        return 'CHARGE';
      }
      if (/(?:charges?|service|laundry|room|tariff|rent|maintenance|repair|fee|consult|labor|labour|testing|qc)/i.test(lower)) {
        return 'SERVICE';
      }
      return 'PRODUCT';
    };

    // Find table start boundary if present
    let headerIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/(?:description|item|particulars|product|goods|service)/i.test(line) && /(?:qty|quantity|rate|price|amount|total)/i.test(line)) {
        headerIdx = i;
        break;
      }
    }

    const startIdx = headerIdx !== -1 ? headerIdx + 1 : 0;
    let i = startIdx;

    while (i < lines.length) {
      const line = lines[i];
      const classification = classifyLine(line);

      // Stop scanning if reaching document summary totals
      if (classification === 'SUBTOTAL' || classification === 'TOTAL') {
        if (items.length > 0) break;
        i++;
        continue;
      }

      // Skip non-item noise (Terms & conditions, bank details, headers)
      if (
        /^(?:terms|bank\s*name|account\s*no|ifsc|authorized\s*sign|for\s+[a-z]|declaration|e\.\s*&\s*o\.e)/i.test(line) ||
        line.length < 3
      ) {
        i++;
        continue;
      }

      // Check if this line is a TAX line belonging to the immediately preceding item
      if (classification === 'TAX' && items.length > 0) {
        const gstMatch = line.match(/\b(0|5|12|18|28)\s*%/);
        const taxNum = this.extractAmount(line, [/\b([0-9]+(?:\.[0-9]{1,2})?)\b/]);
        const prevItem = items[items.length - 1];

        if (gstMatch) {
          const rateVal = parseInt(gstMatch[1], 10);
          prevItem.gstRate = { value: rateVal, confidence: 0.9, source: 'ocr' };
          if (taxNum && taxNum > 0) {
            prevItem.taxAmount = { value: taxNum, confidence: 0.9, source: 'ocr' };
            const taxable = prevItem.taxableAmount?.value || (prevItem.rate.value * prevItem.quantity.value);
            prevItem.lineTotal = { value: Math.round((taxable + taxNum) * 100) / 100, confidence: 0.9, source: 'ocr' };
          }
        }
        i++;
        continue;
      }

      // Try parsing single line
      const parsedSingle = this.parseItemTokens(line, classification, items.length);
      if (parsedSingle) {
        items.push(parsedSingle);
        i++;
        continue;
      }

      // Try parsing 2-line item block (description on line 1, numbers on line 2)
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextClassification = classifyLine(nextLine);
        if (nextClassification !== 'SUBTOTAL' && nextClassification !== 'TOTAL') {
          const combined = `${line} ${nextLine}`;
          const parsedMulti = this.parseItemTokens(combined, classification, items.length, line);
          if (parsedMulti) {
            items.push(parsedMulti);
            i += 2;
            continue;
          }
        }
      }

      i++;
    }

    // Fallback: heuristic scan if no items were extracted
    if (items.length === 0) {
      for (let j = 0; j < lines.length; j++) {
        const line = lines[j];
        if (line.length > 5 && !/(?:invoice|total|gst|tax|date|bank|phone|email)/i.test(line)) {
          const parsed = this.parseItemTokens(line, classifyLine(line), items.length);
          if (parsed && parsed.quantity.value > 0 && parsed.rate.value > 0) {
            items.push(parsed);
            if (items.length >= 10) break;
          }
        }
      }
    }

    // Default item if none detected
    if (items.length === 0) {
      items.push({
        id: `item-ocr-1`,
        name: { value: 'Bill Purchase Item', confidence: 0.5, source: 'ocr' },
        extractedDescription: 'Bill Purchase Item',
        classification: 'PRODUCT',
        hsnSac: { value: 'N/A', confidence: 0.5, source: 'ocr' },
        quantity: { value: 1, confidence: 0.7, source: 'ocr' },
        unit: { value: 'PCS', confidence: 0.8, source: 'ocr' },
        rate: { value: 0, confidence: 0.5, source: 'ocr' },
        discount: { value: 0, confidence: 0.9, source: 'ocr' },
        taxableAmount: { value: 0, confidence: 0.7, source: 'calculated' },
        gstRate: { value: 18, confidence: 0.8, source: 'ocr' },
        cgstAmount: { value: 0, confidence: 0.8, source: 'calculated' },
        sgstAmount: { value: 0, confidence: 0.8, source: 'calculated' },
        igstAmount: { value: 0, confidence: 0.8, source: 'calculated' },
        taxAmount: { value: 0, confidence: 0.8, source: 'ocr' },
        lineTotal: { value: 0, confidence: 0.5, source: 'ocr' },
        matchStatus: 'NEW',
        candidateProduct: {
          name: 'Bill Purchase Item',
          description: 'Bill Purchase Item',
          itemType: 'PRODUCT',
          gstRate: 18,
          unit: 'PCS',
          isInventoryItem: true,
        },
      });
    }

    return items;
  }

  private static parseItemTokens(
    fullLine: string,
    classification: RowClassification,
    index: number,
    originalDescOverride?: string
  ): ExtractedLineItem | null {
    const tokens = fullLine.split(/\s+/);
    if (tokens.length < 2) return null;

    // Strip date expressions before extracting HSN codes
    const lineWithoutDates = fullLine.replace(/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.](?:19|20)?\d{2}\b/g, '');
    let hsnCode = 'N/A';
    const hsnMatch = lineWithoutDates.match(/\b([1-9][0-9]{3,7})\b/);
    if (hsnMatch) {
      hsnCode = hsnMatch[1];
    }

    let gstRate = 18;
    const gstMatch = fullLine.match(/\b(0|5|12|18|28)\s*%\b/);
    if (gstMatch) {
      gstRate = parseInt(gstMatch[1], 10);
    }

    const numbers: number[] = [];
    const textTokens: string[] = [];

    for (const token of tokens) {
      const clean = token.replace(/,/g, '').replace(/^[₹$€]/, '');
      const num = parseFloat(clean);
      if (!isNaN(num) && /^[0-9]+(?:\.[0-9]+)?$/.test(clean) && clean !== hsnCode) {
        numbers.push(num);
      } else if (!/^(₹|Rs\.?|INR|nos|pcs|kg|mtr|box|pkt|qty|rate|amt|amount)$/i.test(token)) {
        textTokens.push(token);
      }
    }

    const exactDescription = (originalDescOverride || textTokens.join(' '))
      .replace(/^[0-9]+[.\-)]\s*/, '')
      .trim();

    if (exactDescription.length < 2) return null;

    // Filter out common header / metadata text
    if (/^(tax\s*invoice|bill\s*to|ship\s*to|gstin|pan|invoice\s*no|date|total|subtotal)/i.test(exactDescription)) {
      return null;
    }

    // Cleaned candidate name (e.g. "Room Charges - 04/04/2018" -> "Room Charges")
    const cleanedCandidateName = exactDescription
      .replace(/[-\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/, '')
      .replace(/\s*-\s*$/, '')
      .trim();

    let qty = 1;
    let rate = 0;
    let lineTotal = 0;

    if (numbers.length >= 3) {
      lineTotal = numbers[numbers.length - 1];
      rate = numbers[numbers.length - 2];
      qty = numbers[0] > 0 && numbers[0] <= 100000 ? numbers[0] : 1;
    } else if (numbers.length === 2) {
      if (numbers[0] <= 1000 && numbers[1] >= numbers[0]) {
        qty = numbers[0];
        rate = Math.round((numbers[1] / (qty || 1)) * 100) / 100;
        lineTotal = numbers[1];
      } else {
        rate = numbers[0];
        lineTotal = numbers[1];
        qty = 1;
      }
    } else if (numbers.length === 1) {
      rate = numbers[0];
      lineTotal = numbers[0];
      qty = 1;
    } else {
      if (classification !== 'SERVICE') return null;
      qty = 1;
      rate = 0;
      lineTotal = 0;
    }

    const taxableAmount = Math.round(rate * qty * 100) / 100;
    const taxAmount = Math.round(((taxableAmount * gstRate) / 100) * 100) / 100;
    if (lineTotal === 0 || lineTotal === rate) {
      lineTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;
    }

    const isService = classification === 'SERVICE';

    return {
      id: `item-ocr-${index + 1}`,
      name: { value: cleanedCandidateName || exactDescription, confidence: 0.88, source: 'ocr' },
      extractedDescription: exactDescription,
      classification,
      hsnSac: { value: hsnCode, confidence: hsnCode !== 'N/A' ? 0.9 : 0.5, source: 'ocr' },
      quantity: { value: qty || 1, confidence: 0.9, source: 'ocr' },
      unit: { value: isService ? 'NOS' : 'PCS', confidence: 0.8, source: 'ocr' },
      rate: { value: rate || lineTotal || 0, confidence: 0.85, source: 'ocr' },
      discount: { value: 0, confidence: 0.9, source: 'ocr' },
      taxableAmount: { value: taxableAmount, confidence: 0.88, source: 'calculated' },
      gstRate: { value: gstRate, confidence: 0.85, source: 'ocr' },
      cgstAmount: { value: Math.round((taxAmount / 2) * 100) / 100, confidence: 0.85, source: 'calculated' },
      sgstAmount: { value: Math.round((taxAmount / 2) * 100) / 100, confidence: 0.85, source: 'calculated' },
      igstAmount: { value: 0, confidence: 0.85, source: 'calculated' },
      taxAmount: { value: taxAmount, confidence: 0.85, source: 'calculated' },
      lineTotal: { value: lineTotal || Math.round((taxableAmount + taxAmount) * 100) / 100, confidence: 0.9, source: 'ocr' },
      matchStatus: 'NEW',
      candidateProduct: {
        name: cleanedCandidateName || exactDescription,
        description: exactDescription,
        itemType: isService ? 'SERVICE' : 'PRODUCT',
        hsnCode: hsnCode !== 'N/A' ? hsnCode : undefined,
        gstRate,
        unit: isService ? 'NOS' : 'PCS',
        isInventoryItem: !isService,
      },
    };
  }
}
