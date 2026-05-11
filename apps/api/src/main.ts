import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// VI: Khoi dong API va cau hinh cac lop bao ve co ban cho Sprint 0.
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const apiPrefix = configService.get<string>('API_PREFIX', 'api');
    const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:5173');
    const port = configService.get<number>('PORT', 3000);

    app.setGlobalPrefix(apiPrefix);
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
    logger.error({
      module: 'Bootstrap',
      action: 'bootstrap',
      message: 'Failed to start API application',
      error,
    });
    process.exit(1);
  }
}

void bootstrap();
