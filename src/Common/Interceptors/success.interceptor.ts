import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SuccessInterceptor<T>
  implements NestInterceptor<T, any>
{
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    return next.handle().pipe(
      map((res) => {
        // Type guard: check if res has 'data' property
        if (
          res &&
          typeof res === 'object' &&
          'data' in res &&
          Object.prototype.hasOwnProperty.call(res, 'data')
        ) {
          const anyRes = res as { data: any; message?: string | null };
          return {
            success: true,
            message: anyRes.message ?? null,
            data: anyRes.data,
          };
        }

        return {
          success: true,
          message: null,
          data: res,
        };
      }),
    );
  }
}
