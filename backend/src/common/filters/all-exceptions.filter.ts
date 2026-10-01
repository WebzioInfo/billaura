import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AppLogger } from "../../logging/app-logger.service";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const _request = ctx.getRequest<Request>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    let errors = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (exceptionResponse && typeof exceptionResponse === 'object') {
        if ('message' in exceptionResponse) {
          message = (exceptionResponse as any).message as string;
        }
        if ('errors' in exceptionResponse) {
          errors = (exceptionResponse as any).errors;
        }
      } else {
        message = exception.message;
      }
    } else if (exception && typeof exception === 'object') {
      const err = exception as any;
      if (
        err.name === 'PayloadTooLargeError' ||
        err.type === 'entity.too.large' ||
        err.code === 'LIMIT_FILE_SIZE' ||
        err.status === 413 ||
        err.statusCode === 413
      ) {
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        message = 'The uploaded image/payload exceeds the maximum allowed size (5MB).';
      } else if (typeof err.status === 'number' && err.status >= 400 && err.status < 600) {
        status = err.status;
        message = err.message || message;
      } else if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) {
        status = err.statusCode;
        message = err.message || message;
      }
    }

    const requestId = response.getHeader("x-request-id")?.toString();

    const isDebugEnabled =
      process.env.NODE_ENV === 'development' ||
      process.env.DEBUG_API_LOGS === 'true';

    if (isDebugEnabled) {
      const method = _request.method || 'UNKNOWN';
      const url = _request.originalUrl || _request.url || '';

      console.groupCollapsed?.(
        `🔴 \x1b[31m[NEST API ERROR]\x1b[0m \x1b[1m${status}\x1b[0m \x1b[33m${method}\x1b[0m ${url}`
      );
      console.log(`\x1b[1mTimestamp:\x1b[0m ${new Date().toISOString()}`);
      console.log(`\x1b[1mStatus Code:\x1b[0m ${status}`);
      console.log(`\x1b[1mError Message:\x1b[0m \x1b[31m${message}\x1b[0m`);
      if (errors) {
        console.log(`\x1b[1mValidation / Field Errors:\x1b[0m`, errors);
      }
      if (exception instanceof Error && exception.stack) {
        console.log(`\x1b[1mStack Trace:\x1b[0m \x1b[31m\n${exception.stack}\x1b[0m`);
      }
      console.groupEnd?.();
    }

    if (status >= 500) {
      this.logger.error(
        message,
        exception instanceof Error ? exception.stack : undefined,
        "ExceptionFilter",
      );
    }

    const errorEnvelope: Record<string, any> = {
      success: false,
      statusCode: status,
      message,
      errors: errors || null,
      correlationId: requestId || null,
      timestamp: new Date().toISOString(),
    };

    if (status === 413) {
      errorEnvelope.error = {
        code: "PAYLOAD_TOO_LARGE",
        message,
      };
    }

    response.status(status).json(errorEnvelope);
  }
}
