import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { CrmActivitiesService } from './crm-activities.service';
import { CrmActivitiesController } from './crm-activities.controller';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [LeadsController, ContactsController, CrmActivitiesController],
  providers: [LeadsService, ContactsService, CrmActivitiesService],
  exports: [LeadsService, ContactsService, CrmActivitiesService],
})
export class CrmModule {}
