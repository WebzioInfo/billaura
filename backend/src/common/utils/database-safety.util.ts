import { URL } from 'url';

export type DatabaseEnvironment = 'development' | 'test' | 'staging' | 'production' | 'unknown';

export interface DatabaseTargetDetails {
  environment: DatabaseEnvironment;
  host: string;
  databaseName: string;
  isProduction: boolean;
  reason: string;
}

export interface OperationSafetyOptions {
  allowTestEnv?: boolean;
  allowDevEnv?: boolean;
  requireConfirmationToken?: boolean;
}

const KNOWN_PRODUCTION_HOST_PATTERNS = [
  'prisma.io',
  'neon.tech',
  'supabase.co',
  'rds.amazonaws.com',
  'azure.com',
  'elephantsql.com',
  'render.com',
  'fly.dev',
  'cockroachlabs.cloud',
  'billaura-prod',
  'production',
];

const KNOWN_PRODUCTION_DB_NAMES = [
  'billaura_prod',
  'billaura_production',
  'production',
  'prod_db',
  'postgres_prod',
];

/**
 * Classifies the current environment based on NODE_ENV and DATABASE_ENV.
 */
export function classifyEnvironment(): DatabaseEnvironment {
  const env = (process.env.DATABASE_ENV || process.env.NODE_ENV || 'unknown').toLowerCase();

  if (env === 'production' || env === 'prod') {
    return 'production';
  }
  if (env === 'staging' || env === 'stage') {
    return 'staging';
  }
  if (env === 'test' || env === 'testing') {
    return 'test';
  }
  if (env === 'development' || env === 'dev') {
    return 'development';
  }

  return 'unknown';
}

/**
 * Parses and analyzes the DATABASE_URL to detect if it targets a production database.
 */
export function analyzeDatabaseTarget(databaseUrl?: string): DatabaseTargetDetails {
  const env = classifyEnvironment();
  const urlString = databaseUrl || process.env.DATABASE_URL || '';

  if (!urlString) {
    return {
      environment: env,
      host: 'unknown',
      databaseName: 'unknown',
      isProduction: true, // Fail closed if URL is missing
      reason: 'No DATABASE_URL configured',
    };
  }

  let host = 'unknown';
  let databaseName = 'unknown';

  try {
    const parsed = new URL(urlString.startsWith('postgres') ? urlString : `postgres://${urlString}`);
    host = parsed.hostname || 'unknown';
    databaseName = parsed.pathname.replace(/^\//, '') || 'unknown';
  } catch {
    // If parsing fails, extract host/dbname heuristically
    const hostMatch = urlString.match(/@([^/:]+)/);
    if (hostMatch) host = hostMatch[1];
    const dbMatch = urlString.match(/\/([^?#]+)/);
    if (dbMatch) databaseName = dbMatch[1];
  }

  // Check explicitly configured protected hosts/names
  const protectedHosts = (process.env.PROTECTED_DATABASE_HOSTS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const protectedNames = (process.env.PROTECTED_DATABASE_NAMES || '')
    .split(',')
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);

  const lowerHost = host.toLowerCase();
  const lowerDb = databaseName.toLowerCase();

  let isProduction = false;
  let reason = 'Target appears safe for non-production operations';

  if (env === 'production') {
    isProduction = true;
    reason = 'Environment is explicitly set to production (NODE_ENV / DATABASE_ENV)';
  } else if (protectedHosts.some((ph) => lowerHost.includes(ph))) {
    isProduction = true;
    reason = `Database host (${host}) matches configured PROTECTED_DATABASE_HOSTS`;
  } else if (protectedNames.some((pn) => lowerDb === pn)) {
    isProduction = true;
    reason = `Database name (${databaseName}) matches configured PROTECTED_DATABASE_NAMES`;
  } else if (KNOWN_PRODUCTION_HOST_PATTERNS.some((pattern) => lowerHost.includes(pattern))) {
    isProduction = true;
    reason = `Database host (${host}) matches known production infrastructure pattern`;
  } else if (KNOWN_PRODUCTION_DB_NAMES.some((name) => lowerDb === name)) {
    isProduction = true;
    reason = `Database name (${databaseName}) matches known production database name`;
  } else if (env === 'unknown') {
    isProduction = true;
    reason = 'Environment classification is unknown (fail closed)';
  }

  return {
    environment: env,
    host,
    databaseName,
    isProduction,
    reason,
  };
}

const REQUIRED_RESET_CONFIRMATION = 'I_UNDERSTAND_DATA_WILL_BE_DELETED';

/**
 * Asserts that a database operation is safe to execute.
 * Throws an Error and logs diagnostic info if unsafe.
 */
export function assertSafeDatabaseOperation(
  operationName: string,
  options: OperationSafetyOptions = {}
): DatabaseTargetDetails {
  const analysis = analyzeDatabaseTarget();

  if (analysis.isProduction) {
    const errorMsg = `
================================================================================
[DATABASE SAFETY BLOCK]
Operation: "${operationName}"
DESTRUCTIVE / DANGEROUS DATABASE OPERATION BLOCKED!

Target Environment: ${analysis.environment.toUpperCase()}
Target Host:        ${analysis.host}
Target Database:    ${analysis.databaseName}
Reason:             ${analysis.reason}

PROTECTION RULE VIOLATION:
Destructive database operations, schema resets, truncates, or demo data seeds
are strictly prohibited on production database targets.
================================================================================
`;
    console.error(errorMsg);
    throw new Error(`DatabaseSafetyError: Operation "${operationName}" blocked on production database.`);
  }

  if (options.requireConfirmationToken) {
    const confirmation = process.env.DATABASE_RESET_CONFIRM;
    if (confirmation !== REQUIRED_RESET_CONFIRMATION) {
      const confirmationMsg = `
================================================================================
[DATABASE SAFETY BLOCK]
Operation: "${operationName}"
MISSING EXPLICIT DESTRUCTIVE CONFIRMATION TOKEN!

Target Host:     ${analysis.host}
Target Database: ${analysis.databaseName}

To perform this reset in development/test, set the exact environment variable:
DATABASE_RESET_CONFIRM="${REQUIRED_RESET_CONFIRMATION}"
================================================================================
`;
      console.error(confirmationMsg);
      throw new Error(
        `DatabaseSafetyError: Confirmation token required for operation "${operationName}". Set DATABASE_RESET_CONFIRM="${REQUIRED_RESET_CONFIRMATION}".`
      );
    }
  }

  return analysis;
}
