const winston = require('winston');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Add custom colors for log levels
winston.addColors({
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  http: 'magenta',
  debug: 'white'
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: consoleFormat,
  defaultMeta: { service: 'collegovibe' },
  transports: [
    // Only console output - no file logging
    new winston.transports.Console({
      format: consoleFormat
    })
  ],

  // Handle exceptions in console only
  exceptionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ],

  // Handle rejections in console only
  rejectionHandlers: [
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
});

module.exports = logger; 