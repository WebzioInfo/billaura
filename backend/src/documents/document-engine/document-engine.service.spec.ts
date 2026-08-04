import { Test, TestingModule } from '@nestjs/testing';
import { DocumentEngineService } from './document-engine.service';

describe('DocumentEngineService', () => {
  let service: DocumentEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentEngineService],
    }).compile();

    service = module.get<DocumentEngineService>(DocumentEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
