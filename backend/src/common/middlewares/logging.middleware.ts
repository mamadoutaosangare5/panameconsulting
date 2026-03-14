import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';

interface RequestWithTiming extends Request {
  startTime?: number;
}

interface HeadersDictionary {
  [key: string]: string | string[] | undefined;
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  constructor(private configService: ConfigService) {}

  use(req: RequestWithTiming, res: Response, next: NextFunction): void {
    req.startTime = Date.now();
    const { method, originalUrl } = req;

    // Log de la requête entrante - format simplifié
    this.logger.log(`${method} ${originalUrl}`);

    // Intercepter la réponse pour logger le résultat
    const originalSend = res.send;
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalEnd = res.end;

    // Logger les réponses avec res.send

    res.send = (body: any): any => {
      const endTime = Date.now();
      const duration = endTime - (req.startTime || endTime);
      const statusCode = res.statusCode;

      // Log de la réponse sortante - format simplifié
      this.logger.log(
        `${method} ${originalUrl} -> ${statusCode} (${duration}ms)`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return originalSend.call(res, body);
    };

    // Logger les réponses sans body (res.end)

    res.end = (chunk?: any, encoding?: any, cb?: any): any => {
      const endTime = Date.now();
      const duration = endTime - (req.startTime || endTime);
      const statusCode = res.statusCode;

      // Log de la réponse sortante - format simplifié
      this.logger.log(
        `${method} ${originalUrl} -> ${statusCode} (${duration}ms)`,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return originalEnd.call(res, chunk, encoding, cb);
    };

    next();
  }

  private sanitizeBody(
    body: Record<string, unknown> | null,
  ): Record<string, unknown> | null {
    if (!body) return null;

    // Masquer les données sensibles dans le body
    if (typeof body === 'object') {
      const sanitized: Record<string, unknown> = { ...body };
      const sensitiveFields = [
        'password',
        'token',
        'refresh_token',
        'access_token',
        'email',
        'firstName',
        'lastName',
        'nom',
        'prenom',
        'message',
      ];

      sensitiveFields.forEach((field) => {
        if (sanitized[field]) {
          sanitized[field] = '***MASKED***';
        }
      });

      return sanitized;
    }

    return null;
  }

  private getStatusDescription(statusCode: number): string {
    const statusMap: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };

    return statusMap[statusCode] || 'Unknown';
  }

  private sanitizeHeaders(headers: HeadersDictionary): Record<string, string> {
    const sanitized: Record<string, string> = {};

    // Masquer les headers sensibles
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-forwarded-for',
      'x-real-ip',
    ];

    Object.keys(headers).forEach((key) => {
      const value = headers[key];
      if (typeof value === 'string') {
        if (sensitiveHeaders.includes(key)) {
          sanitized[key] = '***MASKED***';
        } else {
          sanitized[key] = value;
        }
      }
    });

    return sanitized;
  }
}
