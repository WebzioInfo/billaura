import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { map, Observable } from "rxjs";

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // If response headers are already sent or Content-Type is application/pdf / binary, or data is Buffer, pass through untouched
        if (
          response.headersSent ||
          response.getHeader('content-type')?.toString().includes('application/pdf') ||
          Buffer.isBuffer(data)
        ) {
          return data;
        }

        // If the response is already enveloped (e.g. from an exception filter or custom logic)
        if (data && typeof data === "object" && "success" in data) {
          return data;
        }


        // Flatten paginated results or objects that already provide data and meta
        if (
          data &&
          typeof data === "object" &&
          "data" in data &&
          "meta" in data
        ) {
          return {
            success: true,
            data: data.data,
            meta: {
              ...data.meta,
              correlationId: response.getHeader("x-request-id") || null,
            },
          };
        }

        // Standard envelope for raw data
        return {
          success: true,
          data,
          meta: {
            correlationId: response.getHeader("x-request-id") || null,
          },
        };
      }),
    );
  }
}
