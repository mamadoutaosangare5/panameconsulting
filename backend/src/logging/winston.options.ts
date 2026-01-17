import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { ConfigService } from '@nestjs/config';

export const createWinstonOptions = (configService: ConfigService) => {
  const level = configService.get<string>('LOG_LEVEL') || 'info';
  const logDir = configService.get<string>('LOG_DIR') || 'logs';
  const enableHttpTransport = !!configService.get<string>('LOG_HTTP_URL');
  const httpUrl = configService.get<string>('LOG_HTTP_URL');

  const transports: winston.transport[] = [];

  // Console transport (pretty in dev)
  transports.push(
    new winston.transports.Console({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        nestWinstonModuleUtilities.format.nestLike('paname-api', { prettyPrint: process.env.NODE_ENV !== 'production' }),
      ),
    }),
  );

  // Daily rotate file for combined logs
  transports.push(
    new DailyRotateFile({
      level,
      dirname: logDir,
      filename: 'application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  );

  // Error logs separate file
  transports.push(
    new DailyRotateFile({
      level: 'error',
      dirname: logDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    }),
  );

  // Optional: HTTP transport to send logs to remote collector (Logstash/ELK/Datadog HTTP intake)
  if (enableHttpTransport && httpUrl) {
    transports.push(
      new winston.transports.Http({
        level,
        format: winston.format.json(),
        host: httpUrl,
      }) as unknown as winston.transport,
    );
  }

  return {
    transports,
    exitOnError: false,
    exceptionHandlers: [
      new DailyRotateFile({
        dirname: logDir,
        filename: 'exceptions-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    ],
  };
};
