import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { LoginDto } from './dto/login.dto';
import { LoginResponse, JwtPayload } from './auth.types';
import { PublicUser, toPublicUser } from '../users/user-public.types';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/user-role.enum';
import { User } from '../users/user.entity';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export interface ForgotPasswordResponse {
  message: string;
}

// VI: Service xac thuc email/password, phat JWT va tra ve thong tin user an toan.
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponse> {
    try {
      const user = await this.usersService.findAuthUserByEmail(loginDto.email);
      const passwordMatches = user ? await bcrypt.compare(loginDto.password, user.passwordHash) : false;

      if (!user || !passwordMatches) {
        this.logger.warn({
          module: 'AuthService',
          action: 'login',
          message: 'Rejected login attempt',
        });
        throw new UnauthorizedException('Invalid email or password.');
      }

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      return {
        accessToken: await this.jwtService.signAsync(payload),
        user: toPublicUser(user),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error({
        module: 'AuthService',
        action: 'login',
        message: 'Login flow failed unexpectedly',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  }

  async register(registerDto: RegisterDto): Promise<LoginResponse> {
    try {
      const existingUser = await this.usersService.findByEmail(registerDto.email);

      if (existingUser) {
        throw new ConflictException('Email is already registered.');
      }

      const passwordHash = await bcrypt.hash(registerDto.password, 12);
      const user = this.usersService.create({
        name: registerDto.name.trim(),
        email: registerDto.email.trim().toLowerCase(),
        passwordHash,
        role: UserRole.User,
        isActive: true,
      });
      const savedUser = await this.usersService.save(user);

      return this.createLoginResponse(savedUser);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      this.logger.error({
        module: 'AuthService',
        action: 'register',
        message: 'Registration flow failed unexpectedly',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<ForgotPasswordResponse> {
    const genericMessage = 'If this email exists, password reset instructions have been sent.';

    try {
      const user = await this.usersService.findByEmail(dto.email);

      if (!user) {
        return { message: genericMessage };
      }

      const token = randomBytes(32).toString('hex');
      user.passwordResetTokenHash = this.hashResetToken(token);
      user.passwordResetExpiresAt = new Date(Date.now() + 1000 * 60 * 30);
      await this.usersService.save(user);

      // VI: TODO Sprint 11: tich hop SMTP/email provider va rate limit; response khong bao gio tra token reset.

      return { message: genericMessage };
    } catch (error) {
      this.logger.error({
        module: 'AuthService',
        action: 'forgotPassword',
        message: 'Forgot password flow failed unexpectedly',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : undefined,
      });
      return { message: genericMessage };
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: true }> {
    try {
      const tokenHash = this.hashResetToken(dto.token);
      const user = await this.usersService.findResetUserByTokenHash(tokenHash);

      if (!user) {
        throw new BadRequestException('Password reset link is invalid or expired.');
      }

      user.passwordHash = await bcrypt.hash(dto.password, 12);
      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      await this.usersService.save(user);

      return { success: true };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error({
        module: 'AuthService',
        action: 'resetPassword',
        message: 'Reset password flow failed unexpectedly',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  }

  async getCurrentUser(userId: number): Promise<PublicUser> {
    try {
      const user = await this.usersService.findActiveById(userId);

      if (!user) {
        throw new UnauthorizedException('Authenticated user is not available.');
      }

      return toPublicUser(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error({
        module: 'AuthService',
        action: 'getCurrentUser',
        userId,
        message: 'Unable to load current authenticated user',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  }

  private async createLoginResponse(user: User): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: toPublicUser(user),
    };
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
