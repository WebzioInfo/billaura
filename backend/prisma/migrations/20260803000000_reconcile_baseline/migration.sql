-- AlterEnum
BEGIN;
CREATE TYPE "DocumentStatus_new" AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'ACCEPTED', 'REJECTED', 'CONVERTED');
ALTER TABLE "public"."delivery_notes" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."goods_receipts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."invoices" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."other_incomes" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."purchase_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."purchases" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."quotations" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."sales_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TABLE "quotations" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TABLE "delivery_notes" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TABLE "purchases" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TABLE "purchase_orders" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TABLE "goods_receipts" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TABLE "other_incomes" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TABLE "sales_orders" ALTER COLUMN "status" TYPE "DocumentStatus_new" USING ("status"::text::"DocumentStatus_new");
ALTER TYPE "DocumentStatus" RENAME TO "DocumentStatus_old";
ALTER TYPE "DocumentStatus_new" RENAME TO "DocumentStatus";
DROP TYPE "public"."DocumentStatus_old";
ALTER TABLE "delivery_notes" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "goods_receipts" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "invoices" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "other_incomes" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "purchase_orders" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "purchases" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "quotations" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "sales_orders" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "business_partners" DROP COLUMN "totalOverdue";

-- AlterTable
ALTER TABLE "company_settings" DROP COLUMN "companySealUrl",
DROP COLUMN "digitalSignatureUrl",
DROP COLUMN "invoiceConfig";

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "outstandingAmount";

