import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { randomUUID } from "crypto";
import { Observable } from "rxjs";

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse();
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers["x-request-id"] ?? randomUUID();

    (request as { requestId?: string }).requestId = requestId;
    response.setHeader("x-request-id", requestId);

    return next.handle();
  }
}
