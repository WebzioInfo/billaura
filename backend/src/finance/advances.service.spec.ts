import { Test, TestingModule } from '@nestjs/testing';
import { AdvancesService } from './advances.service';

describe('AdvancesService', () => {
  let service: AdvancesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdvancesService],
    }).compile();

    service = module.get<AdvancesService>(AdvancesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
