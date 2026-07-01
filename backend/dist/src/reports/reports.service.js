"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async generateProfitLoss(companyId, startDate, endDate) {
        if (!companyId)
            throw new common_1.BadRequestException('Company ID is required');
        const rawBalances = await this.prisma.$queryRaw `
      SELECT 
        a.id as accountId,
        a.name as accountName,
        a.category as category,
        a.subCategory as subCategory,
        SUM(l.debit) as totalDebit,
        SUM(l.credit) as totalCredit
      FROM journal_lines l
      JOIN journal_entries je ON l.journalEntryId = je.id
      JOIN accounts a ON l.accountId = a.id
      WHERE je.companyId = ${companyId}
        AND je.date >= ${startDate}
        AND je.date <= ${endDate}
        AND a.category IN ('REVENUE', 'EXPENSE')
      GROUP BY a.id, a.name, a.category, a.subCategory
    `;
        const pnl = {
            revenue: {
                salesRevenue: [],
                serviceRevenue: [],
                otherIncome: [],
                grossRevenue: 0,
            },
            less: {
                salesReturns: [],
                salesDiscounts: [],
                totalDeductions: 0,
            },
            netRevenue: 0,
            cogs: {
                items: [],
                total: 0,
            },
            grossProfit: 0,
            operatingExpenses: {
                items: [],
                total: 0,
            },
            operatingProfit: 0,
            otherIncome: {
                items: [],
                total: 0,
            },
            otherExpenses: {
                items: [],
                total: 0,
            },
            netProfit: 0,
        };
        for (const row of rawBalances) {
            const debit = Number(row.totalDebit || 0);
            const credit = Number(row.totalCredit || 0);
            const isRevenue = row.category === 'REVENUE';
            const balance = isRevenue ? (credit - debit) : (debit - credit);
            const accountItem = {
                id: row.accountId,
                name: row.accountName,
                balance,
            };
            switch (row.subCategory) {
                case 'SALES_REVENUE':
                    pnl.revenue.salesRevenue.push(accountItem);
                    pnl.revenue.grossRevenue += balance;
                    break;
                case 'SERVICE_REVENUE':
                    pnl.revenue.serviceRevenue.push(accountItem);
                    pnl.revenue.grossRevenue += balance;
                    break;
                case 'SALES_RETURNS':
                    pnl.less.salesReturns.push(accountItem);
                    pnl.less.totalDeductions += Math.abs(balance);
                    break;
                case 'SALES_DISCOUNTS':
                    pnl.less.salesDiscounts.push(accountItem);
                    pnl.less.totalDeductions += Math.abs(balance);
                    break;
                case 'COGS':
                    pnl.cogs.items.push(accountItem);
                    pnl.cogs.total += balance;
                    break;
                case 'OPERATING_EXPENSE':
                    pnl.operatingExpenses.items.push(accountItem);
                    pnl.operatingExpenses.total += balance;
                    break;
                case 'OTHER_INCOME':
                    pnl.otherIncome.items.push(accountItem);
                    pnl.otherIncome.total += balance;
                    break;
                case 'OTHER_EXPENSE':
                    pnl.otherExpenses.items.push(accountItem);
                    pnl.otherExpenses.total += balance;
                    break;
                default:
                    if (isRevenue) {
                        pnl.revenue.otherIncome.push(accountItem);
                        pnl.revenue.grossRevenue += balance;
                    }
                    else {
                        pnl.operatingExpenses.items.push(accountItem);
                        pnl.operatingExpenses.total += balance;
                    }
            }
        }
        pnl.netRevenue = pnl.revenue.grossRevenue - pnl.less.totalDeductions;
        pnl.grossProfit = pnl.netRevenue - pnl.cogs.total;
        pnl.operatingProfit = pnl.grossProfit - pnl.operatingExpenses.total;
        pnl.netProfit = pnl.operatingProfit + pnl.otherIncome.total - pnl.otherExpenses.total;
        const margins = {
            grossMarginPct: pnl.netRevenue > 0 ? (pnl.grossProfit / pnl.netRevenue) * 100 : 0,
            netMarginPct: pnl.netRevenue > 0 ? (pnl.netProfit / pnl.netRevenue) * 100 : 0,
            expenseRatioPct: pnl.netRevenue > 0 ? (pnl.operatingExpenses.total / pnl.netRevenue) * 100 : 0,
        };
        return {
            period: { startDate, endDate },
            statement: pnl,
            kpis: {
                totalRevenue: pnl.netRevenue,
                grossProfit: pnl.grossProfit,
                operatingExpense: pnl.operatingExpenses.total,
                operatingProfit: pnl.operatingProfit,
                netProfit: pnl.netProfit,
                ...margins,
            }
        };
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map