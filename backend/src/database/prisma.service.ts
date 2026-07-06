import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { CompanyContext } from "../common/context/company-context";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  private extendedClient: any;

  constructor(config: ConfigService) {
    const databaseUrl = config.getOrThrow<string>("DATABASE_URL");
    super({
      datasources: { db: { url: databaseUrl } },
      log:
        config.get<string>("NODE_ENV") === "development"
          ? ["query", "error", "warn"]
          : ["error", "warn"],
    });

    const globalModels = ['User', 'SystemSetting', 'SubscriptionPlan', 'Company', 'PaymentAllocation', 'PurchasePaymentAllocation', 'JournalLine', 'InvoiceItem', 'PurchaseItem', 'RolePermission', 'LoginHistory', 'QuotationItem', 'DeliveryNoteItem', 'PurchaseOrderItem', 'GoodsReceiptItem', 'RecurringInvoiceItem', 'SalesReturnItem', 'PurchaseReturnItem', 'ExpenseHistory', 'ExpenseComment', 'ExpenseAttachment', 'BOMItem', 'ReceiptAllocation', 'ReceiptAttachment', 'ReceiptAudit'];

    this.extendedClient = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }: any) {
            const companyId = CompanyContext.getCompanyId();

            if (companyId && !globalModels.includes(model)) {
              // Scope write operations
              if (operation === 'create') {
                args.data = args.data || {};
                args.data.companyId = companyId;
              } else if (operation === 'createMany') {
                if (args.data) {
                  if (Array.isArray(args.data)) {
                    args.data = args.data.map((item: any) => ({
                      ...item,
                      companyId,
                    }));
                  } else {
                    args.data.companyId = companyId;
                  }
                }
              }

              // Scope read/update/delete operations
              if (
                [
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
                ].includes(operation)
              ) {
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

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
