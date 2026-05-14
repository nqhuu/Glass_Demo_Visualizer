import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { LoginResponse, JwtPayload } from './auth.types';
import { PublicUser, toPublicUser } from '../users/user-public.types';
import { UsersService } from '../users/users.service';

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
          email: loginDto.email,
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
        email: loginDto.email,
        message: 'Login flow failed unexpectedly',
        error,
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
        error,
      });
      throw error;
    }
  }
}
