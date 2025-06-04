import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';


const logFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(info => `[${info.timestamp}] [${info.level.toUpperCase()}] ${info.message}`)
);

const fileRotateTransport = new transports.DailyRotateFile({
    filename: 'logs/app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxSize: '5m',
    maxFiles: '7d' // Keep logs for 7 days.
});


const logger = createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        fileRotateTransport
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: format.simple()
    }));
}


export default logger;