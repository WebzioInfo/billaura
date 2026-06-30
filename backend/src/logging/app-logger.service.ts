import { ConsoleLogger, Injectable, LogLevel } from "@nestjs/common";

@Injectable()
export class AppLogger extends ConsoleLogger {
  protected getTimestamp(): string {
    return new Date().toISOString();
  }

  setProductionLevels() {
    this.setLogLevels(["error", "warn", "log"] satisfies LogLevel[]);
  }
}
