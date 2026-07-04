import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CompanyContext } from '../common/context/company-context';

@Injectable()
export class ReconciliationService {
  constructor(private prisma: PrismaService) {}

  async findAllStatements() {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    return this.prisma.bankStatement.findMany({
      where: {},
      include: { bankAccount: true },
      orderBy: { statementDate: 'desc' },
    });
  }

  async getStatementLines(statementId: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');
    return this.prisma.bankStatementLine.findMany({
      where: { 
        statementId,
        statement: { companyId }
      },
      include: { matchedTransaction: true },
      orderBy: { date: 'asc' },
    });
  }

  async autoReconcile(statementId: string) {
    const companyId = CompanyContext.getCompanyId();
    if (!companyId) throw new NotFoundException('Company context required');

    const statement = await this.prisma.bankStatement.findUnique({
      where: { id: statementId, companyId },
      include: { lines: { where: { status: 'UNMATCHED' } } }
    });

    if (!statement) throw new NotFoundException('Statement not found');

    let matchedCount = 0;
    // Basic auto-match algorithm: match by exact amount and date +/- 1 day
    for (const line of statement.lines) {
      const startDate = new Date(line.date);
      startDate.setDate(startDate.getDate() - 1);
      
      const endDate = new Date(line.date);
      endDate.setDate(endDate.getDate() + 1);

      const potentialMatch = await this.prisma.bankTransaction.findFirst({
        where: {
          companyId,
          bankAccountId: statement.bankAccountId,
          isReconciled: false,
          amount: line.amount,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      if (potentialMatch) {
        // Perform matching
        await this.prisma.$transaction([
          this.prisma.bankStatementLine.update({
            where: { id: line.id },
            data: { status: 'MATCHED', matchedTransactionId: potentialMatch.id }
          }),
          this.prisma.bankTransaction.update({
            where: { id: potentialMatch.id },
            data: { isReconciled: true }
          })
        ]);
        matchedCount++;
      }
    }

    return { matchedCount };
  }
}
