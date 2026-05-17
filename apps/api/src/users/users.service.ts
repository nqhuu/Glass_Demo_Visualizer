import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

interface SafeErrorLog {
  errorName: string;
  errorCode?: string;
  errorMessage: string;
}

// VI: Service truy cap bang users, gom query an toan cho login va /auth/me.
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findAuthUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.usersRepository
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('LOWER(user.email) = LOWER(:email)', { email })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .getOne();
    } catch (error) {
      this.logger.error({
        module: 'UsersService',
        action: 'findAuthUserByEmail',
        message: 'Failed to load user for authentication',
        ...this.sanitizeErrorForLog(error),
      });
      throw new InternalServerErrorException('Unable to complete authentication request.');
    }
  }

  async findActiveById(userId: number): Promise<User | null> {
    try {
      return await this.usersRepository.findOne({
        where: {
          id: userId,
          isActive: true,
        },
      });
    } catch (error) {
      this.logger.error({
        module: 'UsersService',
        action: 'findActiveById',
        message: 'Failed to load authenticated user',
        ...this.sanitizeErrorForLog(error),
      });
      throw new InternalServerErrorException('Unable to load authenticated user.');
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.usersRepository.findOne({
        where: { email },
      });
    } catch (error) {
      this.logger.error({
        module: 'UsersService',
        action: 'findByEmail',
        message: 'Failed to query user by email',
        ...this.sanitizeErrorForLog(error),
      });
      throw new InternalServerErrorException('Unable to query local admin user.');
    }
  }

  async findResetUserByTokenHash(tokenHash: string): Promise<User | null> {
    try {
      // VI: Reset mat khau can lay hash reset token va passwordHash de cap nhat an toan.
      return await this.usersRepository
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .addSelect('user.passwordResetTokenHash')
        .where('user.passwordResetTokenHash = :tokenHash', { tokenHash })
        .andWhere('user.passwordResetExpiresAt > :now', { now: new Date() })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .getOne();
    } catch (error) {
      this.logger.error({
        module: 'UsersService',
        action: 'findResetUserByTokenHash',
        message: 'Failed to query user by reset token',
        ...this.sanitizeErrorForLog(error),
      });
      throw new InternalServerErrorException('Unable to complete password reset request.');
    }
  }

  async findSeedUserByEmail(email: string): Promise<User | null> {
    try {
      // VI: Chi seed local moi can lay password hash de kiem tra tai khoan admin dev.
      return await this.usersRepository
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('LOWER(user.email) = LOWER(:email)', { email })
        .getOne();
    } catch (error) {
      this.logger.error({
        module: 'UsersService',
        action: 'findSeedUserByEmail',
        message: 'Failed to query local seed user',
        ...this.sanitizeErrorForLog(error),
      });
      throw new InternalServerErrorException('Unable to query local admin user.');
    }
  }

  async save(user: User): Promise<User> {
    try {
      return await this.usersRepository.save(user);
    } catch (error) {
      this.logger.error({
        module: 'UsersService',
        action: 'save',
        message: 'Failed to save user',
        ...this.sanitizeErrorForLog(error),
      });
      throw new InternalServerErrorException('Unable to save user.');
    }
  }

  create(input: Pick<User, 'name' | 'email' | 'passwordHash' | 'role' | 'isActive'>): User {
    return this.usersRepository.create(input);
  }

  private sanitizeErrorForLog(error: unknown): SafeErrorLog {
    // VI: Chi log ten loi va ma DB an toan, khong log raw query/params/hash/token.
    const errorRecord = error instanceof Object ? (error as Record<string, unknown>) : {};
    const rawCode = errorRecord.code;

    return {
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorCode: typeof rawCode === 'string' || typeof rawCode === 'number' ? String(rawCode) : undefined,
      errorMessage: 'Database operation failed.',
    };
  }
}
