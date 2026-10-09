import { AllExceptionsFilter } from './all-exceptions.filter';
import { ArgumentsHost, ConflictException, HttpStatus } from '@nestjs/common';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockLogger: any;
  let mockResponse: any;
  let mockRequest: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      log: jest.fn(),
    };

    filter = new AllExceptionsFilter(mockLogger);

    mockResponse = {
      statusCode: 200,
      headers: { 'x-request-id': '5abcc22a-31e4-4103-8bb7-2dfd7cd6c4ba' },
      getHeader: jest.fn((name: string) => mockResponse.headers[name]),
      status: jest.fn().mockImplementation((status: number) => {
        mockResponse.statusCode = status;
        return mockResponse;
      }),
      json: jest.fn().mockImplementation((body: any) => body),
    };

    mockRequest = {
      method: 'POST',
      url: '/api/sales/invoices',
      originalUrl: '/api/sales/invoices',
    };

    mockArgumentsHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('maps Prisma P2002 unique constraint violation to HTTP 409 Conflict with correlation ID', () => {
    const prismaP2002 = {
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      clientVersion: '5.22.0',
      meta: { target: ['companyId', 'invoiceNo'] },
      message: 'Unique constraint failed on the fields: (`companyId`,`invoiceNo`)',
    };

    filter.catch(prismaP2002, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        message: 'A record with this companyId, invoiceNo already exists.',
        correlationId: '5abcc22a-31e4-4103-8bb7-2dfd7cd6c4ba',
      })
    );
    // Should NOT log at error level since 409 is not >= 500
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('preserves HttpException status and message', () => {
    const conflictException = new ConflictException(
      'Document number "B2BF/68/26-27" has already been used on an archived invoice.'
    );

    filter.catch(conflictException, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        message: 'Document number "B2BF/68/26-27" has already been used on an archived invoice.',
        correlationId: '5abcc22a-31e4-4103-8bb7-2dfd7cd6c4ba',
      })
    );
  });

  it('maps unhandled generic Error to HTTP 500 and logs error with stack trace', () => {
    const genericError = new Error('Unexpected database connection timeout');

    filter.catch(genericError, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: 'Internal server error',
        correlationId: '5abcc22a-31e4-4103-8bb7-2dfd7cd6c4ba',
      })
    );
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
