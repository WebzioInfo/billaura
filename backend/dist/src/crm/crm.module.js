"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrmModule = void 0;
const common_1 = require("@nestjs/common");
const leads_service_1 = require("./leads.service");
const leads_controller_1 = require("./leads.controller");
const contacts_service_1 = require("./contacts.service");
const contacts_controller_1 = require("./contacts.controller");
const crm_activities_service_1 = require("./crm-activities.service");
const crm_activities_controller_1 = require("./crm-activities.controller");
const customers_controller_1 = require("./customers.controller");
const database_module_1 = require("../database/database.module");
let CrmModule = class CrmModule {
};
exports.CrmModule = CrmModule;
exports.CrmModule = CrmModule = __decorate([
    (0, common_1.Module)({
        imports: [database_module_1.DatabaseModule],
        controllers: [leads_controller_1.LeadsController, contacts_controller_1.ContactsController, crm_activities_controller_1.CrmActivitiesController, customers_controller_1.CustomersController],
        providers: [leads_service_1.LeadsService, contacts_service_1.ContactsService, crm_activities_service_1.CrmActivitiesService],
        exports: [leads_service_1.LeadsService, contacts_service_1.ContactsService, crm_activities_service_1.CrmActivitiesService],
    })
], CrmModule);
//# sourceMappingURL=crm.module.js.map