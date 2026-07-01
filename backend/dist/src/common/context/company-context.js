"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyContext = void 0;
const async_hooks_1 = require("async_hooks");
class CompanyContext {
    static storage = new async_hooks_1.AsyncLocalStorage();
    static run(companyId, userId, fn) {
        const store = new Map();
        store.set('companyId', companyId);
        store.set('userId', userId);
        return this.storage.run(store, fn);
    }
    static getCompanyId() {
        const store = this.storage.getStore();
        return store ? store.get('companyId') || null : null;
    }
    static getUserId() {
        const store = this.storage.getStore();
        return store ? store.get('userId') || null : null;
    }
}
exports.CompanyContext = CompanyContext;
//# sourceMappingURL=company-context.js.map