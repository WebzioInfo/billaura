"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingModule = void 0;
const common_1 = require("@nestjs/common");
const accounts_service_1 = require("./accounts.service");
const accounts_controller_1 = require("./accounts.controller");
const journal_entries_service_1 = require("./journal-entries.service");
const journal_entries_controller_1 = require("./journal-entries.controller");
const database_module_1 = require("../database/database.module");
let AccountingModule = class AccountingModule {
};
exports.AccountingModule = AccountingModule;
exports.AccountingModule = AccountingModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [
            accounts_controller_1.AccountsController,
            journal_entries_controller_1.JournalEntriesController,
        ],
        providers: [
            accounts_service_1.AccountsService,
            journal_entries_service_1.JournalEntriesService,
        ],
        exports: [
            accounts_service_1.AccountsService,
            journal_entries_service_1.JournalEntriesService,
        ],
    })
], AccountingModule);
//# sourceMappingURL=accounting.module.js.map