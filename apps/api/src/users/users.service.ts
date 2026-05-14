import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

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
        email,
        message: 'Failed to load user for authentication',
        error,
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
        userId,
        message: 'Failed to load authenticated user',
        error,
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
        email,
        message: 'Failed to query user by email',
        error,
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
        email: user.email,
        message: 'Failed to save user',
        error,
      });
      throw new InternalServerErrorException('Unable to save user.');
    }
  }

  create(input: Pick<User, 'name' | 'email' | 'passwordHash' | 'role' | 'isActive'>): User {
    return this.usersRepository.create(input);
  }
}
