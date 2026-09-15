import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ExceptionInterceptor implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string;

    if (exception instanceof HttpException) {
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res; // e.g. `throw new NotFoundException('Not found')`
      } else if (typeof res === 'object' && (res as any).message) {
        // If message is array or string inside the response
        const msg = (res as any).message;
        message = Array.isArray(msg) ? msg[0] : msg;
      } else {
        message = JSON.stringify(res);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    } else {
      message = 'Internal server error';
    }

    response.status(status).json({
      success: false,
      message,
      data: null,
    });
  }
}
