import { Test, TestingModule } from "@nestjs/testing";
import { BackupService } from "./backup.service";
import { PrismaService } from "../database/prisma.service";
import { StorageService } from "../storage/storage.service";

describe("BackupService", () => {
  let service: BackupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: PrismaService, useValue: {} },
        { provide: StorageService, useValue: {} },
      ],
    }).compile();

    service = module.get<BackupService>(BackupService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
