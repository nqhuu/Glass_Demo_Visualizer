import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// VI: Loc loi toan cuc de tra ve thong bao an toan, khong lo stack trace hay secret.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const safePath = request.path;

    const safeMessage =
      exception instanceof HttpException ? this.extractHttpMessage(exception) : 'Unexpected server error';

    this.logger.error({
      module: 'AllExceptionsFilter',
      action: 'catch',
      method: request.method,
      path: safePath,
      status,
      message: safeMessage,
    });

    response.status(status).json({
      statusCode: status,
      message: safeMessage,
      path: safePath,
      timestamp: new Date().toISOString(),
    });
  }

  private extractHttpMessage(exception: HttpException): string {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null && 'message' in response) {
      const message = (response as { message: string | string[] }).message;
      return Array.isArray(message) ? message.join(', ') : message;
    }

    return exception.message;
  }
}
