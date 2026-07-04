import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { useSessionStore } from "../../features/auth/stores/sessionStore";
import { env } from "../../config/env";
import { TokenService } from "../auth/TokenService";

export interface ApiClientOptions {
  baseURL: string;
  onUnauthorized?: () => void;
  refreshSession?: () => Promise<void>;
}

export interface RequestOptions extends AxiosRequestConfig {
  signal?: AbortSignal;
}

export class ApiClient {
  private readonly instance: AxiosInstance;
  private refreshPromise: Promise<void> | null = null;

  constructor(private readonly options: ApiClientOptions) {
    this.instance = axios.create({
      baseURL: options.baseURL,
      timeout: 30_000,
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });

    // Request interceptor to inject Authorization and Company headers
    this.instance.interceptors.request.use(
      (config) => {
        (config as any)._startTime = performance.now();
        console.groupCollapsed(`[API REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
        console.log('==================================');
        console.log('API REQUEST');
        console.log('==================================');
        console.log(`Timestamp: ${new Date().toISOString()}`);
        console.log(`HTTP Method: ${config.method?.toUpperCase()}`);
        console.log(`Full URL: ${config.baseURL}${config.url}`);
        console.log(`Base URL: ${config.baseURL}`);
        console.log(`Endpoint: ${config.url}`);
        console.log(`Query Parameters:`, config.params);
        console.log(`Headers:`, config.headers);
        
        let safeBody = config.data;
        if (safeBody && typeof safeBody === 'object') {
            safeBody = { ...safeBody };
            if (safeBody.password) safeBody.password = '***MASKED***';
            if (safeBody.token) safeBody.token = '***MASKED***';
            if (safeBody.refreshToken) safeBody.refreshToken = '***MASKED***';
        }
        console.log(`Request Body:`, safeBody);
        console.log(`Timeout: ${config.timeout}`);
        console.log(`withCredentials: ${config.withCredentials}`);
        console.log(`Environment: ${import.meta.env.MODE}`);
        console.log(`Current Origin: ${window.location.origin}`);
        console.log(`Current Host: ${window.location.host}`);
        console.log(`VITE_API_URL: ${options.baseURL}`);
        console.log(`Resolved Final URL: ${config.baseURL}${config.url}`);
        console.log(`Frontend Route: ${window.location.pathname}`);
        console.log(`API Route: ${config.url}`);
        console.log(`Current Page: ${window.location.href}`);
        console.log('==================================');
        console.groupEnd();

        const token = TokenService.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        const companyId = useSessionStore.getState().user?.companyId;
        if (companyId && config.headers) {
          config.headers['x-company-id'] = companyId;
          config.headers['x-tenant-id'] = companyId;
        }
        
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor to handle token rotation on 401s
    this.instance.interceptors.response.use(
      (response) => {
        const duration = performance.now() - ((response.config as any)._startTime || performance.now());
        console.groupCollapsed(`[API RESPONSE] ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        console.log('==================================');
        console.log('API RESPONSE');
        console.log('==================================');
        console.log(`URL: ${response.config.baseURL}${response.config.url}`);
        console.log(`Status: ${response.status}`);
        console.log(`Status Text: ${response.statusText}`);
        console.log(`Duration: ${duration.toFixed(2)}ms`);
        console.log(`Headers:`, response.headers);
        console.log(`Response Body:`, response.data);
        console.log('==================================');
        console.groupEnd();
        return response;
      },
      async (error: AxiosError) => {
        const duration = (error.config as any)?._startTime ? performance.now() - (error.config as any)._startTime : 0;
        console.groupCollapsed(`[API ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}`);
        console.log('==================================');
        console.log('API ERROR');
        console.log('==================================');
        console.log(`Request URL: ${error.config?.url}`);
        console.log(`Resolved URL: ${error.config?.baseURL}${error.config?.url}`);
        console.log(`Method: ${error.config?.method?.toUpperCase()}`);
        console.log(`Status Code: ${error.response?.status}`);
        console.log(`Axios Code: ${error.code}`);
        console.log(`Axios Message: ${error.message}`);
        console.log(`Timeout: ${error.config?.timeout}`);
        console.log(`Request Config:`, error.config);
        console.log(`Response Body:`, error.response?.data);
        console.log(`Stack Trace:`, error.stack);
        console.log(`Network Error: ${!error.response}`);
        console.log(`Duration: ${duration.toFixed(2)}ms`);
        
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            console.error(`Request timed out after ${error.config?.timeout} ms`);
        }
        console.log('==================================');
        console.groupEnd();

        const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

        if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
          return Promise.reject(error);
        }

        // Prevent infinite loops: If the request that failed with 401 was the refresh token request itself,
        // do not attempt to refresh again. Just reject.
        if (originalRequest.url?.includes('/auth/refresh')) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
          await this.refresh();
          return this.instance.request(originalRequest);
        } catch (refreshError) {
          this.options.onUnauthorized?.();
          return Promise.reject(refreshError);
        }
      },
    );
  }

  setUnauthorizedHandler(onUnauthorized: () => void) {
    this.options.onUnauthorized = onUnauthorized;
  }

  setRefreshSessionHandler(refreshSession: () => Promise<void>) {
    this.options.refreshSession = refreshSession;
  }

  async get<TData = any>(url: string, config?: RequestOptions): Promise<TData> {
    const response = await this.instance.get<TData>(url, config);
    return response.data;
  }

  async post<TData = any, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: RequestOptions,
  ): Promise<TData> {
    const response = await this.instance.post<TData>(url, body, config);
    return response.data;
  }

  async put<TData = any, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: RequestOptions,
  ): Promise<TData> {
    const response = await this.instance.put<TData>(url, body, config);
    return response.data;
  }

  async patch<TData = any, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: RequestOptions,
  ): Promise<TData> {
    const response = await this.instance.patch<TData>(url, body, config);
    return response.data;
  }

  async delete<TData = any>(url: string, config?: RequestOptions): Promise<TData> {
    const response = await this.instance.delete<TData>(url, config);
    return response.data;
  }

  private async refresh() {
    if (!this.options.refreshSession) {
      throw new Error("Session refresh is not configured");
    }

    this.refreshPromise ??= this.options.refreshSession().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }
}

export const apiClient = new ApiClient({
  baseURL: env.API_BASE_URL,
  refreshSession: async () => {
    try {
      const refreshToken = TokenService.getRefreshToken();
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await axios.post(
        `${env.API_BASE_URL}/auth/refresh`,
        { refreshToken }
      );
      
      const payload = response.data?.data || response.data;
      const { access_token, refresh_token, user } = payload;
      if (access_token && refresh_token && user) {
        TokenService.setTokens(access_token, refresh_token);
        useSessionStore.getState().setSession(user, access_token);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      // Intelligently handle network failures
      if (err.response && (err.response.status === 401 || err.response.status === 403 || err.response.status === 400)) {
        TokenService.clearTokens();
        useSessionStore.getState().clearSession();
      } else if (!err.response) {
        // Network error (no response)
        console.warn("Network error during refresh, not clearing session to allow retry later.");
      } else {
        TokenService.clearTokens();
        useSessionStore.getState().clearSession();
      }
      throw err;
    }
  },
  onUnauthorized: () => {
    TokenService.clearTokens();
    useSessionStore.getState().clearSession();
  }
});
