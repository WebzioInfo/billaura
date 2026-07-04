import { AsyncLocalStorage } from "async_hooks";

export class CompanyContext {
  private static storage = new AsyncLocalStorage<Map<string, any>>();

  static run(companyId: string | null, userId: string | null, fn: () => void) {
    const store = new Map<string, any>();
    store.set("companyId", companyId);
    store.set("userId", userId);
    return this.storage.run(store, fn);
  }

  static getCompanyId(): string | null {
    const store = this.storage.getStore();
    return store ? store.get("companyId") || null : null;
  }

  static getUserId(): string | null {
    const store = this.storage.getStore();
    return store ? store.get("userId") || null : null;
  }
}
