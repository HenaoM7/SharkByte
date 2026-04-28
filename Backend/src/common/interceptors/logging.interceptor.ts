import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    // SSE — skip logging to avoid setHeader() after flushHeaders()
    if ((req.headers['accept'] || '').includes('text/event-stream')) {
      return next.handle();
    }

    // Asignar trace ID a la request
    const traceId = (req.headers['x-trace-id'] as string) || randomUUID();
    req['traceId'] = traceId;
    res.setHeader('x-trace-id', traceId);

    const { method, url, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const statusCode = res.statusCode;
        const duration = Date.now() - start;
        this.logger.log(
          `[${traceId}] ${method} ${url} ${statusCode} ${duration}ms — ${ip} "${userAgent}"`,
        );
      }),
    );
  }
}
