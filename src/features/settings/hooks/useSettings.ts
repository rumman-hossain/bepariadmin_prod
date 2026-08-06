import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getStaff,
  setStaffRole,
  setStaffStatus,
  getPlatformMargin,
  setPlatformMargin,
} from '../api/settingsApi';

const key = ['settings'] as const;

export const useStaff = () => useQuery({ queryKey: [...key, 'staff'], queryFn: getStaff });

export const usePlatformMargin = () =>
  useQuery({ queryKey: [...key, 'margin'], queryFn: getPlatformMargin });

/*
 * Every mutation invalidates the whole settings tree.
 *
 * Changing one account's role can change what the list means — demoting the
 * second-to-last super admin makes the remaining one unremovable, and the
 * screen has to stop offering that. Refetching only the row that changed would
 * leave the others offering actions the server will now refuse.
 */
export function useSetStaffRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => setStaffRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useSetStaffStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'inactive' }) =>
      setStaffStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useSetPlatformMargin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (marginPercent: number) => setPlatformMargin(marginPercent),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
