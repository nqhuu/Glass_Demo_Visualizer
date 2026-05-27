import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from './user-role.enum';
import { UsersService } from './users.service';

interface LocalSeedAccount {
  label: 'admin' | 'demo user';
  name?: string;
  email?: string;
  password?: string;
  role: UserRole;
}

// VI: Tao tai khoan demo local idempotent trong development; khong seed tai khoan tren moi truong trien khai.
@Injectable()
export class UsersSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersSeedService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    if (nodeEnv !== 'development') {
      return;
    }

    try {
      const adminAccount: LocalSeedAccount = {
        label: 'admin',
        name: this.configService.get<string>('SEED_ADMIN_NAME'),
        email: this.configService.get<string>('SEED_ADMIN_EMAIL'),
        password: this.configService.get<string>('SEED_ADMIN_PASSWORD'),
        role: UserRole.Admin,
      };
      await this.seedLocalAccount(adminAccount);

      if (this.configService.get<string>('SEED_DEMO_DATA_ENABLED') !== 'true') {
        return;
      }

      const demoAccount: LocalSeedAccount = {
        label: 'demo user',
        name: this.configService.get<string>('SEED_DEMO_USER_NAME'),
        email: this.configService.get<string>('SEED_DEMO_USER_EMAIL'),
        password: this.configService.get<string>('SEED_DEMO_USER_PASSWORD'),
        role: UserRole.User,
      };

      if (adminAccount.email && demoAccount.email && adminAccount.email.toLowerCase() === demoAccount.email.toLowerCase()) {
        this.logger.warn({
          module: 'UsersSeedService',
          action: 'onApplicationBootstrap',
          message: 'Demo user seed skipped because account configuration conflicts with admin seed.',
        });
        return;
      }

      await this.seedLocalAccount(demoAccount);
    } catch (error) {
      this.logger.error({
        module: 'UsersSeedService',
        action: 'onApplicationBootstrap',
        message: 'Failed to seed local development accounts.',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorMessage: 'Local seed operation failed.',
      });
      throw error;
    }
  }

  private async seedLocalAccount(account: LocalSeedAccount): Promise<void> {
    if (!account.name || !account.email || !account.password) {
      this.logger.warn({
        module: 'UsersSeedService',
        action: 'seedLocalAccount',
        message: `Local ${account.label} seed skipped because environment values are incomplete.`,
      });
      return;
    }

    const existingUser = await this.usersService.findSeedUserByEmail(account.email);

    if (existingUser) {
      const passwordMatches = await bcrypt.compare(account.password, existingUser.passwordHash);
      const needsUpdate =
        existingUser.name !== account.name ||
        existingUser.role !== account.role ||
        !existingUser.isActive ||
        !passwordMatches;

      if (!needsUpdate) {
        this.logger.log({
          module: 'UsersSeedService',
          action: 'seedLocalAccount',
          message: `Local ${account.label} account already available.`,
        });
        return;
      }

      // VI: Chi trong local development, seed sua role/mat khau hash de khoi phuc tai khoan demo xac dinh.
      existingUser.name = account.name;
      existingUser.role = account.role;
      existingUser.isActive = true;
      if (!passwordMatches) {
        existingUser.passwordHash = await bcrypt.hash(account.password, 12);
      }

      await this.usersService.save(existingUser);
      this.logger.log({
        module: 'UsersSeedService',
        action: 'seedLocalAccount',
        message: `Local ${account.label} account repaired.`,
      });
      return;
    }

    const passwordHash = await bcrypt.hash(account.password, 12);
    await this.usersService.save(
      this.usersService.create({
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
        isActive: true,
      }),
    );
    this.logger.log({
      module: 'UsersSeedService',
      action: 'seedLocalAccount',
      message: `Local ${account.label} account seeded.`,
    });
  }
}
