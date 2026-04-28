import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  RequestTimeoutException,
} from '@nestjs/common';
import { Observable, throwError, TimeoutError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    // SSE — skip timeout, long-lived streams must never be cut
    if ((req.headers['accept'] || '').includes('text/event-stream')) {
      return next.handle();
    }
    return next.handle().pipe(
      timeout(30_000), // 30 segundos máximo por request
      catchError((err) => {
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException('La solicitud tardó demasiado tiempo.'));
        }
        return throwError(() => err);
      }),
    );
  }
}
