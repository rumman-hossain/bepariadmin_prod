import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getStaff, setStaffRole, setStaffStatus, updateStaff, setStaffPassword, deleteStaff } from '../api/settingsApi';

const key = ['settings'] as const;

export const useStaff = () => useQuery({ queryKey: [...key, 'staff'], queryFn: getStaff });


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


/*
 * Editing, resetting and removing a staff account.
 *
 * Each invalidates the whole settings tree, like the mutations above. Removal
 * especially: the row disappears from the list server-side, so a stale cache
 * would keep showing an account that no longer exists and whose owner has
 * already been signed out.
 */
export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; name: string; email: string; phone?: string }) =>
      updateStaff(v.id, { name: v.name, email: v.email, phone: v.phone }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useSetStaffPassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; passwordHash: string }) => setStaffPassword(v.id, v.passwordHash),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string }) => deleteStaff(v.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });
}
