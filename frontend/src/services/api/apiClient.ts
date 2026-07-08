import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { useSessionStore } from "../../features/auth/stores/sessionStore";
import { env } from "../../config/env";
import { TokenService } from "../auth/TokenService";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    totalItems?: number;
    [key: string]: any;
  };
}

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
      withCredentials: true,
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
      (response) => response,
      async (error: AxiosError) => {
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

  private unwrap<T>(responseData: any): T {
    if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
      const payload = responseData.data;
      if (payload && typeof payload === 'object' && payload !== null) {
        if (!('data' in payload)) {
          Object.defineProperty(payload, 'data', {
            get() { return this; },
            enumerable: false,
            configurable: true
          });
        }
        Object.defineProperty(payload, 'meta', {
          value: responseData.meta,
          enumerable: false,
          writable: true
        });
      }
      return payload as T;
    }
    return responseData as T;
  }

  async get<TData = any>(url: string, config?: RequestOptions): Promise<TData> {
    const response = await this.instance.get(url, config);
    return this.unwrap<TData>(response.data);
  }

  async post<TData = any, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: RequestOptions,
  ): Promise<TData> {
    const response = await this.instance.post(url, body, config);
    return this.unwrap<TData>(response.data);
  }

  async put<TData = any, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: RequestOptions,
  ): Promise<TData> {
    const response = await this.instance.put(url, body, config);
    return this.unwrap<TData>(response.data);
  }

  async patch<TData = any, TBody = unknown>(
    url: string,
    body?: TBody,
    config?: RequestOptions,
  ): Promise<TData> {
    const response = await this.instance.patch(url, body, config);
    return this.unwrap<TData>(response.data);
  }

  async delete<TData = any>(url: string, config?: RequestOptions): Promise<TData> {
    const response = await this.instance.delete(url, config);
    return this.unwrap<TData>(response.data);
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

/**
 * Safely extracts an array from any API response, handling nested `{ data }` envelopes
 * and returning an empty array `[]` as a fallback if the data is missing or malformed.
 */
export function ensureArray<T = any>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}
