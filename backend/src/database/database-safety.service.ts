import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  analyzeDatabaseTarget,
  assertSafeDatabaseOperation,
  DatabaseTargetDetails,
  OperationSafetyOptions,
} from '../common/utils/database-safety.util';

@Injectable()
export class DatabaseSafetyService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSafetyService.name);
  private targetInfo!: DatabaseTargetDetails;

  onModuleInit() {
    this.targetInfo = analyzeDatabaseTarget();
    this.logger.log(
      `Database Safety Active. Environment: [${this.targetInfo.environment.toUpperCase()}], Host: [${this.targetInfo.host}], Protected: [${this.targetInfo.isProduction}]`,
      'DatabaseSafety'
    );

    if (this.targetInfo.isProduction) {
      this.logger.warn(
        `PRODUCTION DATABASE TARGET DETECTED: All destructive operations, raw wipes, and resets are locked.`,
        'DatabaseSafety'
      );
    }
  }

  getDetails(): DatabaseTargetDetails {
    return analyzeDatabaseTarget();
  }

  assertSafe(operationName: string, options?: OperationSafetyOptions): DatabaseTargetDetails {
    return assertSafeDatabaseOperation(operationName, options);
  }
}
