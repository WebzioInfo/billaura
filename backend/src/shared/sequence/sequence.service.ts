import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SequenceService {
  constructor(private prisma: PrismaService) {}

  async generateNextSequence(companyId: string, documentType: string, tx?: any): Promise<string> {
    if (!companyId || !documentType) {
      throw new Error(`[SequenceService] Missing required arguments: companyId=${companyId}, documentType=${documentType}`);
    }
    const db = tx || this.prisma;
    const now = new Date();

    let seq = await db.documentSequence.findUnique({
      where: {
        companyId_documentType: {
          companyId,
          documentType,
        }
      }
    });

    if (!seq) {
      try {
        seq = await db.documentSequence.create({
          data: {
            companyId,
            documentType,
            currentNumber: 1,
            prefix: documentType.substring(0, 3).toUpperCase() + '-',
            sequenceType: 'SEQUENTIAL',
            padding: 6,
          }
        });
        return this.formatSequence(seq.currentNumber, seq.prefix, seq.suffix, seq.padding, seq.sequenceType);
      } catch (err: any) {
        if (err.code === 'P2002') {
          seq = await db.documentSequence.findUnique({
            where: { companyId_documentType: { companyId, documentType } }
          });
        } else {
          throw err;
        }
      }
    }

    if (!seq) {
      throw new Error('Failed to generate sequence');
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
        lastGeneratedAt: now
      }
    });

    return this.formatSequence(updated.currentNumber, updated.prefix, updated.suffix, updated.padding, updated.sequenceType, now);
  }

  async getConfig(companyId: string, documentType: string) {
    return this.prisma.documentSequence.findUnique({
      where: {
        companyId_documentType: {
          companyId,
          documentType,
        }
      }
    });
  }

  async updateConfig(companyId: string, documentType: string, data: any) {
    return this.prisma.documentSequence.upsert({
      where: {
        companyId_documentType: {
          companyId,
          documentType,
        }
      },
      update: {
        prefix: data.prefix,
        suffix: data.suffix,
        padding: data.padding,
        sequenceType: data.sequenceType,
        currentNumber: data.currentNumber !== undefined ? data.currentNumber : undefined
      },
      create: {
        companyId,
        documentType,
        prefix: data.prefix,
        suffix: data.suffix,
        padding: data.padding || 6,
        sequenceType: data.sequenceType || 'SEQUENTIAL',
        currentNumber: data.currentNumber || 0
      }
    });
  }

  private formatSequence(num: number, prefix: string | null, suffix: string | null, padding: number, type: string, date?: Date): string {
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

    // SEQUENTIAL
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
