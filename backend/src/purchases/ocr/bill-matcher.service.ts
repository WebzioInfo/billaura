import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BillExtractionResult, BillExtractionWarning } from './interfaces/bill-extractor.interface';

@Injectable()
export class BillMatcherService {
  private readonly logger = new Logger(BillMatcherService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enrich extraction result with tenant-specific database matching (Vendor, Products, Duplicate check, Tax mode)
   */
  async enrichExtraction(companyId: string, result: BillExtractionResult): Promise<BillExtractionResult> {
    const warnings: BillExtractionWarning[] = [...result.warnings];

    // 1. Intelligent Vendor Matching
    const matchedVendor = await this.matchVendor(companyId, result, warnings);
    if (matchedVendor) {
      result.matchedVendor = matchedVendor;
    }

    // 2. Intelligent Product Matching
    await this.matchProducts(companyId, result, warnings);

    // 3. Duplicate Bill Detection
    const duplicateCheck = await this.detectDuplicate(companyId, result, matchedVendor?.id, warnings);
    if (duplicateCheck) {
      result.duplicateCheck = duplicateCheck;
    }

    // 4. Tax Mode / Interstate Check
    await this.validateTaxMode(companyId, result, matchedVendor?.state, warnings);

    return {
      ...result,
      warnings,
    };
  }

  private async matchVendor(
    companyId: string,
    result: BillExtractionResult,
    warnings: BillExtractionWarning[]
  ) {
    const extractedGstin = result.vendor.gstin?.value?.trim().toUpperCase();
    const extractedName = result.vendor.name.value.trim();

    // 1. Try exact GSTIN match
    if (extractedGstin) {
      const gstinVendor = await this.prisma.businessPartner.findFirst({
        where: {
          companyId,
          gstin: {
            equals: extractedGstin,
            mode: 'insensitive',
          },
          deletedAt: null,
        },
      });

      if (gstinVendor) {
        return {
          id: gstinVendor.id,
          name: gstinVendor.name,
          gstin: gstinVendor.gstin || undefined,
          state: gstinVendor.state || undefined,
          confidence: 1.0,
          matchType: 'GSTIN' as const,
        };
      }
    }

    // 2. Try Exact Name match (case-insensitive)
    if (extractedName && extractedName !== 'Unknown Vendor') {
      const normalizedName = this.normalizeString(extractedName);
      const vendors = await this.prisma.businessPartner.findMany({
        where: {
          companyId,
          deletedAt: null,
        },
        select: { id: true, name: true, gstin: true, state: true },
      });

      for (const v of vendors) {
        if (this.normalizeString(v.name) === normalizedName) {
          // Check for GSTIN conflict
          if (extractedGstin && v.gstin && extractedGstin !== v.gstin.toUpperCase()) {
            warnings.push({
              field: 'vendor',
              code: 'VENDOR_MISMATCH',
              message: `Vendor '${v.name}' matched by name, but OCR GSTIN (${extractedGstin}) differs from record (${v.gstin}). Please verify before selecting.`,
              severity: 'warning',
            });
          }

          return {
            id: v.id,
            name: v.name,
            gstin: v.gstin || undefined,
            state: v.state || undefined,
            confidence: 0.95,
            matchType: 'EXACT_NAME' as const,
          };
        }
      }

      // 3. Try Fuzzy Name match
      let bestMatch: any = null;
      let highestSimilarity = 0;

      for (const v of vendors) {
        const sim = this.calculateSimilarity(normalizedName, this.normalizeString(v.name));
        if (sim > highestSimilarity && sim >= 0.70) {
          highestSimilarity = sim;
          bestMatch = v;
        }
      }

      if (bestMatch) {
        if (extractedGstin && bestMatch.gstin && extractedGstin !== bestMatch.gstin.toUpperCase()) {
          warnings.push({
            field: 'vendor',
            code: 'VENDOR_MISMATCH',
            message: `Vendor '${bestMatch.name}' fuzzy matched (${Math.round(highestSimilarity * 100)}%), but GSTIN differs. Please confirm vendor.`,
            severity: 'warning',
          });
        }

        return {
          id: bestMatch.id,
          name: bestMatch.name,
          gstin: bestMatch.gstin || undefined,
          state: bestMatch.state || undefined,
          confidence: Math.round(highestSimilarity * 100) / 100,
          matchType: 'FUZZY_NAME' as const,
        };
      }
    }

    // If no match found
    warnings.push({
      field: 'vendor',
      code: 'VENDOR_MISMATCH',
      message: `No matching vendor found in database for '${extractedName}'. You can select an existing vendor or create a new one.`,
      severity: 'info',
    });

    return null;
  }

  private async matchProducts(
    companyId: string,
    result: BillExtractionResult,
    warnings: BillExtractionWarning[]
  ) {
    const products = await this.prisma.product.findMany({
      where: {
        companyId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        hsnCode: true,
        unit: true,
        purchasePrice: true,
        gstRate: true,
      },
    });

    if (products.length === 0) return;

    let unmatchedCount = 0;

    for (const item of result.items) {
      const extractedItemName = item.name.value;
      const extractedHsn = item.hsnSac?.value;
      const normalizedItemName = this.normalizeString(extractedItemName);

      let matchedProduct: any = null;
      let matchConfidence = 0;

      // 1. SKU or Barcode match
      const skuMatch = products.find(
        p => (p.sku && p.sku.toLowerCase() === normalizedItemName) || (p.barcode && p.barcode === normalizedItemName)
      );
      if (skuMatch) {
        matchedProduct = skuMatch;
        matchConfidence = 1.0;
      }

      // 2. Exact name match
      if (!matchedProduct) {
        const exactMatch = products.find(p => this.normalizeString(p.name) === normalizedItemName);
        if (exactMatch) {
          matchedProduct = exactMatch;
          matchConfidence = 0.95;
        }
      }

      // 3. HSN + Partial Name match
      if (!matchedProduct && extractedHsn && extractedHsn !== 'N/A') {
        const hsnCandidates = products.filter(p => p.hsnCode === extractedHsn);
        for (const candidate of hsnCandidates) {
          const sim = this.calculateSimilarity(normalizedItemName, this.normalizeString(candidate.name));
          if (sim >= 0.5 && sim > matchConfidence) {
            matchedProduct = candidate;
            matchConfidence = 0.85;
          }
        }
      }

      // 4. Fuzzy Name match
      if (!matchedProduct) {
        let bestSim = 0;
        let bestCandidate: any = null;
        for (const p of products) {
          const sim = this.calculateSimilarity(normalizedItemName, this.normalizeString(p.name));
          if (sim > bestSim && sim >= 0.70) {
            bestSim = sim;
            bestCandidate = p;
          }
        }
        if (bestCandidate) {
          matchedProduct = bestCandidate;
          matchConfidence = Math.round(bestSim * 100) / 100;
        }
      }

      if (matchedProduct) {
        item.matchedProductId = matchedProduct.id;
        item.matchedProductName = matchedProduct.name;
        item.matchConfidence = matchConfidence;
        // Suggest internal HSN if available
        if (matchedProduct.hsnCode && item.hsnSac?.value === 'N/A') {
          item.hsnSac = { value: matchedProduct.hsnCode, confidence: 0.9, source: 'matched' };
        }
      } else {
        unmatchedCount++;
      }
    }

    if (unmatchedCount > 0) {
      warnings.push({
        field: 'items',
        code: 'PRODUCT_UNMATCHED',
        message: `${unmatchedCount} item(s) could not be automatically matched to your catalog. Please select product items manually.`,
        severity: 'info',
      });
    }
  }

  private async detectDuplicate(
    companyId: string,
    result: BillExtractionResult,
    vendorId?: string,
    warnings?: BillExtractionWarning[]
  ) {
    const invoiceNo = result.invoice.invoiceNumber.value?.trim();
    if (!invoiceNo) return null;

    // Search for existing purchase with matching reference or invoice number
    const existing = await this.prisma.purchase.findFirst({
      where: {
        companyId,
        deletedAt: null,
        OR: [
          { reference: { equals: invoiceNo, mode: 'insensitive' } },
          { purchaseNo: { equals: invoiceNo, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        purchaseNo: true,
        reference: true,
        date: true,
        businessPartnerId: true,
      },
    });

    if (existing) {
      const isSameVendor = vendorId && existing.businessPartnerId === vendorId;
      const formattedDate = existing.date ? existing.date.toISOString().split('T')[0] : '';

      warnings?.push({
        field: 'invoice.invoiceNumber',
        code: 'DUPLICATE_BILL',
        message: `Possible duplicate bill: Invoice #${invoiceNo} already exists in Bill Aura (Bill No: ${existing.purchaseNo}, Date: ${formattedDate}${isSameVendor ? ', same vendor' : ''}).`,
        severity: 'warning',
      });

      return {
        isPossibleDuplicate: true,
        existingBillId: existing.id,
        existingPurchaseNo: existing.purchaseNo,
        existingInvoiceNo: existing.reference || existing.purchaseNo,
        existingDate: formattedDate,
      };
    }

    return null;
  }

  private async validateTaxMode(
    companyId: string,
    result: BillExtractionResult,
    vendorState?: string,
    warnings?: BillExtractionWarning[]
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { state: true },
    });

    const companyState = company?.state?.trim().toLowerCase();
    const effectiveVendorState = (vendorState || result.vendor.state?.value || '').trim().toLowerCase();

    if (companyState && effectiveVendorState) {
      const isInterstate = companyState !== effectiveVendorState;
      const hasIgst = (result.taxes.igst.value || 0) > 0;
      const hasCgstSgst = (result.taxes.cgst.value || 0) > 0 || (result.taxes.sgst.value || 0) > 0;

      if (isInterstate && hasCgstSgst && !hasIgst) {
        warnings?.push({
          field: 'taxes',
          code: 'TAX_MISMATCH',
          message: `Company is in ${company?.state} and Vendor is in ${vendorState || result.vendor.state?.value} (Interstate transaction), but CGST/SGST was extracted instead of IGST. System will default to IGST.`,
          severity: 'info',
        });
      } else if (!isInterstate && hasIgst && !hasCgstSgst) {
        warnings?.push({
          field: 'taxes',
          code: 'TAX_MISMATCH',
          message: `Both Company and Vendor are in ${company?.state} (Intrastate transaction), but IGST was extracted. System will apply CGST + SGST.`,
          severity: 'info',
        });
      }
    }
  }

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate bigram Dice coefficient string similarity (0.0 to 1.0)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length < 2 || str2.length < 2) return 0.0;

    const getBigrams = (s: string) => {
      const bigrams = new Set<string>();
      for (let i = 0; i < s.length - 1; i++) {
        bigrams.add(s.substring(i, i + 2));
      }
      return bigrams;
    };

    const bigrams1 = getBigrams(str1);
    const bigrams2 = getBigrams(str2);

    let intersection = 0;
    for (const b of bigrams1) {
      if (bigrams2.has(b)) intersection++;
    }

    return (2.0 * intersection) / (bigrams1.size + bigrams2.size);
  }
}
