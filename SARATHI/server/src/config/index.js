import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

// Resolve project root (server/ folder) regardless of the CWD the process was launched from.
const __filename = fileURLToPath(import.meta.url);
const root = resolve(dirname(__filename), '..', '..');

try {
  process.loadEnvFile?.(resolve(root, '.env'));
} catch {}
try {
  process.loadEnvFile?.(resolve(root, 'server', '.env'));
} catch {}

export const app = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || '0.0.0.0',
  env: process.env.NODE_ENV || 'development',
  mode: process.env.APP_MODE || (process.env.NODE_ENV === 'production' ? 'production' : 'demo'),
  origin: process.env.APP_ORIGIN || 'http://localhost:5173',
};

// Secret rotation is not supported here; rotate via restart.
export const auth = {
  secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'sarathi-dev-secret-change-me'),
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  enableDemoAuth: (process.env.ENABLE_DEMO_AUTH === 'true' || process.env.APP_MODE === 'demo' || !process.env.NODE_ENV || process.env.NODE_ENV === 'development') && process.env.NODE_ENV !== 'production' && process.env.APP_MODE !== 'production',
};

export const google = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  allowedHd: process.env.GOOGLE_ALLOWED_HD || '',
  nonceTtlMs: Number(process.env.GOOGLE_NONCE_TTL_MS || 600000),
};

/**
 * Validates critical environment configuration settings.
 * Fails safely if unsafe demo settings or fallback secrets are detected in production.
 */
export function validateConfig(customConfig = null) {
  const currentApp = customConfig?.app || (customConfig?.isProduction ? { env: 'production', mode: 'production' } : app);
  const currentAuth = customConfig?.auth || auth;

  const isProd = currentApp.env === 'production' || currentApp.mode === 'production' || customConfig?.isProduction;

  if (isProd) {
    if (currentAuth.enableDemoAuth) {
      throw new Error(
        'FATAL CONFIGURATION ERROR: Demo authentication (ENABLE_DEMO_AUTH=true) cannot be enabled in a production environment.'
      );
    }
    if (!currentAuth.secret || currentAuth.secret === 'sarathi-dev-secret-change-me' || currentAuth.secret.includes('insecure') || currentAuth.secret.length < 32) {
      throw new Error(
        'FATAL CONFIGURATION ERROR: JWT_SECRET must be explicitly configured with a strong secret in a production environment (min 32 characters).'
      );
    }
  }
}

// Default tenant scope (demo only). Real multi-tenancy requires a tenant header
// that the client obtains after login.
export const tenant = {
  demoOrgId: 'org-demo-1',
};

// File-backing explicit data directory (created at startup).
export const paths = {
  dataDir: resolve(root, 'data'),
  dbFile: resolve(root, 'data', 'database.db'),
  uploadsDir: resolve(root, 'data', 'uploads'),
};

export const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((u) => u.trim());

export const rateLimit = {
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 100),
};

export const audit = {
  enabled: process.env.AUDIT_LOGGING !== 'false',
  filePath: resolve(root, 'data', 'audit.jsonl'),
};

export const assessmentV2 = {
  enabled: process.env.ASSESSMENT_V2_ENABLED === 'true',
  v2_1Enabled: process.env.ASSESSMENT_V2_1_ENABLED === 'true',
  cameraEnabled: process.env.ASSESSMENT_CAMERA_ENABLED === 'true',
  runnerDriver: process.env.RUNNER_DRIVER || 'local-dev',
  judge0Url: process.env.JUDGE0_URL || 'http://localhost:2358',
  judge0ApiKey: process.env.JUDGE0_API_KEY || '',
  integrityRetentionDays: Number(process.env.INTEGRITY_RETENTION_DAYS || 90),
  codeMaxBytes: Number(process.env.ASSESSMENT_CODE_MAX_BYTES || 20480),
  executionTimeoutMs: Number(process.env.ASSESSMENT_RUNNER_TIMEOUT_MS || 5000),
  passThreshold: Number(process.env.ASSESSMENT_PASS_THRESHOLD || 60),
  knowledgeWeight: Number(process.env.ASSESSMENT_KNOWLEDGE_WEIGHT || 0.4),
  practicalWeight: Number(process.env.ASSESSMENT_PRACTICAL_WEIGHT || 0.6),
};

