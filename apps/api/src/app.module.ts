import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { createTypeOrmOptions } from './config/typeorm.config';
import { GlassCatalogModule } from './glass-catalog/glass-catalog.module';
import { ProjectsModule } from './projects/projects.module';
import { UsersModule } from './users/users.module';

// VI: Module goc ket noi config, database va cac module nen tang cua backend.
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: createTypeOrmOptions,
    }),
    UsersModule,
    AuthModule,
    GlassCatalogModule,
    ProjectsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
