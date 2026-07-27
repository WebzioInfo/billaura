import { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Debug mode checker
export const isDebugApiLogsEnabled = (): boolean => {
  return (
    import.meta.env.MODE === 'development' ||
    import.meta.env.VITE_DEBUG_API_LOGS === 'true'
  );
};

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'jwt',
  'otp',
  'otpcode',
  'authorization',
  'cookie',
  'secret',
  'apikey',
  'creditcard',
  'cvv',
];

export const maskSensitiveData = (data: any): any => {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item));
  }

  const maskedObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
      maskedObj[key] = '***MASKED***';
    } else if (typeof value === 'object' && value !== null) {
      maskedObj[key] = maskSensitiveData(value);
    } else {
      maskedObj[key] = value;
    }
  }
  return maskedObj;
};

export const logApiRequest = (config: AxiosRequestConfig & { _startTime?: number; _requestId?: string }) => {
  if (!isDebugApiLogsEnabled()) return;

  const timestamp = new Date().toISOString();
  const method = (config.method || 'GET').toUpperCase();
  const url = config.url || '';
  const requestId = config._requestId || Math.random().toString(36).substring(2, 9);
  config._requestId = requestId;

  console.groupCollapsed(
    `%c[API REQUEST] %c${method} %c${url}`,
    'color: #3b82f6; font-weight: bold;',
    'color: #f59e0b; font-weight: bold;',
    'color: #9ca3af;'
  );

  console.log('%cTimestamp:', 'font-weight: bold;', timestamp);
  console.log('%cMethod:', 'font-weight: bold;', method);
  console.log('%cURL:', 'font-weight: bold;', url);
  console.log('%cRequest ID:', 'font-weight: bold;', requestId);

  if (config.params) {
    console.log('%cQuery Parameters:', 'font-weight: bold;', maskSensitiveData(config.params));
  }

  if (config.headers) {
    console.log('%cHeaders:', 'font-weight: bold;', maskSensitiveData(config.headers));
  }

  if (config.data) {
    let parsedBody = config.data;
    if (typeof config.data === 'string') {
      try {
        parsedBody = JSON.parse(config.data);
      } catch {
        parsedBody = config.data;
      }
    }
    console.log('%cRequest Body:', 'font-weight: bold;', maskSensitiveData(parsedBody));
  }

  const companyId = config.headers?.['x-company-id'] || config.headers?.['x-tenant-id'];
  if (companyId) {
    console.log('%cCompany / Tenant ID:', 'font-weight: bold;', companyId);
  }

  console.groupEnd();
};

export const logApiResponse = (response: AxiosResponse & { config: AxiosRequestConfig & { _startTime?: number; _requestId?: string } }) => {
  if (!isDebugApiLogsEnabled()) return;

  const timestamp = new Date().toISOString();
  const status = response.status;
  const method = (response.config.method || 'GET').toUpperCase();
  const url = response.config.url || '';
  const startTime = response.config._startTime || Date.now();
  const responseTimeMs = Date.now() - startTime;
  const requestId = response.config._requestId || '-';

  const isSuccess = status >= 200 && status < 300;
  const isRedirect = status >= 300 && status < 400;

  const badgeColor = isSuccess ? '#22c55e' : isRedirect ? '#eab308' : '#f97316';
  const badgeEmoji = isSuccess ? '🟢' : '🟡';

  console.groupCollapsed(
    `%c${badgeEmoji} [API RESPONSE] %c${status} %c${method} %c${url} %c(${responseTimeMs}ms)`,
    `color: ${badgeColor}; font-weight: bold;`,
    'font-weight: bold;',
    'color: #f59e0b; font-weight: bold;',
    'color: #9ca3af;',
    'color: #6b7280; font-style: italic;'
  );

  console.log('%cTimestamp:', 'font-weight: bold;', timestamp);
  console.log('%cHTTP Status:', 'font-weight: bold;', status);
  console.log('%cMethod:', 'font-weight: bold;', method);
  console.log('%cURL:', 'font-weight: bold;', url);
  console.log('%cRequest ID:', 'font-weight: bold;', requestId);
  console.log('%cResponse Time:', 'font-weight: bold;', `${responseTimeMs} ms`);

  if (response.data) {
    console.log('%cResponse Data:', 'font-weight: bold;', maskSensitiveData(response.data));
  }

  console.groupEnd();
};

export const logApiError = (error: AxiosError & { config?: AxiosRequestConfig & { _startTime?: number; _requestId?: string } }) => {
  if (!isDebugApiLogsEnabled()) return;

  const timestamp = new Date().toISOString();
  const response = error.response;
  const status = response?.status || 0;
  const method = (error.config?.method || 'GET').toUpperCase();
  const url = error.config?.url || '';
  const startTime = error.config?._startTime || Date.now();
  const responseTimeMs = Date.now() - startTime;
  const requestId = error.config?._requestId || '-';

  const isClientError = status >= 400 && status < 500;
  const badgeColor = isClientError ? '#f97316' : '#ef4444';
  const badgeEmoji = isClientError ? '🟠' : '🔴';

  console.groupCollapsed(
    `%c${badgeEmoji} [API ERROR] %c${status || 'NETWORK ERROR'} %c${method} %c${url} %c(${responseTimeMs}ms)`,
    `color: ${badgeColor}; font-weight: bold;`,
    'font-weight: bold;',
    'color: #f59e0b; font-weight: bold;',
    'color: #9ca3af;',
    'color: #ef4444; font-style: italic;'
  );

  console.log('%cTimestamp:', 'font-weight: bold;', timestamp);
  console.log('%cStatus Code:', 'font-weight: bold;', status || 'N/A (Network Outage / Cors / Offline)');
  console.log('%cMethod:', 'font-weight: bold;', method);
  console.log('%cURL:', 'font-weight: bold;', url);
  console.log('%cRequest ID:', 'font-weight: bold;', requestId);
  console.log('%cError Message:', 'font-weight: bold; color: #ef4444;', error.message);

  if (response?.data) {
    const data: any = response.data;
    console.log('%cResponse Error Data:', 'font-weight: bold;', maskSensitiveData(data));
    if (data.errors || data.message) {
      console.log('%cValidation / Detailed Errors:', 'font-weight: bold;', data.errors || data.message);
    }
    if (data.stack) {
      console.log('%cBackend Stack Trace:', 'font-weight: bold; color: #ef4444;', data.stack);
    }
  }

  console.groupEnd();
};
