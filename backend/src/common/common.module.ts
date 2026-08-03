import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { LookupController } from "./lookup.controller";
import { SearchService } from "./search.service";
import { LookupService } from "./lookup.service";

@Module({
  controllers: [SearchController, LookupController],
  providers: [SearchService, LookupService],
  exports: [SearchService, LookupService],
})
export class CommonModule {}
