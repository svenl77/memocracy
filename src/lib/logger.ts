import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Structured logging configuration
 * Replaces console.log/error with proper logging that can be aggregated
 */

// Ensure logs directory exists
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  try {
    mkdirSync(logsDir, { recursive: true });
  } catch (error) {
    // Silently fail if we can't create logs directory
    console.warn('Could not create logs directory:', error);
  }
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: logFormat,
  defaultMeta: { service: 'solana-vote' },
  transports: [
    // Write all logs to `combined.log` (only if logs directory exists)
    ...(existsSync(logsDir) ? [
      new winston.transports.File({ 
        filename: join(logsDir, 'combined.log'),
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      }),
      // Write all logs with level `error` and below to `error.log`
      new winston.transports.File({ 
        filename: join(logsDir, 'error.log'), 
        level: 'error',
        maxsize: 10485760, // 10MB
        maxFiles: 5,
      }),
    ] : []),
  ],
  // Don't exit on handled exceptions
  exceptionHandlers: existsSync(logsDir) ? [
    new winston.transports.File({ filename: join(logsDir, 'exceptions.log') })
  ] : [],
  // Don't exit on unhandled promise rejections
  rejectionHandlers: existsSync(logsDir) ? [
    new winston.transports.File({ filename: join(logsDir, 'rejections.log') })
  ] : [],
});

// Add console transport in non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Export convenience methods
export const log = {
  error: (message: string, ...meta: any[]) => logger.error(message, ...meta),
  warn: (message: string, ...meta: any[]) => logger.warn(message, ...meta),
  info: (message: string, ...meta: any[]) => logger.info(message, ...meta),
  debug: (message: string, ...meta: any[]) => logger.debug(message, ...meta),
};
