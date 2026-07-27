import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    let errorsMap: Record<string, string[]> = {};
    let mainMessage = 'Validation failed';

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      if (Array.isArray(exceptionResponse.message)) {
        exceptionResponse.message.forEach((msg: string) => {
          const firstSpace = msg.indexOf(' ');
          if (firstSpace !== -1) {
            const field = msg.substring(0, firstSpace);
            const detail = msg.substring(firstSpace + 1);
            if (!errorsMap[field]) {
              errorsMap[field] = [];
            }
            errorsMap[field].push(msg);
          } else {
            if (!errorsMap['general']) errorsMap['general'] = [];
            errorsMap['general'].push(msg);
          }
        });
      } else if (typeof exceptionResponse.message === 'string') {
        mainMessage = exceptionResponse.message;
      }
    }

    return response.status(status).json({
      success: false,
      message: mainMessage,
      errors: errorsMap,
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }
}
