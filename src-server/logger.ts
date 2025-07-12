import winston from 'winston';

/**
 * Configure Winston logger for the mimic proxy server
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'mimic-proxy' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => {
          // Safely convert values to strings
          const timestamp = typeof info.timestamp === 'string' ? info.timestamp : '';
          const level = typeof info.level === 'string' ? info.level : String(info.level || '');
          const message =
            typeof info.message === 'string'
              ? info.message
              : info.message != null && typeof info.message !== 'object'
                ? // eslint-disable-next-line @typescript-eslint/no-base-to-string
                String(info.message)
                : '';

          // Extract meta (all properties except timestamp, level, message)
          const meta: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(info)) {
            if (key !== 'timestamp' && key !== 'level' && key !== 'message') {
              meta[key] = value;
            }
          }

          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
  ],
});

// If we're not in production, log to the console with simpler format
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

