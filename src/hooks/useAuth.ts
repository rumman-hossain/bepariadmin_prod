import { useContext } from 'react';
import { AuthContext, AuthContextValue } from '../auth/AuthContext';

/** Convenience hook to access auth state and actions */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}