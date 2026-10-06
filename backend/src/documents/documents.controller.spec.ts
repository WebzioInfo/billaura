import { Test, TestingModule } from '@nestjs/testing';
import { DocumentsController } from './documents.controller';
import { DocumentEngineService } from './document-engine/document-engine.service';
import { ReactPdfEngineService } from './pdf-engine/react-pdf-engine.service';
import { PrismaService } from '../database/prisma.service';

describe('DocumentsController', () => {
  let controller: DocumentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: DocumentEngineService, useValue: {} },
        { provide: ReactPdfEngineService, useValue: { renderDocumentPdf: jest.fn() } },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
