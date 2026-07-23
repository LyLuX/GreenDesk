import winston from 'winston';

import env from '../../config/env.js';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

/** Application logger, formatted for JSON ingestion outside development. */
const logger = winston.createLogger({
  level: env.nodeEnv === 'production' ? 'info' : 'debug',
  format: combine(timestamp(), errors({ stack: true }), json()),
  defaultMeta: { service: 'greendesk-api' },
  transports: [
    new winston.transports.Console({
      format:
        env.nodeEnv === 'production'
          ? combine(timestamp(), errors({ stack: true }), json())
          : combine(colorize(), timestamp(), simple()),
    }),
  ],
});

export default logger;
