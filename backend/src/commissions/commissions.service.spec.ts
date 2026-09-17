import { Test, TestingModule } from "@nestjs/testing";
import { CommissionsService } from "./commissions.service";
import { PrismaService } from "../database/prisma.service";

describe("CommissionsService", () => {
  let service: CommissionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionsService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<CommissionsService>(CommissionsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
