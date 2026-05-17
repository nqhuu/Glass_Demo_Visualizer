import { createContext } from 'react';
import type { AuthStatus, AuthUser } from './auth.types';

// VI: Kieu context auth dung chung giua provider va hook, tach rieng de giu Fast Refresh sach.
export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
