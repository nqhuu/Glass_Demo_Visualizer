import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

function getSafeBootstrapError(error: unknown): { errorName: string; errorCode?: string } {
  // VI: Rut gon loi bootstrap de log khong lo stack trace, path noi bo hoac secret runtime.
  const errorName = error instanceof Error ? error.name : 'UnknownError';
  const maybeCode = error && typeof error === 'object' && 'code' in error ? (error as { code?: unknown }).code : undefined;
  const errorCode = typeof maybeCode === 'string' || typeof maybeCode === 'number' ? String(maybeCode) : undefined;

  return { errorName, errorCode };
}

// VI: Khoi dong API va cau hinh cac lop bao ve co ban cho Sprint 0.
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const configService = app.get(ConfigService);
    const apiPrefix = configService.get<string>('API_PREFIX', 'api');
    const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');
    const port = configService.get<number>('PORT', 3000);
    const uploadRoot = resolve(configService.get<string>('UPLOAD_ROOT') ?? './uploads');

    app.setGlobalPrefix(apiPrefix);
    // VI: Chi public URL /uploads duoc expose, API khong tra ve duong dan filesystem noi bo.
    app.useStaticAssets(uploadRoot, { prefix: '/uploads' });
    app.enableCors({
      origin: corsOrigin,
      credentials: true,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.listen(port);
    logger.log(`API listening on port ${port}`);
  } catch (error) {
    // VI: Ghi log khoi dong that bai voi ngu canh an toan, khong in secret hoac duong dan noi bo.
    const safeError = getSafeBootstrapError(error);
    logger.error({
      module: 'Bootstrap',
      action: 'startApi',
      message: 'Failed to start API application',
      errorName: safeError.errorName,
      errorCode: safeError.errorCode,
    });
    process.exit(1);
  }
}

void bootstrap();
