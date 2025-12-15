/*
 * Copyright (c) 2025 Aarón Negrín
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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

