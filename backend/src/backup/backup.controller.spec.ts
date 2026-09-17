import { Test, TestingModule } from "@nestjs/testing";
import { BackupController } from "./backup.controller";
import { BackupService } from "./backup.service";
import { StorageService } from "../storage/storage.service";

describe("BackupController", () => {
  let controller: BackupController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackupController],
      providers: [
        { provide: BackupService, useValue: {} },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();

    controller = module.get<BackupController>(BackupController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
