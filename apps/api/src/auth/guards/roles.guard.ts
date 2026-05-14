import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { JwtPayload } from '../auth.types';
import { UserRole } from '../../users/user-role.enum';

// VI: Guard phan quyen role sau khi JwtAuthGuard da xac thuc request.
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      this.logger.warn({
        module: 'RolesGuard',
        action: 'canActivate',
        requiredRoles,
        role: user?.role,
        message: 'Role authorization rejected',
      });
      throw new ForbiddenException('You do not have permission to access this resource.');
    }

    return true;
  }
}
