import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { QueryFailedError } from 'typeorm';

type PgError = Error & { code?: string; detail?: string; constraint?: string };

function extractMessage(exception: HttpException): string {
  const res = exception.getResponse();
  if (typeof res === 'string') return res;
  const obj = res as { message?: string | string[] };
  if (!obj?.message) return 'An error occurred';
  return Array.isArray(obj.message) ? obj.message.join(', ') : obj.message;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly nodeEnv: string) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;

    let status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string =
      isHttpException ? extractMessage(exception) : 'Internal Server Error';
    let error: string | null = null;

    if (exception instanceof QueryFailedError) {
      const driverError = (exception as unknown as { driverError?: PgError })
        .driverError;
      if (driverError?.code === '23505') {
        status = HttpStatus.CONFLICT;
        message = driverError.detail || 'Unique constraint violation';
      }
    }

    if (status === HttpStatus.NOT_FOUND && /^Cannot (GET|POST|PUT|PATCH|DELETE|OPTIONS) /.test(message)) {
      message = `Route not found: ${request.originalUrl || request.url}`;
    }

    if (!isHttpException && exception instanceof Error) {
      error = this.nodeEnv !== 'production' ? exception.message : null;
    }

    const payload = {
      success: false,
      message,
      data: null,
      error,
    };

    response.status(status).json(payload);
  }
}
