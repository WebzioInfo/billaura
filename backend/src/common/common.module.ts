import { Module } from "@nestjs/common";
import { SearchController } from "./search.controller";
import { LookupController } from "./lookup.controller";

@Module({
  controllers: [SearchController, LookupController],
})
export class CommonModule {}
