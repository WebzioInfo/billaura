import { Test, TestingModule } from "@nestjs/testing";
import { CashController } from "./cash.controller";
import { CashService } from "./cash.service";

describe("CashController", () => {
  let controller: CashController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CashController],
      providers: [
        { provide: CashService, useValue: {} },
      ],
    }).compile();

    controller = module.get<CashController>(CashController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
