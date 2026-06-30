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
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const company_context_1 = require("../common/context/company-context");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    logger = new common_1.Logger(PrismaService_1.name);
    extendedClient;
    constructor(config) {
        const databaseUrl = config.getOrThrow("DATABASE_URL");
        super({
            datasources: { db: { url: databaseUrl } },
            log: config.get("NODE_ENV") === "development"
                ? ["query", "error", "warn"]
                : ["error", "warn"],
        });
        const globalModels = ['User', 'SystemSetting', 'SubscriptionPlan', 'Company', 'PaymentAllocation', 'PurchasePaymentAllocation', 'JournalEntryLine', 'InvoiceItem', 'PurchaseItem'];
        this.extendedClient = this.$extends({
            query: {
                $allModels: {
                    async $allOperations({ model, operation, args, query }) {
                        const companyId = company_context_1.CompanyContext.getCompanyId();
                        if (companyId && !globalModels.includes(model)) {
                            if (operation === 'create') {
                                args.data = args.data || {};
                                args.data.companyId = companyId;
                            }
                            else if (operation === 'createMany') {
                                if (args.data) {
                                    if (Array.isArray(args.data)) {
                                        args.data = args.data.map((item) => ({
                                            ...item,
                                            companyId,
                                        }));
                                    }
                                    else {
                                        args.data.companyId = companyId;
                                    }
                                }
                            }
                            if ([
                                'findUnique',
                                'findFirst',
                                'findMany',
                                'count',
                                'aggregate',
                                'groupBy',
                                'update',
                                'updateMany',
                                'delete',
                                'deleteMany',
                            ].includes(operation)) {
                                args.where = args.where || {};
                                args.where.companyId = companyId;
                            }
                        }
                        return query(args);
                    },
                },
            },
        });
        return new Proxy(this, {
            get(target, prop, receiver) {
                if (prop in target.extendedClient) {
                    const val = target.extendedClient[prop];
                    if (typeof val === 'function') {
                        return val.bind(target.extendedClient);
                    }
                    return val;
                }
                const val = Reflect.get(target, prop, receiver);
                if (typeof val === 'function') {
                    return val.bind(target);
                }
                return val;
            },
        });
    }
    async onModuleInit() {
        await this.$connect();
        this.logger.log("Prisma connected");
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map