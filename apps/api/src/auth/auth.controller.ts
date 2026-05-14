import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtPayload } from './auth.types';
import { UserRole } from '../users/user-role.enum';

// VI: Controller auth gom login, /auth/me va mot route admin protected de minh hoa guard.
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  // VI: TODO Sprint 11: them rate limiting cho login theo SECURITY.md.
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() currentUser: JwtPayload) {
    return this.authService.getCurrentUser(currentUser.sub);
  }

  @Get('admin-example')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  adminExample() {
    return {
      message: 'Admin JWT route is protected.',
    };
  }
}
