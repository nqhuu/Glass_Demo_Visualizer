import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './auth-context';

// VI: Hook gom auth state de component tranh lap lai context boilerplate.
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
