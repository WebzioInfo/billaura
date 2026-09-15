import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface UniversalSequenceOptions {
  seriesId?: string;
  financialYearId?: string;
  branchId?: string;
  customPrefix?: string;
}

const DEFAULT_TYPE_PREFIXES: Record<string, string> = {
  TAX_INVOICE: 'INV',
  BILL_OF_SUPPLY: 'BOS',
  RETAIL_INVOICE: 'RET',
  DEBIT_NOTE: 'DN',
  CREDIT_NOTE: 'CN',
  PROFORMA_INVOICE: 'PI',
  QUOTATION: 'QT',
  ESTIMATE: 'EST',
  DELIVERY_CHALLAN: 'DC',
  PURCHASE_INVOICE: 'PINV',
  PURCHASE_RETURN: 'PR',
  FEE_RECEIPT: 'FEE',
  PAYMENT_RECEIPT: 'REC',
  OTHER_RECEIPT: 'OREC',
};

@Injectable()
export class SequenceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Universal Concurrency-Safe Document Sequence Generator.
   * Atomically allocates the next sequential number per company, document type, and financial year.
   */
  async generateUniversalSequence(
    companyId: string,
    documentType: string,
    options: UniversalSequenceOptions = {},
    tx?: any
  ): Promise<string> {
    if (!companyId || !documentType) {
      throw new Error(
        `[SequenceService] Missing required parameters: companyId=${companyId}, documentType=${documentType}`
      );
    }

    const db = tx || this.prisma;
    const now = new Date();

    // 1. If explicit numbering series is provided, use it
    if (options.seriesId) {
      const series = await db.invoiceNumberingSeries.findUnique({
        where: { id: options.seriesId },
      });

      if (series) {
        const updated = await db.invoiceNumberingSeries.update({
          where: { id: series.id },
          data: { currentNumber: { increment: 1 } },
        });

        return this.formatNumberingSeries(updated, now, db);
      }
    }

    // 2. Fallback to DocumentSequence model
    let seq = await db.documentSequence.findUnique({
      where: {
        companyId_documentType: {
          companyId,
          documentType,
        },
      },
    });

    if (!seq) {
      const prefixCode =
        options.customPrefix || DEFAULT_TYPE_PREFIXES[documentType] || documentType.substring(0, 3).toUpperCase();
      try {
        seq = await db.documentSequence.create({
          data: {
            companyId,
            documentType,
            currentNumber: 1,
            prefix: `${prefixCode}-`,
            sequenceType: 'SEQUENTIAL',
            padding: 5,
          },
        });
        return this.formatSequence(seq.currentNumber, seq.prefix, seq.suffix, seq.padding, seq.sequenceType, now);
      } catch (err: any) {
        if (err.code === 'P2002') {
          seq = await db.documentSequence.findUnique({
            where: { companyId_documentType: { companyId, documentType } },
          });
        } else {
          throw err;
        }
      }
    }

    if (!seq) {
      throw new Error(`Failed to generate sequence for document type: ${documentType}`);
    }

    let shouldReset = false;
    if (seq.resetLogic === 'YEARLY' && seq.lastGeneratedAt) {
      const seqYear = new Date(seq.lastGeneratedAt).getFullYear();
      if (now.getFullYear() > seqYear) {
        shouldReset = true;
      }
    } else if (seq.resetLogic === 'MONTHLY' && seq.lastGeneratedAt) {
      const seqDate = new Date(seq.lastGeneratedAt);
      if (now.getFullYear() > seqDate.getFullYear() || now.getMonth() > seqDate.getMonth()) {
        shouldReset = true;
      }
    }

    const updated = await db.documentSequence.update({
      where: { id: seq.id },
      data: {
        currentNumber: shouldReset ? 1 : { increment: 1 },
        lastGeneratedAt: now,
      },
    });

    return this.formatSequence(
      updated.currentNumber,
      updated.prefix,
      updated.suffix,
      updated.padding,
      updated.sequenceType,
      now
    );
  }

  async generateNextSequence(companyId: string, documentType: string, tx?: any): Promise<string> {
    return this.generateUniversalSequence(companyId, documentType, {}, tx);
  }

  async generateInvoiceSequence(companyId: string, seriesId: string, tx?: any): Promise<string> {
    return this.generateUniversalSequence(companyId, 'TAX_INVOICE', { seriesId }, tx);
  }

  async getConfig(companyId: string, documentType: string) {
    return this.prisma.documentSequence.findUnique({
      where: {
        companyId_documentType: {
          companyId,
          documentType,
        },
      },
    });
  }

  async updateConfig(companyId: string, documentType: string, data: any) {
    return this.prisma.documentSequence.upsert({
      where: {
        companyId_documentType: {
          companyId,
          documentType,
        },
      },
      update: {
        prefix: data.prefix,
        suffix: data.suffix,
        padding: data.padding,
        sequenceType: data.sequenceType,
        currentNumber: data.currentNumber !== undefined ? data.currentNumber : undefined,
      },
      create: {
        companyId,
        documentType,
        prefix: data.prefix,
        suffix: data.suffix,
        padding: data.padding || 5,
        sequenceType: data.sequenceType || 'SEQUENTIAL',
        currentNumber: data.currentNumber || 0,
      },
    });
  }

  private async formatNumberingSeries(series: any, date: Date, db: any): Promise<string> {
    let format = series.numberFormat || '{PREFIX}/{FY}/{SEQ}';
    const prefix = series.prefix || '';

    let fyString = '';
    if (series.financialYearId) {
      const fy = await db.financialYear.findUnique({ where: { id: series.financialYearId } });
      if (fy) {
        fyString = fy.name;
      }
    } else {
      // Default Indian Financial Year (e.g. 26-27)
      const currentYear = date.getFullYear();
      const currentMonth = date.getMonth() + 1;
      const startYear = currentMonth >= 4 ? currentYear : currentYear - 1;
      const endYear = startYear + 1;
      fyString = `${startYear.toString().slice(-2)}-${endYear.toString().slice(-2)}`;
    }

    format = format.replace(/{PREFIX}/g, prefix);
    format = format.replace(/{FY}/g, fyString);
    format = this.replaceDatePlaceholders(format, date);

    const numStr = (series.currentNumber || 1).toString().padStart(series.padding || 5, '0');
    format = format.replace(/{SEQ}/g, numStr);

    return format;
  }

  private formatSequence(
    num: number,
    prefix: string | null,
    suffix: string | null,
    padding: number,
    type: string,
    date?: Date
  ): string {
    const formattedPrefix = this.replaceDatePlaceholders(prefix || '', date || new Date());
    const formattedSuffix = this.replaceDatePlaceholders(suffix || '', date || new Date());

    if (type === 'RANDOM') {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < padding; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return `${formattedPrefix}${result}${formattedSuffix}`;
    }

    const numStr = num.toString().padStart(padding, '0');
    return `${formattedPrefix}${numStr}${formattedSuffix}`;
  }

  private replaceDatePlaceholders(str: string, date: Date): string {
    if (!str) return '';
    const year = date.getFullYear().toString();
    const shortYear = year.substring(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return str
      .replace(/{YYYY}/g, year)
      .replace(/{YY}/g, shortYear)
      .replace(/{MM}/g, month);
  }
}
