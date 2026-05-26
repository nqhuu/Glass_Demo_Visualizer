import { PublicUser } from '../users/user-public.types';
import { UserRole } from '../users/user-role.enum';

// VI: Payload JWT toi thieu de backend xac dinh nguoi dung va role.
export interface JwtPayload {
  sub: number;
  role: UserRole;
}

// VI: Response login cong khai, khong mang password hash.
export interface LoginResponse {
  accessToken: string;
  user: PublicUser;
}
