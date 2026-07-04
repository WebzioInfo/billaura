-- CreateIndex
CREATE INDEX "bank_accounts_companyId_deletedAt_idx" ON "bank_accounts"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "bank_transactions_companyId_date_idx" ON "bank_transactions"("companyId", "date");

-- CreateIndex
CREATE INDEX "branches_companyId_deletedAt_idx" ON "branches"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "business_partners_companyId_deletedAt_idx" ON "business_partners"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "cash_accounts_companyId_deletedAt_idx" ON "cash_accounts"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "contacts_companyId_deletedAt_idx" ON "contacts"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "employees_companyId_deletedAt_idx" ON "employees"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "expenses_companyId_deletedAt_idx" ON "expenses"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "expenses_companyId_date_idx" ON "expenses"("companyId", "date");

-- CreateIndex
CREATE INDEX "invoices_companyId_deletedAt_idx" ON "invoices"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "invoices_companyId_date_idx" ON "invoices"("companyId", "date");

-- CreateIndex
CREATE INDEX "invoices_companyId_status_idx" ON "invoices"("companyId", "status");

-- CreateIndex
CREATE INDEX "other_incomes_companyId_deletedAt_idx" ON "other_incomes"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "products_companyId_deletedAt_idx" ON "products"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "purchase_orders_companyId_deletedAt_idx" ON "purchase_orders"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "purchase_orders_companyId_status_idx" ON "purchase_orders"("companyId", "status");

-- CreateIndex
CREATE INDEX "purchases_companyId_deletedAt_idx" ON "purchases"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "purchases_companyId_date_idx" ON "purchases"("companyId", "date");

-- CreateIndex
CREATE INDEX "purchases_companyId_status_idx" ON "purchases"("companyId", "status");

-- CreateIndex
CREATE INDEX "quotations_companyId_deletedAt_idx" ON "quotations"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "quotations_companyId_status_idx" ON "quotations"("companyId", "status");

-- CreateIndex
CREATE INDEX "receipts_companyId_deletedAt_idx" ON "receipts"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "sales_orders_companyId_deletedAt_idx" ON "sales_orders"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "sales_orders_companyId_status_idx" ON "sales_orders"("companyId", "status");

-- CreateIndex
CREATE INDEX "stock_ledgers_companyId_date_idx" ON "stock_ledgers"("companyId", "date");

-- CreateIndex
CREATE INDEX "transaction_payments_companyId_deletedAt_idx" ON "transaction_payments"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "transaction_payments_companyId_date_idx" ON "transaction_payments"("companyId", "date");
