import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import { useSessionStore } from "../../features/auth/stores/sessionStore";

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
      withCredentials: true,
      timeout: 30_000,
      headers: {
        Accept: "application/json",
      },
    });

    // Request interceptor to inject Authorization and Company headers
    this.instance.interceptors.request.use(
      (config) => {
        const token = useSessionStore.getState().accessToken;
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
        console.error('[API Error]', error?.response?.data || error.message, error);
        const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

        if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
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
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
  refreshSession: async () => {
    try {
      const response = await axios.post<{ success: boolean; data: { access_token: string; user: any } }>(
        `${import.meta.env.VITE_API_BASE_URL ?? "/api/v1"}/auth/refresh`,
        {},
        { withCredentials: true }
      );
      
      const { access_token, user } = response.data.data;
      useSessionStore.getState().setSession(user, access_token);
    } catch (err) {
      useSessionStore.getState().clearSession();
      throw err;
    }
  },
  onUnauthorized: () => {
    useSessionStore.getState().clearSession();
  }
});
