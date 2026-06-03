import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuditLogModule } from '../audit/audit-log.module';

// VI: Module xac thuc Sprint 1 gom login, JWT strategy va cac guard bao ve API.
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    AuditLogModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.getOrThrow<string>('JWT_SECRET');

        if (configService.get<string>('NODE_ENV') === 'production' && (secret.length < 32 || secret.includes('replace-with'))) {
          // VI: Production khong duoc dung JWT secret placeholder hoac qua ngan.
          throw new Error('Unsafe production JWT secret configuration.');
        }

        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
