import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { MinioService } from '../../minio/minio.service';

@Injectable()
export class PresignedUrlInterceptor implements NestInterceptor {
  constructor(private readonly minioService: MinioService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      switchMap(async (data) => {
        await this.transformPhotos(data);
        return data;
      }),
    );
  }

  private async transformPhotos(obj: any): Promise<void> {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return;
    }

    if (Array.isArray(obj)) {
      await Promise.all(obj.map((item) => this.transformPhotos(item)));
      return;
    }

    const promises: Promise<void>[] = [];

    for (const key of Object.keys(obj)) {
      if ((key === 'photo' || key === 'asset') && typeof obj[key] === 'string' && obj[key]) {
        promises.push(
          this.minioService.getPresignedUrl(obj[key]).then((url) => {
            obj[key] = url;
          }),
        );
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        promises.push(this.transformPhotos(obj[key]));
      }
    }

    await Promise.all(promises);
  }
}
