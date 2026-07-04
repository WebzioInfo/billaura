import { Module } from "@nestjs/common";
import { IncomeCategoriesController } from "./income-categories.controller";
import { IncomeCategoriesService } from "./income-categories.service";
import { OtherIncomesController } from "./other-incomes.controller";
import { OtherIncomesService } from "./other-incomes.service";

@Module({
  controllers: [IncomeCategoriesController, OtherIncomesController],
  providers: [IncomeCategoriesService, OtherIncomesService],
  exports: [IncomeCategoriesService, OtherIncomesService],
})
export class IncomeModule {}
