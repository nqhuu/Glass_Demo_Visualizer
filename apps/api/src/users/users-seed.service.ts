import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from './user-role.enum';
import { UsersService } from './users.service';

// VI: Tao tai khoan admin local dau tien neu env seed duoc cung cap.
@Injectable()
export class UsersSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersSeedService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const name = this.configService.get<string>('SEED_ADMIN_NAME');
    const email = this.configService.get<string>('SEED_ADMIN_EMAIL');
    const password = this.configService.get<string>('SEED_ADMIN_PASSWORD');

    if (!name || !email || !password) {
      this.logger.warn({
        module: 'UsersSeedService',
        action: 'onApplicationBootstrap',
        message: 'Admin seed skipped because local seed env values are incomplete',
      });
      return;
    }

    try {
      const existingUser = await this.usersService.findByEmail(email);

      if (existingUser) {
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const adminUser = this.usersService.create({
        name,
        email,
        passwordHash,
        role: UserRole.Admin,
        isActive: true,
      });

      await this.usersService.save(adminUser);
      this.logger.log({
        module: 'UsersSeedService',
        action: 'onApplicationBootstrap',
        email,
        message: 'Local admin user seeded',
      });
    } catch (error) {
      this.logger.error({
        module: 'UsersSeedService',
        action: 'onApplicationBootstrap',
        email,
        message: 'Failed to seed local admin user',
        error,
      });
      throw error;
    }
  }
}
