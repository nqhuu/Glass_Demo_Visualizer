import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/user-role.enum';

export const ROLES_KEY = 'roles';

// VI: Gan role yeu cau vao handler de RolesGuard kiem tra.
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
