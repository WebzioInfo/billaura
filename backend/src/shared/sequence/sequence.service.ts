import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SequenceService {
  constructor(private prisma: PrismaService) {}

  async generateNextSequence(companyId: string, documentType: string): Promise<string> {
    const seq = await this.prisma.documentSequence.findUnique({
      where: {
        companyId_documentType: {
          companyId,
          documentType,
        }
      }
    });

    if (!seq) {
      // Default fallback if no sequence config exists
      const newSeq = await this.prisma.documentSequence.create({
        data: {
          companyId,
          documentType,
          currentNumber: 1,
          prefix: documentType.substring(0, 3).toUpperCase() + '-',
          sequenceType: 'SEQUENTIAL',
          padding: 6,
        }
      });
      return this.formatSequence(newSeq.currentNumber, newSeq.prefix, newSeq.suffix, newSeq.padding, newSeq.sequenceType);
    }

    // Update and get next
    const updated = await this.prisma.documentSequence.update({
      where: { id: seq.id },
      data: {
        currentNumber: { increment: 1 }
      }
    });

    return this.formatSequence(updated.currentNumber, updated.prefix, updated.suffix, updated.padding, updated.sequenceType);
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

  private formatSequence(num: number, prefix: string | null, suffix: string | null, padding: number, type: string): string {
    if (type === 'RANDOM') {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < padding; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return `${prefix || ''}${result}${suffix || ''}`;
    }

    // SEQUENTIAL
    const numStr = num.toString().padStart(padding, '0');
    return `${prefix || ''}${numStr}${suffix || ''}`;
  }
}
