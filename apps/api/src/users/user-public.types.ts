import { UserRole } from './user-role.enum';
import { User } from './user.entity';

// VI: Kieu response cong khai, tuyet doi khong chua password hash.
export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

// VI: Chuyen entity thanh response an toan cho controller/service.
export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
