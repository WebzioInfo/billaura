import { Injectable } from "@nestjs/common";

@Injectable()
export class AuditService {
  recordFoundationEvent(event: string, metadata: Record<string, unknown> = {}) {
    return {
      event,
      metadata,
      recordedAt: new Date().toISOString(),
    };
  }
}
