import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CommissionMethod, CommissionStatus, ReferralSourceType } from '@prisma/client';

export interface EvaluateCommissionDto {
  companyId: string;
  referenceType: string;
  referenceId: string;
  referralSourceType: ReferralSourceType;
  employeeId?: string;
  businessPartnerId?: string;
  baseAmount: number;
}

@Injectable()
export class CommissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRule(companyId: string, data: any) {
    return this.prisma.commissionRule.create({
      data: {
        ...data,
        companyId,
      },
    });
  }

  async getRules(companyId: string) {
    return this.prisma.commissionRule.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async evaluateCommission(data: EvaluateCommissionDto) {
    // Determine the active rule for this source type
    const rules = await this.prisma.commissionRule.findMany({
      where: {
        companyId: data.companyId,
        referralSourceType: data.referralSourceType,
        isActive: true,
      },
    });

    if (rules.length === 0) {
      return null; // No active commission rule
    }

    // Usually we might have more complex matching (e.g. by item category, by specific employee), 
    // but for now we take the first active rule for the given source type.
    const rule = rules[0];
    const baseAmount = Number(data.baseAmount);
    
    let commissionAmount = 0;

    switch (rule.commissionMethod) {
      case CommissionMethod.FIXED_AMOUNT:
        commissionAmount = Number(rule.commissionValue);
        break;
      case CommissionMethod.PERCENTAGE_BEFORE_TAX:
      case CommissionMethod.PERCENTAGE_AFTER_TAX:
        commissionAmount = (baseAmount * Number(rule.commissionValue)) / 100;
        break;
      case CommissionMethod.SLAB:
        // Future implementation
        break;
    }

    let tdsAmount = 0;
    if (rule.tdsApplicable && rule.tdsPercent) {
      tdsAmount = (commissionAmount * Number(rule.tdsPercent)) / 100;
    }

    const netPayable = commissionAmount - tdsAmount;

    // Create the commission record (but decouple it from the document via relation)
    // The document (Invoice/Quotation) will later be updated with this recordId
    const record = await this.prisma.commissionRecord.create({
      data: {
        companyId: data.companyId,
        ruleId: rule.id,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        referralSourceType: data.referralSourceType,
        employeeId: data.employeeId,
        businessPartnerId: data.businessPartnerId,
        baseAmount,
        commissionAmount,
        tdsAmount,
        netPayable,
        status: CommissionStatus.PENDING,
      },
    });

    return record;
  }

  async getRecords(companyId: string) {
    return this.prisma.commissionRecord.findMany({
      where: { companyId },
      include: {
        rule: true,
        employee: true,
        businessPartner: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRecordStatus(companyId: string, id: string, status: CommissionStatus) {
    // Verify ownership
    const record = await this.prisma.commissionRecord.findFirst({
      where: { id, companyId },
    });

    if (!record) {
      throw new NotFoundException('Commission record not found');
    }

    return this.prisma.commissionRecord.update({
      where: { id },
      data: { status },
    });
  }
}
