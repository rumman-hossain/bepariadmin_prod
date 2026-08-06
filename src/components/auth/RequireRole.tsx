import React from 'react';
import { useAuth } from '@/src/hooks/useAuth';
import { hasRole, type StaffRole } from '@/src/auth/roles';
import { EmptyState } from '@/src/components/feedback';
import { ShieldOff } from 'lucide-react';

export interface RequireRoleProps {
  roles: readonly StaffRole[];
  children: React.ReactNode;
  /** Rendered instead of the default notice when access is denied. */
  fallback?: React.ReactNode;
}

/**
 * Renders `children` only for the listed staff roles.
 *
 * Deliberately shows an explanation rather than redirecting. A silent bounce to
 * the dashboard reads as a broken link; telling someone their role doesn't
 * cover this screen tells them who to ask.
 *
 * This is presentation, not enforcement — see src/auth/roles.ts. The server
 * decides; this stops people being shown controls that will fail.
 */
export const RequireRole: React.FC<RequireRoleProps> = ({ roles, children, fallback }) => {
  const { user } = useAuth();

  if (hasRole(user?.role, roles)) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  return (
    <EmptyState
      icon={ShieldOff}
      variant="not-built"
      title="You don’t have access to this"
      message={
        user?.role
          ? `This section is limited to ${roles.join(', ')}. Your account is ${user.role}.`
          : 'This section is limited to specific staff roles.'
      }
    />
  );
};

