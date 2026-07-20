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
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;
    let message = exception instanceof HttpException ? exception.message : "Internal server error";
    let errors = undefined;

    if (exceptionResponse && typeof exceptionResponse === 'object') {
       if ('message' in exceptionResponse) {
           message = (exceptionResponse as any).message as string;
       }
       if ('errors' in exceptionResponse) {
           errors = (exceptionResponse as any).errors;
       }
    }
    const requestId = response.getHeader("x-request-id")?.toString();

    if (status >= 500) {
      this.logger.error(
        message,
        exception instanceof Error ? exception.stack : undefined,
        "ExceptionFilter",
      );
    }

    response.status(status).json({
      success: false,
      message,
      ...(errors ? { errors } : {}),
      statusCode: status,
      path: request.url,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
