import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../auth/context';

/** Convenience hook to access auth state and actions */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}