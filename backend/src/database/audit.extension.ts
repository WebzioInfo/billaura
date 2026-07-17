import { Prisma } from '@prisma/client';
import { CompanyContext } from '../common/context/company-context';

export const auditExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    name: 'audit-extension',
    query: {
      $allModels: {
        async delete({ model, operation, args, query }) {
          const companyId = CompanyContext.getCompanyId();
          const userId = CompanyContext.getUserId();
          
          if (!companyId || !userId) {
            return query(args);
          }

          const skipModels = ['AuditLog', 'BackupAuditLog', 'LoginHistory', 'SystemSetting', 'Company', 'User'];
          if (skipModels.includes(model)) {
            return query(args);
          }

          // Fetch the record before deleting
          const record = await (client as any)[model].findUnique({
             where: args.where
          });

          // Perform deletion
          const result = await query(args);

          // Log the deletion
          if (record) {
            try {
              await (client as any).auditLog.create({
                data: {
                  companyId,
                  userId,
                  action: 'DELETE',
                  tableName: model,
                  oldValues: record as any
                }
              });
            } catch (err) {
              console.error(`Failed to create audit log for ${model} deletion`, err);
            }
          }

          return result;
        },
        async deleteMany({ model, operation, args, query }) {
          const companyId = CompanyContext.getCompanyId();
          const userId = CompanyContext.getUserId();
          
          if (!companyId || !userId) {
            return query(args);
          }

          const skipModels = ['AuditLog', 'BackupAuditLog', 'LoginHistory', 'SystemSetting', 'Company', 'User'];
          if (skipModels.includes(model)) {
            return query(args);
          }

          // Fetch records before deleting
          const records = await (client as any)[model].findMany({
             where: args.where
          });

          // Perform deletion
          const result = await query(args);

          if (records && records.length > 0) {
            try {
              const auditLogs = records.map((record: any) => ({
                  companyId,
                  userId,
                  action: 'DELETE',
                  tableName: model,
                  oldValues: record as any
              }));
              await (client as any).auditLog.createMany({
                 data: auditLogs
              });
            } catch (err) {
              console.error(`Failed to create bulk audit log for ${model} deletion`, err);
            }
          }

          return result;
        }
      }
    }
  });
});
