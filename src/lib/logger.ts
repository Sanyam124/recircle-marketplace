/**
 * Centralized Logger Utility
 * In production, this could be extended to send logs to Sentry, Loggly, or Datadog.
 */

type LogLevel = 'info' | 'warn' | 'error';

const logger = {
    info: (message: string, meta?: any) => log('info', message, meta),
    warn: (message: string, meta?: any) => log('warn', message, meta),
    error: (message: string, error?: any) => log('error', message, error),
};

function log(level: LogLevel, message: string, meta?: any) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (level === 'error') {
        console.error(`${prefix} ${message}`, meta || '');
        // TODO: Integration with external error tracking (e.g., Sentry)
    } else if (level === 'warn') {
        console.warn(`${prefix} ${message}`, meta || '');
    } else {
        console.log(`${prefix} ${message}`, meta || '');
    }
}

export default logger;
