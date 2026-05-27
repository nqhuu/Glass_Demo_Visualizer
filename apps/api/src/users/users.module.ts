import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersSeedService } from './users-seed.service';
import { UsersService } from './users.service';

// VI: Module users cap repository cho auth va tai khoan demo local duoc seed an toan.
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, UsersSeedService],
  exports: [UsersService],
})
export class UsersModule {}
