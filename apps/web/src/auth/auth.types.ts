// VI: Kieu role va user cong khai khop response backend, khong co password hash.
export type UserRole = 'admin' | 'user';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';
