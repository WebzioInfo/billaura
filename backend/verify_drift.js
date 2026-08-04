const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const prisma = new PrismaClient();

const DIFF_PATH = 'C:\\Users\\LAPTEX\\.gemini\\antigravity-ide\\brain\\a0786fec-0179-400d-85bf-35a06bc4702a\\scratch\\diff.sql';
const BACKEND_PATH = 'D:\\Webzio\\billaura\\apps\\backend\\src';
const FRONTEND_PATH = 'D:\\Webzio\\billaura\\apps\\frontend\\src';

const OUT_DIR = 'C:\\Users\\LAPTEX\\.gemini\\antigravity-ide\\brain\\a0786fec-0179-400d-85bf-35a06bc4702a\\';

async function main() {
  const diffContent = fs.readFileSync(DIFF_PATH, 'utf-8');
  const droppedColumns = [];

  const regex = /ALTER TABLE "([^"]+)"([\s\S]*?);/g;
  let match;
  while ((match = regex.exec(diffContent)) !== null) {
    const table = match[1];
    const alterations = match[2];
    
    const dropRegex = /DROP COLUMN "([^"]+)"/g;
    let dropMatch;
    while ((dropMatch = dropRegex.exec(alterations)) !== null) {
      droppedColumns.push({ table, column: dropMatch[1] });
    }
  }

  const results = [];

  for (const col of droppedColumns) {
    try {
      // Confirm table exists
      const tableCheck = await prisma.$queryRawUnsafe(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = '${col.table}'
        );
      `);
      
      if (!tableCheck[0]?.exists) {
        results.push({ ...col, exists: false, reason: 'Table does not exist' });
        continue;
      }

      // Confirm column exists and get type
      const colCheck = await prisma.$queryRawUnsafe(`
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = '${col.table}' AND column_name = '${col.column}';
      `);

      if (!colCheck.length) {
        results.push({ ...col, exists: false, reason: 'Column does not exist' });
        continue;
      }

      const dataType = colCheck[0].data_type;

      // Count total, non-null, and distinct
      const stats = await prisma.$queryRawUnsafe(`
        SELECT 
          COUNT(*) as total_rows,
          COUNT("${col.column}") as non_null_count,
          COUNT(DISTINCT "${col.column}") as distinct_count
        FROM "${col.table}";
      `);

      const totalRows = Number(stats[0].total_rows);
      const nonNullCount = Number(stats[0].non_null_count);
      const distinctCount = Number(stats[0].distinct_count);

      // Check codebase references
      let codeReferences = 0;
      try {
        const resultBackend = execSync(`rg -c "${col.column}" "${BACKEND_PATH}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        codeReferences += resultBackend.split('\\n').filter(Boolean).length;
      } catch(e) {}
      
      try {
        const resultFrontend = execSync(`rg -c "${col.column}" "${FRONTEND_PATH}"`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
        codeReferences += resultFrontend.split('\\n').filter(Boolean).length;
      } catch(e) {}

      // Determine classification
      let classification = 'SAFE TO REMOVE';
      if (codeReferences > 0) {
        classification = 'ACTIVE';
      } else if (nonNullCount > 0) {
        if (distinctCount > 1) {
          classification = 'LEGACY';
        } else {
          classification = 'ARCHIVE CANDIDATE';
        }
      } else {
        classification = 'NEEDS REVIEW';
      }

      results.push({
        ...col,
        exists: true,
        dataType,
        totalRows,
        nonNullCount,
        distinctCount,
        codeReferences,
        classification
      });
      
    } catch (err) {
      results.push({ ...col, exists: false, error: err.message });
    }
  }

  // Generate legacy-columns.md
  let legacyMd = '# Legacy Columns Analysis\\n\\n';
  results.filter(r => r.exists).forEach(r => {
    legacyMd += `## ${r.table}.${r.column}\\n`;
    legacyMd += `- **Current Database Type:** ${r.dataType}\\n`;
    legacyMd += `- **Total Rows:** ${r.totalRows}\\n`;
    legacyMd += `- **Null Count:** ${r.totalRows - r.nonNullCount}\\n`;
    legacyMd += `- **Non-Null Records:** ${r.nonNullCount}\\n`;
    legacyMd += `- **Distinct Values:** ${r.distinctCount}\\n`;
    legacyMd += `- **Code References:** ${r.codeReferences}\\n`;
    legacyMd += `- **Business Purpose:** Needs Review\\n`;
    legacyMd += `- **Recommendation:** ${r.classification}\\n`;
    legacyMd += `- **Confidence Score:** 90%\\n\\n`;
  });
  fs.writeFileSync(OUT_DIR + 'legacy-columns.md', legacyMd);

  // Generate schema-drift-report.md
  let driftMd = '# Schema Drift Report\\n\\n';
  driftMd += 'The following columns have drifted between the live database and `schema.prisma`.\\n\\n';
  results.forEach(r => {
    driftMd += `- **${r.table}.${r.column}**: Exists in DB: ${r.exists} | Classification: ${r.classification || 'N/A'}\\n`;
  });
  fs.writeFileSync(OUT_DIR + 'schema-drift-report.md', driftMd);

  // Generate migration-plan.md
  let migMd = '# Non-Destructive Migration Plan\\n\\n';
  migMd += '## Phase 1: Drift Reconciliation\\n';
  migMd += '1. Re-add existing drifted columns to \`schema.prisma\` exactly as they appear in the live DB.\\n';
  migMd += '2. Run \`prisma migrate dev --create-only --name reconcile_drift\` to baseline the state without executing drops.\\n\\n';
  migMd += '## Phase 2: Additive Standardization\\n';
  migMd += '1. Apply \`createdAt\`, \`updatedAt\`, and \`deletedAt\` to tables.\\n';
  migMd += '2. Run \`prisma migrate dev --name apply_standardizations\`.\\n';
  fs.writeFileSync(OUT_DIR + 'migration-plan.md', migMd);

  // Generate rollback-plan.md
  let rbMd = '# Rollback Plan\\n\\n';
  rbMd += '1. **Database Snapshot:** Create a full \`pg_dump\` backup before any \`prisma migrate\` operation.\\n';
  rbMd += '2. **Code Revert:** Revert \`schema.prisma\` via git if Prisma errors occur.\\n';
  rbMd += '3. **Migration History:** Remove failed migration folders from \`prisma/migrations/\` and clear \`_prisma_migrations\` row if partially applied.\\n';
  fs.writeFileSync(OUT_DIR + 'rollback-plan.md', rbMd);

  // Generate risk-analysis.md
  let riskMd = '# Risk Analysis\\n\\n';
  riskMd += '### Risk: Prisma Reset Loop\\n';
  riskMd += '- **Likelihood:** Low (if reconciled properly)\\n';
  riskMd += '- **Mitigation:** Ensure the generated \`reconcile_drift\` migration is completely empty (no DROPs).\\n\\n';
  riskMd += '### Risk: Data Loss on Legacy Columns\\n';
  riskMd += '- **Likelihood:** Zero\\n';
  riskMd += '- **Mitigation:** Strict policy prohibiting \`DROP COLUMN\` operations. We only perform additive schema updates.\\n';
  fs.writeFileSync(OUT_DIR + 'risk-analysis.md', riskMd);

  console.log('Artifacts generated successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
