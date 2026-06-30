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
exports.TaxesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
const company_context_1 = require("../common/context/company-context");
let TaxesService = class TaxesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getGstr1() {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const invoices = await this.prisma.invoice.findMany({
            where: { companyId, deletedAt: null },
            include: { customer: true, items: { include: { product: true } } },
        });
        return invoices.map((inv) => ({
            invoiceNo: inv.invoiceNo,
            customerName: inv.customer?.name,
            gstin: inv.customer?.gstin || 'Unregistered',
            date: inv.date,
            taxableValue: Number(inv.subTotal),
            cgst: Number(inv.cgstAmount || 0),
            sgst: Number(inv.sgstAmount || 0),
            igst: Number(inv.igstAmount || 0),
            cess: Number(inv.cessAmount || 0),
            totalTax: Number(inv.totalTaxAmount || 0),
            totalValue: Number(inv.grandTotal),
        }));
    }
    async getGstr2() {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const purchases = await this.prisma.purchase.findMany({
            where: { companyId, deletedAt: null },
            include: { vendor: true, items: { include: { product: true } } },
        });
        return purchases.map((pur) => ({
            purchaseNo: pur.purchaseNo,
            vendorName: pur.vendor?.name,
            gstin: pur.vendor?.gstin || 'Unregistered',
            date: pur.date,
            taxableValue: Number(pur.subTotal),
            cgst: Number(pur.cgstAmount || 0),
            sgst: Number(pur.sgstAmount || 0),
            igst: Number(pur.igstAmount || 0),
            cess: Number(pur.cessAmount || 0),
            totalTax: Number(pur.totalTaxAmount || 0),
            totalValue: Number(pur.grandTotal),
        }));
    }
    async getTaxSummary() {
        const companyId = company_context_1.CompanyContext.getCompanyId();
        if (!companyId) {
            throw new common_1.ConflictException('Company context is required');
        }
        const [invoices, purchases] = await Promise.all([
            this.prisma.invoice.findMany({ where: { companyId, deletedAt: null } }),
            this.prisma.purchase.findMany({ where: { companyId, deletedAt: null } }),
        ]);
        let liabilityCgst = 0;
        let liabilitySgst = 0;
        let liabilityIgst = 0;
        let outwardTaxable = 0;
        invoices.forEach((inv) => {
            liabilityCgst += Number(inv.cgstAmount || 0);
            liabilitySgst += Number(inv.sgstAmount || 0);
            liabilityIgst += Number(inv.igstAmount || 0);
            outwardTaxable += Number(inv.subTotal);
        });
        let itcCgst = 0;
        let itcSgst = 0;
        let itcIgst = 0;
        let inwardTaxable = 0;
        purchases.forEach((pur) => {
            itcCgst += Number(pur.cgstAmount || 0);
            itcSgst += Number(pur.sgstAmount || 0);
            itcIgst += Number(pur.igstAmount || 0);
            inwardTaxable += Number(pur.subTotal);
        });
        const netCgst = liabilityCgst - itcCgst;
        const netSgst = liabilitySgst - itcSgst;
        const netIgst = liabilityIgst - itcIgst;
        return {
            outwardTaxable,
            inwardTaxable,
            liability: {
                cgst: liabilityCgst,
                sgst: liabilitySgst,
                igst: liabilityIgst,
                total: liabilityCgst + liabilitySgst + liabilityIgst,
            },
            itc: {
                cgst: itcCgst,
                sgst: itcSgst,
                igst: itcIgst,
                total: itcCgst + itcSgst + itcIgst,
            },
            netPayable: {
                cgst: netCgst,
                sgst: netSgst,
                igst: netIgst,
                total: netCgst + netSgst + netIgst,
            },
        };
    }
};
exports.TaxesService = TaxesService;
exports.TaxesService = TaxesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TaxesService);
//# sourceMappingURL=taxes.service.js.map