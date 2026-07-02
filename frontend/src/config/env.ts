/**
 * Centralized Environment Configuration
 * This file parses and exports all environment variables to prevent scattered process.env or import.meta.env lookups.
 */

export const env = {
  // API Configuration
  API_URL: import.meta.env.VITE_API_URL ?? 'http://localhost:4000',
  API_BASE_URL: (() => {
    const rawUrl = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
    if (rawUrl.startsWith('http') && !rawUrl.endsWith('/api') && !rawUrl.includes('/api/')) {
      return `${rawUrl.replace(/\/$/, '')}/api`;
    }
    return rawUrl;
  })(),

  // App Meta
  APP_NAME: import.meta.env.VITE_APP_NAME ?? 'Bill Aura',
  COMPANY_NAME: import.meta.env.VITE_COMPANY_NAME ?? 'Webzio',
  ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT ?? 'development',

  // Feature Flags
  ENABLE_PWA: import.meta.env.VITE_ENABLE_PWA === 'true',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_DEBUG: import.meta.env.VITE_ENABLE_DEBUG === 'true',
};

// Fail fast for absolutely critical frontend configuration
if (!env.API_BASE_URL) {
  throw new Error("Missing VITE_API_BASE_URL in environment configuration");
}
