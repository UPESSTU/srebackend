const { createLogger, transports, format } = require('winston')
const path = require('path')
require('winston-daily-rotate-file')

const logger = createLogger({
  level: 'info',
  transports: [
    new transports.DailyRotateFile({
      filename: path.join(__dirname, '..', '..', 'logs', 'info-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      format: format.combine(format.timestamp(), format.json()),
      maxFiles: '14d',
    }),
    new transports.DailyRotateFile({
      filename: path.join(__dirname, '..', '..', 'logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: format.combine(format.timestamp(), format.json()),
      maxFiles: '14d',
    }),
    new transports.Console({
      level: 'info',
      format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`)
      ),
    }),
  ],
})

module.exports = logger
