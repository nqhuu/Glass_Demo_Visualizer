import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { createTypeOrmOptions } from './config/typeorm.config';
import { GlassCatalogModule } from './glass-catalog/glass-catalog.module';
import { ProjectsModule } from './projects/projects.module';
import { AuditLogModule } from './audit/audit-log.module';
import { UsersModule } from './users/users.module';

function readPositiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// VI: Module goc ket noi config, database va cac module nen tang cua backend.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          // VI: Bo dem in-memory MVP bao ve route nhay cam; production nhieu instance can storage tap trung.
          ttl: readPositiveInteger(configService.get<string>('RATE_LIMIT_TTL_MS'), 60_000),
          limit: readPositiveInteger(configService.get<string>('RATE_LIMIT_MAX_REQUESTS'), 10),
        },
      ],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: createTypeOrmOptions,
    }),
    AuditLogModule,
    UsersModule,
    AuthModule,
    GlassCatalogModule,
    ProjectsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
