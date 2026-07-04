import { Test, TestingModule } from "@nestjs/testing";
import { AdvancesController } from "./advances.controller";

describe("AdvancesController", () => {
  let controller: AdvancesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdvancesController],
    }).compile();

    controller = module.get<AdvancesController>(AdvancesController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
