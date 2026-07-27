type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';

class FrontendLogger {
  private isDevelopment = process.env.NODE_ENV === 'development' || true; // Set to true to help debugging during development session

  private log(level: LogLevel, moduleName: string, message: string, extra?: any) {
    if (!this.isDevelopment) return;

    const colors: Record<LogLevel, string> = {
      DEBUG: 'color: #8b5cf6; font-weight: bold;',
      INFO: 'color: #3b82f6; font-weight: bold;',
      WARN: 'color: #f59e0b; font-weight: bold;',
      ERROR: 'color: #ef4444; font-weight: bold;',
      SUCCESS: 'color: #10b981; font-weight: bold;',
    };

    const time = new Date().toLocaleTimeString();
    console.log(
      `%c[${level}]%c [${moduleName}] %c${message} %c(at ${time})`,
      colors[level],
      'color: #6b7280; font-weight: bold;',
      'color: inherit;',
      'color: #9ca3af; font-size: 10px;',
      extra !== undefined ? extra : ''
    );
  }

  debug(moduleName: string, message: string, extra?: any) {
    this.log('DEBUG', moduleName, message, extra);
  }

  info(moduleName: string, message: string, extra?: any) {
    this.log('INFO', moduleName, message, extra);
  }

  warn(moduleName: string, message: string, extra?: any) {
    this.log('WARN', moduleName, message, extra);
  }

  error(moduleName: string, message: string, extra?: any) {
    this.log('ERROR', moduleName, message, extra);
  }

  success(moduleName: string, message: string, extra?: any) {
    this.log('SUCCESS', moduleName, message, extra);
  }
}

export const logger = new FrontendLogger();
export default logger;
