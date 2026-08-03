import { Module } from "@nestjs/common";
import { LeadsService } from "./leads.service";
import { LeadsController } from "./leads.controller";
import { ContactsService } from "./contacts.service";
import { ContactsController } from "./contacts.controller";
import { CrmActivitiesService } from "./crm-activities.service";
import { CrmActivitiesController } from "./crm-activities.controller";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";
import { DatabaseModule } from "../database/database.module";

import { CustomerSegmentsModule } from "./customer-segments/customer-segments.module";
import { CustomerDepartmentsModule } from "./customer-departments/customer-departments.module";
import { SequenceModule } from "../shared/sequence/sequence.module";
import { AccountingModule } from "../accounting/accounting.module";

@Module({
  imports: [DatabaseModule, CustomerSegmentsModule, CustomerDepartmentsModule, SequenceModule, AccountingModule],
  controllers: [
    LeadsController,
    ContactsController,
    CrmActivitiesController,
    CustomersController,
  ],
  providers: [LeadsService, ContactsService, CrmActivitiesService, CustomersService],
  exports: [LeadsService, ContactsService, CrmActivitiesService, CustomersService, CustomerSegmentsModule],
})
export class CrmModule {}
